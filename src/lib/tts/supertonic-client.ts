/**
 * Supertonic v3 client — model fetch + Cache Storage persistence + inference.
 *
 * Total download: ~145MB (int8 quantized ONNX from sherpa-onnx mirror).
 * License: MIT (engine code) + OpenRAIL-M (model). Commercial OK.
 *
 * Usage:
 *   const client = await SupertonicClient.getInstance();
 *   await client.ensureReady((p) => console.log(p.percent));
 *   const blob = await client.synthesize('어... 왔어?', 'F3', 'ko');
 *   const audio = new Audio(URL.createObjectURL(blob));
 *   await audio.play();
 */

import type * as ortType from 'onnxruntime-web';
import {
  TextToSpeech,
  UnicodeProcessor,
  Style,
  loadVoiceStyleFromBlob,
  createOnnxSessionFromBuffer,
  writeWavFile,
  type SupertonicCfg,
} from './supertonic-engine';

// ============================================================
// Asset manifest — int8 models from sherpa-onnx mirror + voices from official v3
// ============================================================
const INT8_BASE = 'https://huggingface.co/csukuangfj2/sherpa-onnx-supertonic-3-tts-int8-2026-05-11/resolve/main';
const V3_BASE = 'https://huggingface.co/Supertone/supertonic-3/resolve/main';

interface AssetSpec {
  key: string;
  url: string;
  /** approximate byte size for progress estimation */
  size: number;
}

const MODEL_ASSETS: AssetSpec[] = [
  { key: 'duration_predictor', url: `${INT8_BASE}/duration_predictor.int8.onnx`, size: 3_700_000 },
  { key: 'text_encoder',       url: `${INT8_BASE}/text_encoder.int8.onnx`,       size: 36_500_000 },
  { key: 'vector_estimator',   url: `${INT8_BASE}/vector_estimator.int8.onnx`,   size: 78_500_000 },
  { key: 'vocoder',            url: `${INT8_BASE}/vocoder.int8.onnx`,            size: 26_000_000 },
];

const CONFIG_ASSETS: AssetSpec[] = [
  { key: 'tts_cfg',         url: `${V3_BASE}/onnx/tts.json`,                size: 9_000 },
  { key: 'unicode_indexer', url: `${V3_BASE}/onnx/unicode_indexer.json`,    size: 280_000 },
];

const VOICE_KEYS = ['F1', 'F2', 'F3', 'F4', 'F5'] as const;
export type VoiceId = (typeof VOICE_KEYS)[number];

const VOICE_ASSETS: AssetSpec[] = VOICE_KEYS.map((k) => ({
  key: `voice_${k}`,
  url: `${V3_BASE}/voice_styles/${k}.json`,
  size: 295_000,
}));

const ALL_ASSETS = [...MODEL_ASSETS, ...CONFIG_ASSETS, ...VOICE_ASSETS];
export const TOTAL_DOWNLOAD_BYTES = ALL_ASSETS.reduce((s, a) => s + a.size, 0);

const CACHE_NAME = 'supertonic-v3-int8-v1';

// ============================================================
// Progress reporting
// ============================================================
export interface DownloadProgress {
  /** key being processed (e.g. 'vector_estimator') */
  currentAsset: string;
  /** human-readable label */
  label: string;
  /** total bytes loaded across all assets */
  bytesLoaded: number;
  /** sum of approx sizes across all assets */
  bytesTotal: number;
  /** 0~100 */
  percent: number;
  /** assets done */
  assetsDone: number;
  /** assets total (15) */
  assetsTotal: number;
}

export type Status = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

// ============================================================
// Cache helpers
// ============================================================
async function getCache(): Promise<Cache | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

async function fetchAssetWithCache(
  asset: AssetSpec,
  onChunk: (loaded: number) => void,
): Promise<Blob> {
  const cache = await getCache();

  // Cache hit
  if (cache) {
    const cached = await cache.match(asset.url);
    if (cached) {
      const blob = await cached.blob();
      onChunk(asset.size); // report full size as loaded instantly
      return blob;
    }
  }

  // Cache miss — download with progress
  const response = await fetch(asset.url, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${asset.url}: ${response.status}`);
  }

  // Try streaming read for progress, fallback to direct blob if no body
  const reader = response.body?.getReader();
  if (!reader) {
    const blob = await response.blob();
    if (cache) await cache.put(asset.url, new Response(blob.slice()));
    onChunk(blob.size);
    return blob;
  }

  const chunks: BlobPart[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    // Copy into a fresh Uint8Array<ArrayBuffer> to satisfy strict BlobPart typing
    const copy = new Uint8Array(value.byteLength);
    copy.set(value);
    chunks.push(copy);
    onChunk(value.byteLength);
  }

  const blob = new Blob(chunks);
  if (cache) {
    try {
      await cache.put(asset.url, new Response(blob.slice()));
    } catch {
      /* storage quota or other — non-fatal, just no cache */
    }
  }
  return blob;
}

// ============================================================
// SupertonicClient — singleton
// ============================================================
export class SupertonicClient {
  private static instance: SupertonicClient | null = null;
  private status: Status = 'idle';
  private tts: TextToSpeech | null = null;
  private cachedStyles = new Map<VoiceId, Style>();
  private cachedStyleBlobs = new Map<VoiceId, Blob>();
  private backend: 'webgpu' | 'wasm' | null = null;
  private initPromise: Promise<void> | null = null;
  private lastError: Error | null = null;

  static getInstance(): SupertonicClient {
    if (!this.instance) this.instance = new SupertonicClient();
    return this.instance;
  }

  getStatus(): Status {
    return this.status;
  }

  getBackend(): 'webgpu' | 'wasm' | null {
    return this.backend;
  }

  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Download + load all assets. Idempotent — calling multiple times
   * returns the same in-flight or completed promise.
   */
  async ensureReady(onProgress?: (p: DownloadProgress) => void): Promise<void> {
    if (this.status === 'ready') return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._init(onProgress).catch((e) => {
      this.status = 'error';
      this.lastError = e as Error;
      this.initPromise = null;
      throw e;
    });
    return this.initPromise;
  }

  private async _init(onProgress?: (p: DownloadProgress) => void): Promise<void> {
    this.status = 'downloading';

    let bytesLoaded = 0;
    let assetsDone = 0;
    const bytesTotal = TOTAL_DOWNLOAD_BYTES;
    const assetsTotal = ALL_ASSETS.length;

    const labelOf = (key: string): string => {
      if (key.startsWith('voice_')) return `보이스 ${key.slice(6)}`;
      if (key === 'duration_predictor') return '발화 길이 모델';
      if (key === 'text_encoder') return '텍스트 인코더';
      if (key === 'vector_estimator') return '핵심 합성기';
      if (key === 'vocoder') return '보코더';
      if (key === 'tts_cfg') return '설정';
      if (key === 'unicode_indexer') return '한국어 토크나이저';
      return key;
    };

    const report = (currentAsset: string) => {
      if (!onProgress) return;
      onProgress({
        currentAsset,
        label: labelOf(currentAsset),
        bytesLoaded,
        bytesTotal,
        percent: Math.min(100, Math.round((bytesLoaded / bytesTotal) * 100)),
        assetsDone,
        assetsTotal,
      });
    };

    // 1) Download all assets in parallel (browser handles concurrency)
    const blobs: Record<string, Blob> = {};
    await Promise.all(
      ALL_ASSETS.map(async (asset) => {
        report(asset.key);
        const blob = await fetchAssetWithCache(asset, (delta) => {
          bytesLoaded += delta;
          report(asset.key);
        });
        blobs[asset.key] = blob;
        assetsDone += 1;
        report(asset.key);
      }),
    );

    this.status = 'loading';

    // 2) Parse config + indexer
    const cfgs = JSON.parse(await blobs.tts_cfg.text()) as SupertonicCfg;
    const indexer = JSON.parse(await blobs.unicode_indexer.text()) as number[];
    const processor = new UnicodeProcessor(indexer);

    // 3) Decide execution provider — WebGPU if available, else WASM
    let sessionOpts: ortType.InferenceSession.SessionOptions = {
      executionProviders: ['webgpu'],
      graphOptimizationLevel: 'all',
    };
    let backend: 'webgpu' | 'wasm' = 'webgpu';

    const tryCreate = async (
      buffer: ArrayBuffer,
      opts: ortType.InferenceSession.SessionOptions,
    ): Promise<ortType.InferenceSession> => createOnnxSessionFromBuffer(buffer, opts);

    // 4) Load ONNX sessions — try webgpu first on duration_predictor (smallest, fast feedback)
    let dpSession: ortType.InferenceSession;
    try {
      const dpBuffer = await blobs.duration_predictor.arrayBuffer();
      dpSession = await tryCreate(dpBuffer, sessionOpts);
    } catch {
      // WebGPU failed — fall back to WASM for everything
      sessionOpts = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
      backend = 'wasm';
      const dpBuffer = await blobs.duration_predictor.arrayBuffer();
      dpSession = await tryCreate(dpBuffer, sessionOpts);
    }
    this.backend = backend;

    // 5) Remaining sessions sequentially (avoid memory spike)
    const textEncBuf = await blobs.text_encoder.arrayBuffer();
    const textEncSession = await tryCreate(textEncBuf, sessionOpts);

    const vecBuf = await blobs.vector_estimator.arrayBuffer();
    const vecSession = await tryCreate(vecBuf, sessionOpts);

    const vocBuf = await blobs.vocoder.arrayBuffer();
    const vocSession = await tryCreate(vocBuf, sessionOpts);

    this.tts = new TextToSpeech(cfgs, processor, dpSession, textEncSession, vecSession, vocSession);

    // 6) Cache voice style blobs (lazy parse on first use to save startup time)
    for (const v of VOICE_KEYS) {
      this.cachedStyleBlobs.set(v, blobs[`voice_${v}`]);
    }

    this.status = 'ready';
  }

  /**
   * Synthesize text → audio WAV blob.
   */
  async synthesize(
    text: string,
    voiceId: VoiceId = 'F3',
    lang: string = 'ko',
    options?: {
      totalStep?: number;
      speed?: number;
      onDenoiseStep?: (step: number, total: number) => void;
    },
  ): Promise<Blob> {
    if (this.status !== 'ready' || !this.tts) {
      throw new Error(`Supertonic not ready (status=${this.status})`);
    }

    // Lazy-parse voice style on first use
    let style = this.cachedStyles.get(voiceId);
    if (!style) {
      const blob = this.cachedStyleBlobs.get(voiceId);
      if (!blob) throw new Error(`Voice ${voiceId} not loaded`);
      style = await loadVoiceStyleFromBlob(blob);
      this.cachedStyles.set(voiceId, style);
    }

    const totalStep = options?.totalStep ?? 8;
    const speed = options?.speed ?? 1.0;

    const { wav, duration } = await this.tts.call(
      text,
      lang,
      style,
      totalStep,
      speed,
      0.25, // silence between chunks
      options?.onDenoiseStep,
    );

    const wavLen = Math.floor(this.tts.sampleRate * duration[0]);
    const wavOut = wav.slice(0, wavLen);
    const wavBuffer = writeWavFile(wavOut, this.tts.sampleRate);

    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  /**
   * Delete cached model assets from Cache Storage (~145MB freed).
   */
  async clearCache(): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    try {
      await caches.delete(CACHE_NAME);
    } catch {
      /* ignore */
    }
    this.status = 'idle';
    this.tts = null;
    this.cachedStyles.clear();
    this.cachedStyleBlobs.clear();
    this.backend = null;
    this.initPromise = null;
  }

  /**
   * Quickly check if assets are already cached (no download needed).
   * Returns true if every URL is in Cache Storage.
   */
  static async isCached(): Promise<boolean> {
    if (typeof window === 'undefined' || !('caches' in window)) return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      for (const asset of ALL_ASSETS) {
        const hit = await cache.match(asset.url);
        if (!hit) return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const VOICE_LIST = VOICE_KEYS;
