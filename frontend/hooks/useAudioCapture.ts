'use client'

import { useCallback, useRef, useState } from 'react'
import { useSessionStore } from '@/stores/sessionStore'

interface AudioCaptureResult {
  startCapture: () => Promise<boolean>
  stopCapture: () => void
  isCapturing: boolean
  error: string | null
}

export function useAudioCapture(
  onAudioData?: (data: ArrayBuffer) => void
): AudioCaptureResult {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const systemStreamRef = useRef<MediaStream | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)

  const { setMicActive, setSystemActive, setAudioLevels } = useSessionStore()

  const startCapture = useCallback(async (): Promise<boolean> => {
    setError(null)

    try {
      // Request microphone permission
      console.log('Requesting microphone access...')
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      micStreamRef.current = micStream
      const micTracks = micStream.getAudioTracks()
      console.log('Microphone tracks:', micTracks.length, micTracks[0]?.label)
      setMicActive(micTracks.length > 0)

      // Request screen share (for system audio)
      // IMPORTANT: User must check "Share tab audio" or "Share system audio" in the browser dialog
      const systemStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required but we ignore it
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      systemStreamRef.current = systemStream

      // Check if system audio was actually captured
      const audioTracks = systemStream.getAudioTracks()
      if (audioTracks.length === 0) {
        console.warn('No system audio track - user may not have selected "Share audio"')
        setSystemActive(false)
      } else {
        console.log('System audio track captured:', audioTracks[0].label)
        setSystemActive(true)
      }

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = audioContext

      // Load AudioWorklet processor
      await audioContext.audioWorklet.addModule('/audio-worklet-processor.js')

      // Create sources
      const micSource = audioContext.createMediaStreamSource(micStream)

      // Create merger node
      const merger = audioContext.createChannelMerger(2)
      micSource.connect(merger, 0, 0)

      // Only connect system audio if available
      const systemAudioTracks = systemStream.getAudioTracks()
      if (systemAudioTracks.length > 0) {
        const systemSource = audioContext.createMediaStreamSource(systemStream)
        systemSource.connect(merger, 0, 1)
        console.log('System audio connected to merger')
      } else {
        console.warn('No system audio available - only microphone will be captured')
        // Create a silent source for the second channel to avoid issues
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()
        gain.gain.value = 0 // Silent
        oscillator.connect(gain)
        gain.connect(merger, 0, 1)
        oscillator.start()
      }

      // Create worklet node
      const workletNode = new AudioWorkletNode(
        audioContext,
        'audio-merger-processor'
      )
      workletNodeRef.current = workletNode

      // Handle audio data from worklet
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio' && onAudioData) {
          onAudioData(event.data.data)
        } else if (event.data.type === 'levels') {
          setAudioLevels(event.data.mic, event.data.system)
          // Debug: Log levels occasionally
          if (Math.random() < 0.01) {
            console.log(`Audio levels - Mic: ${(event.data.mic * 100).toFixed(1)}%, System: ${(event.data.system * 100).toFixed(1)}%`)
          }
        }
      }

      console.log('Audio worklet connected and running')

      // Connect merger to worklet
      merger.connect(workletNode)

      // Handle track ended (user stops screen share)
      systemStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopCapture()
      })

      setIsCapturing(true)
      return true
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to capture audio'
      setError(message)
      console.error('Audio capture error:', err)

      // Clean up any partial setup
      stopCapture()
      return false
    }
  }, [onAudioData, setMicActive, setSystemActive, setAudioLevels])

  const stopCapture = useCallback(() => {
    // Stop all tracks
    micStreamRef.current?.getTracks().forEach((track) => track.stop())
    systemStreamRef.current?.getTracks().forEach((track) => track.stop())

    // Disconnect worklet
    workletNodeRef.current?.disconnect()

    // Close audio context
    audioContextRef.current?.close()

    // Clear refs
    micStreamRef.current = null
    systemStreamRef.current = null
    workletNodeRef.current = null
    audioContextRef.current = null

    // Update state
    setMicActive(false)
    setSystemActive(false)
    setAudioLevels(0, 0)
    setIsCapturing(false)
  }, [setMicActive, setSystemActive, setAudioLevels])

  return {
    startCapture,
    stopCapture,
    isCapturing,
    error,
  }
}
