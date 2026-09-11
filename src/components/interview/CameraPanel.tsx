'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Video, VideoOff, RefreshCw } from 'lucide-react'

/**
 * Local self-view for the voice interview.
 *
 * This is a plain getUserMedia preview — the stream is NOT published to the
 * Agora channel. The agent is audio-only, so publishing video would add cost
 * and bandwidth with nothing on the other end to watch it. The point here is
 * the same as the text interview: seeing yourself makes people sit up, look at
 * the camera, and treat it like a real interview.
 */
const CameraPanel = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false, // the mic is owned by the Agora track
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setError(null)
      } catch (err) {
        console.error('Camera access error:', err)
        if (!cancelled) setError('Camera unavailable')
      }
    }

    const stopCamera = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }

    if (cameraOn) startCamera()
    else stopCamera()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [cameraOn, retryKey])

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900">
        {cameraOn && !error ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            // Mirrored so it reads like a mirror rather than a recording.
            className="h-full w-full -scale-x-100 object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-neutral-400">
            <VideoOff size={22} />
            <span className="text-xs">{error ?? 'Camera off'}</span>
          </div>
        )}

        {cameraOn && !error && (
          <span className="absolute left-2 top-2 flex flex-row items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            You
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (error) {
            // Retry: most failures here are a dismissed permission prompt or a
            // camera held by another app, both of which can succeed on a retry.
            setError(null)
            setRetryKey((k) => k + 1)
            setCameraOn(true)
            return
          }
          setCameraOn((prev) => !prev)
        }}
        className="flex w-full flex-row items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
      >
        {error ? (
          <>
            <RefreshCw size={14} />
            Retry camera
          </>
        ) : cameraOn ? (
          <>
            <VideoOff size={14} />
            Turn camera off
          </>
        ) : (
          <>
            <Video size={14} />
            Turn camera on
          </>
        )}
      </button>
    </div>
  )
}

export default CameraPanel
