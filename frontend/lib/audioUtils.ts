/**
 * Audio processing utilities.
 */

/**
 * Calculate RMS (Root Mean Square) level for audio samples.
 * Returns a value between 0 and 1.
 */
export function calculateAudioLevel(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  const rms = Math.sqrt(sum / samples.length)
  // Amplify for better visibility in UI (typical speech is quiet)
  return Math.min(1, rms * 3)
}

/**
 * Convert Float32 audio samples to PCM16 format.
 */
export function floatToPCM16(float32Array: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return pcm16
}

/**
 * Convert PCM16 audio samples to Float32 format.
 */
export function pcm16ToFloat(pcm16Array: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16Array.length)
  for (let i = 0; i < pcm16Array.length; i++) {
    float32[i] = pcm16Array[i] / (pcm16Array[i] < 0 ? 0x8000 : 0x7fff)
  }
  return float32
}
