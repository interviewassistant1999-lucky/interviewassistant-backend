'use client'

import { useCallback, useRef, useState, useEffect } from 'react'

interface SpeechRecognitionResult {
  startListening: () => void
  stopListening: () => void
  isListening: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  isSupported: boolean
}

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResultItem
}

interface SpeechRecognitionResultItem {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onerror: ((event: Event & { error: string }) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export function useSpeechRecognition(
  onTranscript?: (text: string, isFinal: boolean) => void
): SpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Please use Chrome or Edge.')
      return
    }

    setError(null)

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('Speech recognition started')
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript

        if (result.isFinal) {
          finalTranscript += text
          console.log('Final transcript:', text)

          // Call callback with final transcript
          if (onTranscript) {
            onTranscript(text, true)
          }
        } else {
          interim += text
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + ' ' + finalTranscript)
      }
      setInterimTranscript(interim)

      // Call callback with interim transcript for real-time display
      if (interim && onTranscript) {
        onTranscript(interim, false)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)

      // Don't treat 'no-speech' as a fatal error - just restart
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing to listen...')
        return
      }

      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.')
      } else if (event.error === 'network') {
        setError('Network error. Please check your internet connection.')
      } else {
        setError(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      console.log('Speech recognition ended')

      // Auto-restart if we're still supposed to be listening
      if (isListening && recognitionRef.current) {
        console.log('Auto-restarting speech recognition...')
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start()
          } catch (e) {
            console.error('Failed to restart recognition:', e)
          }
        }, 100)
      } else {
        setIsListening(false)
      }
    }

    try {
      recognition.start()
    } catch (e) {
      console.error('Failed to start recognition:', e)
      setError('Failed to start speech recognition')
    }
  }, [onTranscript, isListening])

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }

    if (recognitionRef.current) {
      recognitionRef.current.onend = null // Prevent auto-restart
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    setIsListening(false)
    setInterimTranscript('')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  return {
    startListening,
    stopListening,
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
  }
}
