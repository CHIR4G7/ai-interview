'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LocalSegment } from './mergeTranscript'

/**
 * Live speech-to-text for the candidate using the browser's Web Speech API —
 * the same mechanism the text interview already uses in QuestionAns.tsx.
 *
 * This runs alongside the Agora microphone track rather than replacing it: the
 * agent still hears you over RTC, while recognition here renders your own words
 * on screen immediately, with no dependency on Agora's user-transcription
 * pipeline delivering.
 *
 * Caveats worth knowing: Chrome/Edge only (Firefox has no support), and Chrome
 * streams the audio to Google for recognition.
 */

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  )
}

export function useLocalSpeech(enabled: boolean) {
  const [supported, setSupported] = useState(true)
  const [segments, setSegments] = useState<LocalSegment[]>([])
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  // Read inside handlers that outlive a render, so restart logic sees the
  // current intent rather than the value captured when the handler was bound.
  const enabledRef = useRef(enabled)
  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setSupported(false)
      return
    }
    if (!enabled) return

    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) finalText += text + ' '
        else interimText += text
      }

      if (finalText.trim()) {
        setSegments((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${prev.length}`,
            text: finalText.trim(),
            at: Date.now(),
            final: true,
          },
        ])
      }
      setInterim(interimText.trim())
    }

    recognition.onerror = (event: any) => {
      // 'no-speech' and 'aborted' are routine during a long interview; only
      // surface the ones that actually mean recognition is unavailable.
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        setError('Microphone permission denied for speech recognition')
      } else if (event?.error === 'audio-capture') {
        setError('No microphone available for speech recognition')
      }
    }

    // Chrome stops recognition after a stretch of silence even with
    // `continuous = true`. Restart so an interview-length session keeps working.
    recognition.onend = () => {
      if (!enabledRef.current) return
      try {
        recognition.start()
      } catch {
        // start() throws if it is already running; harmless.
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (err) {
      console.error('SpeechRecognition start failed:', err)
    }

    return () => {
      // Clear onend first, otherwise the restart handler fights the teardown.
      recognition.onend = null
      recognition.onresult = null
      recognition.onerror = null
      try {
        recognition.abort()
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null
      setInterim('')
    }
  }, [enabled])

  const reset = useCallback(() => {
    setSegments([])
    setInterim('')
  }, [])

  return { supported, segments, interim, error, reset }
}
