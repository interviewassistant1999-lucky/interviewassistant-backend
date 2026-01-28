/**
 * AudioWorklet processor for merging mic and system audio
 * and converting to PCM16 format.
 */

class AudioMergerProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.bufferSize = 4096
    this.buffer = new Float32Array(this.bufferSize)
    this.bufferIndex = 0
    this.frameCount = 0
  }

  /**
   * Calculate RMS level for audio data
   */
  calculateLevel(samples) {
    let sum = 0
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i]
    }
    const rms = Math.sqrt(sum / samples.length)
    return Math.min(1, rms * 3) // Amplify for visibility
  }

  /**
   * Convert Float32 audio to PCM16
   */
  floatToPCM16(float32Array) {
    const pcm16 = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return pcm16
  }

  process(inputs, outputs, parameters) {
    // The ChannelMerger combines both sources into a single input with 2 channels:
    // - Channel 0: Microphone audio
    // - Channel 1: System audio (from screen share)
    const input = inputs[0]
    const micInput = input?.[0] || new Float32Array(128)      // Channel 0 = mic
    const systemInput = input?.[1] || new Float32Array(128)   // Channel 1 = system

    // Calculate levels for UI meters
    const micLevel = this.calculateLevel(micInput)
    const systemLevel = this.calculateLevel(systemInput)

    // Send levels every 10th frame to reduce message frequency
    this.frameCount++
    if (this.frameCount % 10 === 0) {
      this.port.postMessage({
        type: 'levels',
        mic: micLevel,
        system: systemLevel,
      })
    }

    // Mix both inputs
    for (let i = 0; i < micInput.length; i++) {
      const mixed = (micInput[i] * 0.5 + systemInput[i] * 0.5)
      this.buffer[this.bufferIndex++] = mixed

      // When buffer is full, send it
      if (this.bufferIndex >= this.bufferSize) {
        const pcm16 = this.floatToPCM16(this.buffer)
        this.port.postMessage(
          { type: 'audio', data: pcm16.buffer },
          [pcm16.buffer]
        )
        this.buffer = new Float32Array(this.bufferSize)
        this.bufferIndex = 0
      }
    }

    return true // Keep processor alive
  }
}

registerProcessor('audio-merger-processor', AudioMergerProcessor)
