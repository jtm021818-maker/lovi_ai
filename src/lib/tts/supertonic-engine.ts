/**
 * Supertonic v3 TTS Engine — TypeScript port of `helper.js` from
 * https://github.com/supertone-inc/supertonic (MIT License).
 *
 * Ported by love-ai for browser-based ONNX inference of Korean TTS.
 * Uses int8-quantized models from
 *   https://huggingface.co/csukuangfj2/sherpa-onnx-supertonic-3-tts-int8-2026-05-11
 * with voice styles + unicode indexer from
 *   https://huggingface.co/Supertone/supertonic-3
 *
 * Model license: OpenRAIL-M (commercial use OK).
 * Inference: ONNX Runtime Web (WebGPU preferred, WASM fallback).
 */

import type * as ortType from 'onnxruntime-web';

let ortModule: typeof ortType | null = null;

/** Lazy ESM import for onnxruntime-web (heavy dependency, only load when needed) */
async function getOrt(): Promise<typeof ortType> {
  if (!ortModule) {
    ortModule = await import('onnxruntime-web');
  }
  return ortModule;
}

// ============================================================
// Available languages (must match Supertonic v3 unicode_indexer.json)
// ============================================================
export const AVAILABLE_LANGS = [
  'en', 'ko', 'ja', 'ar', 'bg', 'cs', 'da', 'de', 'el', 'es', 'et', 'fi',
  'fr', 'hi', 'hr', 'hu', 'id', 'it', 'lt', 'lv', 'nl', 'pl', 'pt', 'ro',
  'ru', 'sk', 'sl', 'sv', 'tr', 'uk', 'vi', 'na',
] as const;

export type LangCode = (typeof AVAILABLE_LANGS)[number];

export function isValidLang(lang: string): lang is LangCode {
  return (AVAILABLE_LANGS as readonly string[]).includes(lang);
}

// ============================================================
// Unicode Text Processor — converts text → tokens via codepoint indexer
// ============================================================
export class UnicodeProcessor {
  private indexer: number[];

  constructor(indexer: number[]) {
    this.indexer = indexer;
  }

  call(textList: string[], langList: string[]): { textIds: number[][]; textMask: number[][][] } {
    const processedTexts = textList.map((text, i) => this.preprocessText(text, langList[i]));

    const textIdsLengths = processedTexts.map((t) => t.length);
    const maxLen = Math.max(...textIdsLengths);

    const textIds = processedTexts.map((text) => {
      const row = new Array(maxLen).fill(0);
      for (let j = 0; j < text.length; j++) {
        const codePoint = text.codePointAt(j) ?? 0;
        row[j] = codePoint < this.indexer.length ? this.indexer[codePoint] : -1;
      }
      return row;
    });

    const textMask = this.getTextMask(textIdsLengths);
    return { textIds, textMask };
  }

  private preprocessText(text: string, lang: string): string {
    text = text.normalize('NFKD');

    // Remove emojis (wide Unicode range)
    const emojiPattern =
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu;
    text = text.replace(emojiPattern, '');

    // Replace various dashes / quotes / symbols
    const replacements: Record<string, string> = {
      '–': '-', '‑': '-', '—': '-', '_': ' ',
      '“': '"', '”': '"', '‘': "'", '’': "'",
      '´': "'", '`': "'", '[': ' ', ']': ' ', '|': ' ', '/': ' ', '#': ' ',
      '→': ' ', '←': ' ',
    };
    for (const [k, v] of Object.entries(replacements)) text = text.replaceAll(k, v);

    text = text.replace(/[♥☆♡©\\]/g, '');

    const exprReplacements: Record<string, string> = {
      '@': ' at ',
      'e.g.,': 'for example, ',
      'i.e.,': 'that is, ',
    };
    for (const [k, v] of Object.entries(exprReplacements)) text = text.replaceAll(k, v);

    // Fix spacing around punctuation
    text = text.replace(/ ,/g, ',')
      .replace(/ \./g, '.')
      .replace(/ !/g, '!')
      .replace(/ \?/g, '?')
      .replace(/ ;/g, ';')
      .replace(/ :/g, ':')
      .replace(/ '/g, "'");

    while (text.includes('""')) text = text.replace('""', '"');
    while (text.includes("''")) text = text.replace("''", "'");
    while (text.includes('``')) text = text.replace('``', '`');

    text = text.replace(/\s+/g, ' ').trim();

    // Ensure terminating punctuation
    if (!/[.!?;:,'"')\]}…。」』】〉》›»]$/.test(text)) text += '.';

    if (!isValidLang(lang)) {
      throw new Error(`Invalid language: ${lang}. Available: ${AVAILABLE_LANGS.join(', ')}`);
    }

    return `<${lang}>${text}</${lang}>`;
  }

  private getTextMask(lengths: number[]): number[][][] {
    const maxLen = Math.max(...lengths);
    return lengths.map((len) => {
      const row = new Array(maxLen).fill(0.0);
      for (let j = 0; j < Math.min(len, maxLen); j++) row[j] = 1.0;
      return [row];
    });
  }
}

// ============================================================
// Voice style tensor pair (ttl + dp)
// ============================================================
export class Style {
  constructor(public ttl: ortType.Tensor, public dp: ortType.Tensor) {}
}

// ============================================================
// Supertonic config (parsed from tts.json)
// ============================================================
export interface SupertonicCfg {
  ae: { sample_rate: number; base_chunk_size: number; [k: string]: unknown };
  ttl: { chunk_compress_factor: number; latent_dim: number; [k: string]: unknown };
  [k: string]: unknown;
}

// ============================================================
// TextToSpeech main inference class
// ============================================================
export class TextToSpeech {
  readonly sampleRate: number;

  constructor(
    public cfgs: SupertonicCfg,
    public textProcessor: UnicodeProcessor,
    public dpOrt: ortType.InferenceSession,
    public textEncOrt: ortType.InferenceSession,
    public vectorEstOrt: ortType.InferenceSession,
    public vocoderOrt: ortType.InferenceSession,
  ) {
    this.sampleRate = cfgs.ae.sample_rate;
  }

  private async _infer(
    textList: string[],
    langList: string[],
    style: Style,
    totalStep: number,
    speed = 1.05,
    progressCallback?: (step: number, total: number) => void,
  ): Promise<{ wav: number[]; duration: number[] }> {
    const ort = await getOrt();
    const bsz = textList.length;

    const { textIds, textMask } = this.textProcessor.call(textList, langList);

    const textIdsFlat = new BigInt64Array(textIds.flat().map((x) => BigInt(x)));
    const textIdsShape = [bsz, textIds[0].length];
    const textIdsTensor = new ort.Tensor('int64', textIdsFlat, textIdsShape);

    const textMaskFlat = new Float32Array(textMask.flat(2) as number[]);
    const textMaskShape = [bsz, 1, textMask[0][0].length];
    const textMaskTensor = new ort.Tensor('float32', textMaskFlat, textMaskShape);

    // Duration prediction
    const dpOutputs = await this.dpOrt.run({
      text_ids: textIdsTensor,
      style_dp: style.dp,
      text_mask: textMaskTensor,
    });
    const duration = Array.from(dpOutputs.duration.data as Float32Array);
    for (let i = 0; i < duration.length; i++) duration[i] /= speed;

    // Text encoding
    const textEncOutputs = await this.textEncOrt.run({
      text_ids: textIdsTensor,
      style_ttl: style.ttl,
      text_mask: textMaskTensor,
    });
    const textEmb = textEncOutputs.text_emb;

    // Sample noisy latent
    let { xt, latentMask } = this.sampleNoisyLatent(
      duration,
      this.sampleRate,
      this.cfgs.ae.base_chunk_size,
      this.cfgs.ttl.chunk_compress_factor,
      this.cfgs.ttl.latent_dim,
    );

    const latentMaskFlat = new Float32Array(latentMask.flat(2) as number[]);
    const latentMaskShape = [bsz, 1, latentMask[0][0].length];
    const latentMaskTensor = new ort.Tensor('float32', latentMaskFlat, latentMaskShape);

    const totalStepArray = new Float32Array(bsz).fill(totalStep);
    const totalStepTensor = new ort.Tensor('float32', totalStepArray, [bsz]);

    // Denoising loop
    for (let step = 0; step < totalStep; step++) {
      progressCallback?.(step + 1, totalStep);

      const currentStepArray = new Float32Array(bsz).fill(step);
      const currentStepTensor = new ort.Tensor('float32', currentStepArray, [bsz]);

      const xtFlat = new Float32Array(xt.flat(2) as number[]);
      const xtShape = [bsz, xt[0].length, xt[0][0].length];
      const xtTensor = new ort.Tensor('float32', xtFlat, xtShape);

      const vectorEstOutputs = await this.vectorEstOrt.run({
        noisy_latent: xtTensor,
        text_emb: textEmb,
        style_ttl: style.ttl,
        latent_mask: latentMaskTensor,
        text_mask: textMaskTensor,
        current_step: currentStepTensor,
        total_step: totalStepTensor,
      });

      const denoised = Array.from(vectorEstOutputs.denoised_latent.data as Float32Array);

      const latentDim = xt[0].length;
      const latentLen = xt[0][0].length;
      const newXt: number[][][] = [];
      let idx = 0;
      for (let b = 0; b < bsz; b++) {
        const batch: number[][] = [];
        for (let d = 0; d < latentDim; d++) {
          const row: number[] = [];
          for (let t = 0; t < latentLen; t++) row.push(denoised[idx++]);
          batch.push(row);
        }
        newXt.push(batch);
      }
      xt = newXt;
    }

    // Vocoder → waveform
    const finalXtFlat = new Float32Array(xt.flat(2) as number[]);
    const finalXtShape = [bsz, xt[0].length, xt[0][0].length];
    const finalXtTensor = new ort.Tensor('float32', finalXtFlat, finalXtShape);

    const vocoderOutputs = await this.vocoderOrt.run({ latent: finalXtTensor });
    const wav = Array.from(vocoderOutputs.wav_tts.data as Float32Array);

    return { wav, duration };
  }

  async call(
    text: string,
    lang: string,
    style: Style,
    totalStep: number,
    speed = 1.05,
    silenceDuration = 0.3,
    progressCallback?: (step: number, total: number) => void,
  ): Promise<{ wav: number[]; duration: number[] }> {
    if (style.ttl.dims[0] !== 1) {
      throw new Error('Single speaker text to speech only supports single style');
    }
    const maxLen = lang === 'ko' || lang === 'ja' ? 120 : 300;
    const textList = chunkText(text, maxLen);
    const langList = new Array(textList.length).fill(lang);

    let wavCat: number[] = [];
    let durCat = 0;

    for (let i = 0; i < textList.length; i++) {
      const { wav, duration } = await this._infer(
        [textList[i]],
        [langList[i]],
        style,
        totalStep,
        speed,
        progressCallback,
      );

      if (wavCat.length === 0) {
        wavCat = wav;
        durCat = duration[0];
      } else {
        const silenceLen = Math.floor(silenceDuration * this.sampleRate);
        const silence = new Array(silenceLen).fill(0);
        wavCat = [...wavCat, ...silence, ...wav];
        durCat += duration[0] + silenceDuration;
      }
    }

    return { wav: wavCat, duration: [durCat] };
  }

  private sampleNoisyLatent(
    duration: number[],
    sampleRate: number,
    baseChunkSize: number,
    chunkCompress: number,
    latentDim: number,
  ): { xt: number[][][]; latentMask: number[][][] } {
    const bsz = duration.length;
    const maxDur = Math.max(...duration);

    const wavLenMax = Math.floor(maxDur * sampleRate);
    const wavLengths = duration.map((d) => Math.floor(d * sampleRate));

    const chunkSize = baseChunkSize * chunkCompress;
    const latentLen = Math.floor((wavLenMax + chunkSize - 1) / chunkSize);
    const latentDimVal = latentDim * chunkCompress;

    const xt: number[][][] = [];
    for (let b = 0; b < bsz; b++) {
      const batch: number[][] = [];
      for (let d = 0; d < latentDimVal; d++) {
        const row: number[] = [];
        for (let t = 0; t < latentLen; t++) {
          // Box-Muller transform → standard normal
          const u1 = Math.max(0.0001, Math.random());
          const u2 = Math.random();
          row.push(Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2));
        }
        batch.push(row);
      }
      xt.push(batch);
    }

    const latentLengths = wavLengths.map((len) => Math.floor((len + chunkSize - 1) / chunkSize));
    const latentMask = this.lengthToMask(latentLengths, latentLen);

    for (let b = 0; b < bsz; b++) {
      for (let d = 0; d < latentDimVal; d++) {
        for (let t = 0; t < latentLen; t++) {
          xt[b][d][t] *= latentMask[b][0][t];
        }
      }
    }

    return { xt, latentMask };
  }

  private lengthToMask(lengths: number[], maxLen: number | null = null): number[][][] {
    const actualMaxLen = maxLen ?? Math.max(...lengths);
    return lengths.map((len) => {
      const row = new Array(actualMaxLen).fill(0.0);
      for (let j = 0; j < Math.min(len, actualMaxLen); j++) row[j] = 1.0;
      return [row];
    });
  }
}

// ============================================================
// Chunk long text by sentence boundary
// ============================================================
export function chunkText(text: string, maxLen = 300): string[] {
  if (typeof text !== 'string') throw new Error(`chunkText expects string, got ${typeof text}`);

  const paragraphs = text.trim().split(/\n\s*\n+/).filter((p) => p.trim());
  const chunks: string[] = [];

  for (let paragraph of paragraphs) {
    paragraph = paragraph.trim();
    if (!paragraph) continue;

    const sentences = paragraph.split(
      /(?<!Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sr\.|Jr\.|Ph\.D\.|etc\.|e\.g\.|i\.e\.|vs\.|Inc\.|Ltd\.|Co\.|Corp\.|St\.|Ave\.|Blvd\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+/,
    );

    let currentChunk = '';
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length + 1 <= maxLen) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
  }

  if (chunks.length === 0) chunks.push(text.trim());
  return chunks;
}

// ============================================================
// Voice style loader — fetch JSON → Float32 tensor pair
// ============================================================
interface VoiceStyleJson {
  style_ttl: { dims: number[]; data: number[] | number[][] | number[][][] };
  style_dp: { dims: number[]; data: number[] | number[][] | number[][][] };
}

export async function loadVoiceStyleFromBlob(blob: Blob): Promise<Style> {
  const ort = await getOrt();
  const json = JSON.parse(await blob.text()) as VoiceStyleJson;

  const ttlDims = json.style_ttl.dims;
  const dpDims = json.style_dp.dims;

  const ttlData = (json.style_ttl.data as unknown as number[]).flat ? json.style_ttl.data : json.style_ttl.data;
  const dpData = json.style_dp.data;

  const flat = (arr: unknown): number[] => {
    if (!Array.isArray(arr)) return [arr as number];
    return (arr as unknown[]).flatMap((x) => flat(x));
  };

  const ttlFlat = new Float32Array(flat(ttlData));
  const dpFlat = new Float32Array(flat(dpData));

  // bsz=1 always
  const ttlShape = [1, ttlDims[1], ttlDims[2]];
  const dpShape = [1, dpDims[1], dpDims[2]];

  return new Style(
    new ort.Tensor('float32', ttlFlat, ttlShape),
    new ort.Tensor('float32', dpFlat, dpShape),
  );
}

// ============================================================
// ONNX session loader (from in-memory ArrayBuffer)
// ============================================================
export async function createOnnxSessionFromBuffer(
  buffer: ArrayBuffer,
  sessionOptions: ortType.InferenceSession.SessionOptions = {},
): Promise<ortType.InferenceSession> {
  const ort = await getOrt();
  return ort.InferenceSession.create(buffer, sessionOptions);
}

// ============================================================
// WAV file writer (Float32 → 16-bit PCM WAV ArrayBuffer)
// ============================================================
export function writeWavFile(audioData: number[], sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = audioData.length * 2;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const int16Data = new Int16Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    const clamped = Math.max(-1.0, Math.min(1.0, audioData[i]));
    int16Data[i] = Math.floor(clamped * 32767);
  }
  new Uint8Array(buffer, 44).set(new Uint8Array(int16Data.buffer));

  return buffer;
}
