/**
 * AudioWorklet processor for merging mic and system audio
 * with Voice Activity Detection (VAD) and smart chunking.
 *
 * Features:
 * - VAD: Only sends audio when speech is detected (saves 70% bandwidth)
 * - 3-second chunking with 1-second overlap for word boundary handling
 * - Converts to PCM16 format at 16kHz for Whisper compatibility
 */

class AudioMergerProcessor extends AudioWorkletProcessor {
  constructor() {
    super()

    // Audio parameters
    this.inputSampleRate = 24000  // AudioContext sample rate
    this.outputSampleRate = 16000 // Whisper expects 16kHz
    this.resampleRatio = this.outputSampleRate / this.inputSampleRate

    // Chunking configuration (in samples at output rate)
    this.chunkDurationSec = 3       // Send 3-second chunks
    this.overlapDurationSec = 1     // 1-second overlap for word boundaries
    this.chunkSamples = this.outputSampleRate * this.chunkDurationSec  // 48000 samples
    this.overlapSamples = this.outputSampleRate * this.overlapDurationSec  // 16000 samples

    // Main audio buffer (holds up to chunk + overlap)
    this.buffer = new Float32Array(this.chunkSamples + this.overlapSamples)
    this.bufferIndex = 0

    // VAD configuration
    this.vadThreshold = 0.01        // RMS threshold for speech detection
    this.vadHangoverMs = 500        // Keep recording 500ms after speech ends
    this.vadHangoverSamples = Math.floor(this.outputSampleRate * this.vadHangoverMs / 1000)
    this.silenceSamples = 0         // Counter for silence duration
    this.isSpeaking = false
    this.speechStarted = false

    // Statistics for debugging
    this.frameCount = 0
    this.audioChunksSent = 0
    this.silenceSkipped = 0

    // Speaker detection - accumulate energy per chunk
    this.chunkMicEnergy = 0
    this.chunkSystemEnergy = 0

    // Speech timing for accurate turn detection (Option B1)
    // Use frame counting for accurate timing (each frame = 128 samples at inputSampleRate)
    this.speechEndFrame = null  // Frame number when speech ended
    this.lastSpeechFrame = 0  // Frame number of last speech detected
    this.msPerFrame = (128 / this.inputSampleRate) * 1000  // ~5.33ms per frame at 24kHz
  }

  /**
   * Calculate RMS level for audio data (for VAD and UI meters)
   */
  calculateLevel(samples) {
    if (!samples || samples.length === 0) return 0
    let sum = 0
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i]
    }
    return Math.sqrt(sum / samples.length)
  }

  /**
   * Simple linear resampling from input rate to output rate
   */
  resample(inputSamples) {
    const outputLength = Math.floor(inputSamples.length * this.resampleRatio)
    const output = new Float32Array(outputLength)

    for (let i = 0; i < outputLength; i++) {
      const srcIdx = i / this.resampleRatio
      const idx = Math.floor(srcIdx)
      const frac = srcIdx - idx

      const sample0 = inputSamples[idx] || 0
      const sample1 = inputSamples[idx + 1] || sample0

      output[i] = sample0 * (1 - frac) + sample1 * frac
    }

    return output
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

  /**
   * Send audio chunk to main thread
   */
  sendChunk(includeOverlap = false) {
    if (this.bufferIndex < this.outputSampleRate * 0.5) {
      // Don't send chunks shorter than 0.5 seconds
      return
    }

    // Copy buffer data for sending
    const dataToSend = new Float32Array(this.bufferIndex)
    dataToSend.set(this.buffer.subarray(0, this.bufferIndex))

    // Convert to PCM16
    const pcm16 = this.floatToPCM16(dataToSend)

    // Determine dominant speaker based on accumulated levels for this chunk
    // micEnergy vs systemEnergy accumulated during buffering
    const dominantSpeaker = this.chunkMicEnergy > this.chunkSystemEnergy ? 'user' : 'interviewer'

    // Calculate silence duration using frame counting (more accurate than sample counting)
    let silenceDurationMs = 0
    if (this.speechEndFrame !== null) {
      // Speech has ended - calculate how long ago
      const framesSinceSpeechEnd = this.frameCount - this.speechEndFrame
      silenceDurationMs = framesSinceSpeechEnd * this.msPerFrame
    } else if (!this.isSpeaking && this.lastSpeechFrame > 0) {
      // Never detected speech end properly, use lastSpeechFrame
      const framesSinceLastSpeech = this.frameCount - this.lastSpeechFrame
      silenceDurationMs = framesSinceLastSpeech * this.msPerFrame
    }

    // Send to main thread with speech timing for accurate turn detection
    this.port.postMessage(
      {
        type: 'audio',
        data: pcm16.buffer,
        duration: this.bufferIndex / this.outputSampleRate,
        speechDetected: this.speechStarted,
        speaker: dominantSpeaker,
        micEnergy: this.chunkMicEnergy,
        systemEnergy: this.chunkSystemEnergy,
        // Speech timing for Option B1 turn detection
        isSpeaking: this.isSpeaking,  // Whether speech is currently active
        silenceDurationMs: silenceDurationMs,  // How long silence has lasted (accurate)
      },
      [pcm16.buffer]
    )

    this.audioChunksSent++
    // Reset chunk energy counters
    this.chunkMicEnergy = 0
    this.chunkSystemEnergy = 0

    // Keep overlap for next chunk (last 1 second)
    if (includeOverlap && this.bufferIndex > this.overlapSamples) {
      const overlap = this.buffer.subarray(this.bufferIndex - this.overlapSamples, this.bufferIndex)
      this.buffer.set(overlap)
      this.bufferIndex = this.overlapSamples
    } else {
      this.buffer = new Float32Array(this.chunkSamples + this.overlapSamples)
      this.bufferIndex = 0
    }

    this.speechStarted = false
  }

  process(inputs, outputs, parameters) {
    // The ChannelMerger combines both sources into a single input with 2 channels:
    // - Channel 0: Microphone audio
    // - Channel 1: System audio (from screen share)
    const input = inputs[0]
    const micInput = input?.[0] || new Float32Array(128)
    const systemInput = input?.[1] || new Float32Array(128)

    // Calculate levels for UI meters
    const micLevel = this.calculateLevel(micInput)
    const systemLevel = this.calculateLevel(systemInput)

    // Accumulate energy for speaker detection per chunk
    this.chunkMicEnergy += micLevel * micLevel * micInput.length
    this.chunkSystemEnergy += systemLevel * systemLevel * systemInput.length

    // Send levels every 10th frame to reduce message frequency
    this.frameCount++
    if (this.frameCount % 10 === 0) {
      this.port.postMessage({
        type: 'levels',
        mic: micLevel,
        system: systemLevel,
      })

      // Send speech timing updates periodically (every ~50ms) for accurate turn detection
      // This is critical because audio chunks are NOT sent during silence
      let silenceDurationMs = 0
      if (this.speechEndFrame !== null) {
        const framesSinceSpeechEnd = this.frameCount - this.speechEndFrame
        silenceDurationMs = framesSinceSpeechEnd * this.msPerFrame
      } else if (!this.isSpeaking && this.lastSpeechFrame > 0) {
        const framesSinceLastSpeech = this.frameCount - this.lastSpeechFrame
        silenceDurationMs = framesSinceLastSpeech * this.msPerFrame
      }

      this.port.postMessage({
        type: 'speechTiming',
        isSpeaking: this.isSpeaking,
        silenceDurationMs: silenceDurationMs,
      })
    }

    // Mix both inputs
    const mixed = new Float32Array(micInput.length)
    for (let i = 0; i < micInput.length; i++) {
      mixed[i] = micInput[i] * 0.5 + systemInput[i] * 0.5
    }

    // Check for voice activity
    const mixedLevel = this.calculateLevel(mixed)
    const speechDetected = mixedLevel > this.vadThreshold

    if (speechDetected) {
      this.isSpeaking = true
      this.speechStarted = true
      this.silenceSamples = 0
      // Reset speech end tracking when speech resumes
      this.speechEndFrame = null
      this.lastSpeechFrame = this.frameCount
    } else if (this.isSpeaking) {
      // In hangover period - keep recording briefly after speech ends
      this.silenceSamples += mixed.length
      // vadHangoverSamples is at output rate, silenceSamples at input rate
      // Convert: hangover at input rate = vadHangoverSamples * (inputRate/outputRate)
      const hangoverSamplesAtInputRate = this.vadHangoverSamples * (this.inputSampleRate / this.outputSampleRate)
      if (this.silenceSamples > hangoverSamplesAtInputRate) {
        this.isSpeaking = false
        // Speech ended - record the frame number
        this.speechEndFrame = this.frameCount
        // Speech ended - send what we have
        if (this.bufferIndex > 0) {
          this.sendChunk(false)  // Don't overlap after speech ends
        }
      }
    }
    // Note: silence duration is calculated in sendChunk() using frame counting

    // Only buffer audio during speech (or hangover period)
    if (this.isSpeaking || speechDetected) {
      // Resample to 16kHz for Whisper
      const resampled = this.resample(mixed)

      // Add to buffer
      for (let i = 0; i < resampled.length; i++) {
        this.buffer[this.bufferIndex++] = resampled[i]

        // When chunk is full, send it with overlap
        if (this.bufferIndex >= this.chunkSamples) {
          this.sendChunk(true)  // Include overlap for word boundaries
        }
      }
    } else {
      this.silenceSkipped++
    }

    // Debug log every 5 seconds
    if (this.frameCount % (24000 / 128 * 5) === 0) {
      console.log(`[VAD] Chunks sent: ${this.audioChunksSent}, Silence skipped: ${this.silenceSkipped} frames`)
    }

    return true // Keep processor alive
  }
}

registerProcessor('audio-merger-processor', AudioMergerProcessor)
