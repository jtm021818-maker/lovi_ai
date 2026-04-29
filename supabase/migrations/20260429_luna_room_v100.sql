-- v100: Luna Room Diorama (Tamagotchi 2.0)
-- Adds whisper cache, pet timestamp, and pinned memory metadata.

ALTER TABLE luna_life
  ADD COLUMN IF NOT EXISTS cached_whisper text,
  ADD COLUMN IF NOT EXISTS cached_whisper_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_petted_at timestamptz;

ALTER TABLE luna_memories
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS frame_style text DEFAULT 'wood';

CREATE INDEX IF NOT EXISTS idx_luna_memories_pinned
  ON luna_memories(user_id, is_pinned, created_at DESC);
