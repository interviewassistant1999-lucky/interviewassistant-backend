'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSessionStore } from '@/stores/sessionStore'

interface AudioCaptureProps {
  onAudioData: (data: ArrayBuffer) => void
  isActive: boolean
}

/**
 * Component that orchestrates audio capture from mic and system audio,
 * merges them using an AudioWorklet, and streams PCM16 data.
 */
export function AudioCapture({ onAudioData, isActive }: AudioCaptureProps) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const systemStreamRef = useRef<MediaStream | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)

  const {
    setMicActive,
    setSystemActive,
    setAudioLevels,
  } = useSessionStore()

  const cleanup = useCallback(() => {
    // Stop all tracks
    micStreamRef.current?.getTracks().forEach((track) => track.stop())
    systemStreamRef.current?.getTracks().forEach((track) => track.stop())

    // Disconnect worklet
    workletNodeRef.current?.disconnect()

    // Close audio context
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close()
    }

    // Clear refs
    micStreamRef.current = null
    systemStreamRef.current = null
    workletNodeRef.current = null
    audioContextRef.current = null

    // Update state
    setMicActive(false)
    setSystemActive(false)
    setAudioLevels(0, 0)
  }, [setMicActive, setSystemActive, setAudioLevels])

  const startCapture = useCallback(async () => {
    try {
      // Request microphone permission
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      micStreamRef.current = micStream
      setMicActive(true)

      // Request screen share (for system audio)
      const systemStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })
      systemStreamRef.current = systemStream
      setSystemActive(true)

      // Create audio context with 24kHz sample rate for OpenAI
      const audioContext = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = audioContext

      // Load AudioWorklet processor
      await audioContext.audioWorklet.addModule('/audio-worklet-processor.js')

      // Create sources
      const micSource = audioContext.createMediaStreamSource(micStream)
      const systemSource = audioContext.createMediaStreamSource(systemStream)

      // Create merger node to combine both inputs
      const merger = audioContext.createChannelMerger(2)
      micSource.connect(merger, 0, 0)
      systemSource.connect(merger, 0, 1)

      // Create worklet node
      const workletNode = new AudioWorkletNode(
        audioContext,
        'audio-merger-processor'
      )
      workletNodeRef.current = workletNode

      // Handle audio data from worklet
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio') {
          onAudioData(event.data.data)
        } else if (event.data.type === 'levels') {
          setAudioLevels(event.data.mic, event.data.system)
        }
      }

      // Connect merger to worklet
      merger.connect(workletNode)

      // Handle track ended (user stops screen share)
      systemStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        cleanup()
      })
    } catch (error) {
      console.error('Audio capture error:', error)
      cleanup()
    }
  }, [onAudioData, setMicActive, setSystemActive, setAudioLevels, cleanup])

  useEffect(() => {
    if (isActive) {
      startCapture()
    } else {
      cleanup()
    }

    return cleanup
  }, [isActive, startCapture, cleanup])

  // This component doesn't render anything
  return null
}
