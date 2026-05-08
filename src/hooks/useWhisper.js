import { useRef, useState } from 'react'
import { OPENAI_API_KEY } from '../config/openai'

const REALTIME_URL = 'wss://api.openai.com/v1/realtime?intent=transcription'
const REALTIME_SAMPLE_RATE = 24000
const REALTIME_FINALIZE_WAIT_MS = 1800

export function useWhisper() {
  const realtimeSocketRef = useRef(null)
  const audioContextRef = useRef(null)
  const processorRef = useRef(null)
  const sourceRef = useRef(null)
  const streamRef = useRef(null)
  const languageRef = useRef({ whisper: 'en', recognition: 'en-US' })
  const liveCallbackRef = useRef(null)
  const completedTranscriptRef = useRef('')
  const deltaByItemRef = useRef(new Map())
  const realtimeConnectedRef = useRef(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [error, setError] = useState('')
  const supportsLiveTranscription =
    typeof window !== 'undefined' && 'WebSocket' in window && ('AudioContext' in window || 'webkitAudioContext' in window)

  function openRealtimeSession(language) {
    if (!OPENAI_API_KEY) {
      throw new Error('Missing VITE_OPENAI_API_KEY. Add it to .env and restart the dev server.')
    }

    if (!supportsLiveTranscription) {
      throw new Error('Realtime transcription is unavailable in this browser.')
    }

    const socket = new WebSocket(REALTIME_URL, [
      'realtime',
      `openai-insecure-api-key.${OPENAI_API_KEY}`,
    ])
    realtimeSocketRef.current = socket

    socket.onopen = () => {
      realtimeConnectedRef.current = true
      setIsRealtimeConnected(true)
      socket.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            type: 'transcription',
            audio: {
              input: {
                format: {
                  type: 'audio/pcm',
                  rate: REALTIME_SAMPLE_RATE,
                },
                transcription: {
                  model: 'gpt-realtime-whisper',
                  ...(language ? { language } : {}),
                },
                turn_detection: null,
              },
            },
          },
        }),
      )
    }

    socket.onmessage = (message) => {
      const event = JSON.parse(message.data)

      if (event.type === 'conversation.item.input_audio_transcription.delta') {
        const nextDelta = `${deltaByItemRef.current.get(event.item_id) || ''}${event.delta || ''}`
        deltaByItemRef.current.set(event.item_id, nextDelta)
        publishRealtimeTranscript()
      }

      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        deltaByItemRef.current.delete(event.item_id)
        completedTranscriptRef.current = joinTranscript(completedTranscriptRef.current, event.transcript)
        publishRealtimeTranscript()
      }

      if (event.type === 'error') {
        setError(event.error?.message || event.message || 'Realtime transcription failed.')
      }
    }

    socket.onerror = () => {
      setError('Realtime transcription connection failed.')
    }

    socket.onclose = () => {
      realtimeConnectedRef.current = false
      setIsRealtimeConnected(false)
    }

    return socket
  }

  function publishRealtimeTranscript() {
    const liveDelta = Array.from(deltaByItemRef.current.values()).join(' ')
    const text = normalizeClinicalTerms(joinTranscript(completedTranscriptRef.current, liveDelta))
    setLiveTranscript(text)
    liveCallbackRef.current?.(text)
  }

  function joinTranscript(first, second) {
    return [first, second].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  }

  function startPcmStreaming(stream) {
    if (!supportsLiveTranscription) return

    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
    const audioContext = new AudioContextConstructor()
    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)

    audioContextRef.current = audioContext
    sourceRef.current = source
    processorRef.current = processor

    processor.onaudioprocess = (event) => {
      const socket = realtimeSocketRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN || !realtimeConnectedRef.current) return

      const input = event.inputBuffer.getChannelData(0)
      const pcm16 = downsampleToPcm16(input, audioContext.sampleRate, REALTIME_SAMPLE_RATE)
      socket.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: pcm16ToBase64(pcm16),
        }),
      )

      const output = event.outputBuffer.getChannelData(0)
      output.fill(0)
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
  }

  async function stopPcmStreaming() {
    processorRef.current?.disconnect()
    sourceRef.current?.disconnect()
    processorRef.current = null
    sourceRef.current = null

    if (audioContextRef.current?.state !== 'closed') {
      await audioContextRef.current?.close()
    }

    audioContextRef.current = null
  }

  function closeRealtimeSession() {
    const socket = realtimeSocketRef.current
    realtimeSocketRef.current = null
    realtimeConnectedRef.current = false
    setIsRealtimeConnected(false)

    if (!socket) return

    try {
      socket.close()
    } catch {
      // The displayed transcript is already held locally from realtime events.
    }
  }

  async function startRecording(language = { whisper: 'en', recognition: 'en-US' }, onLiveTranscript) {
    if (streamRef.current) {
      return
    }

    setError('')
    setLiveTranscript('')
    setIsRealtimeConnected(false)
    languageRef.current = language
    liveCallbackRef.current = onLiveTranscript
    completedTranscriptRef.current = ''
    deltaByItemRef.current = new Map()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      openRealtimeSession(language.whisper)
      startPcmStreaming(stream)
      setIsRecording(true)
    } catch (recordError) {
      setError(recordError.message || 'Unable to access the microphone.')
      setIsRecording(false)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  async function stopRecording() {
    if (!streamRef.current) {
      return ''
    }

    setIsRecording(false)
    setIsTranscribing(true)

    try {
      await stopPcmStreaming()
      commitRealtimeBuffer()
      await wait(REALTIME_FINALIZE_WAIT_MS)
      publishRealtimeTranscript()
      return liveTranscriptFromRefs()
    } catch (transcribeError) {
      setError(transcribeError.message || 'Unable to finalize realtime transcription.')
      return liveTranscriptFromRefs()
    } finally {
      closeRealtimeSession()
      setIsTranscribing(false)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      liveCallbackRef.current = null
    }
  }

  function commitRealtimeBuffer() {
    const socket = realtimeSocketRef.current

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
    }
  }

  function liveTranscriptFromRefs() {
    return normalizeClinicalTerms(joinTranscript(completedTranscriptRef.current, Array.from(deltaByItemRef.current.values()).join(' ')))
  }

  return {
    isRecording,
    isTranscribing,
    liveTranscript,
    isRealtimeConnected,
    supportsLiveTranscription,
    error,
    startRecording,
    stopRecording,
    setError,
  }
}

function downsampleToPcm16(input, inputSampleRate, outputSampleRate) {
  if (inputSampleRate === outputSampleRate) {
    return floatToPcm16(input)
  }

  const ratio = inputSampleRate / outputSampleRate
  const outputLength = Math.floor(input.length / ratio)
  const output = new Int16Array(outputLength)

  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio)
    const end = Math.min(Math.floor((index + 1) * ratio), input.length)
    let sum = 0

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      sum += input[sampleIndex]
    }

    const average = sum / Math.max(1, end - start)
    output[index] = clampPcm16(average)
  }

  return output
}

function floatToPcm16(input) {
  const output = new Int16Array(input.length)

  for (let index = 0; index < input.length; index += 1) {
    output[index] = clampPcm16(input[index])
  }

  return output
}

function clampPcm16(sample) {
  const clamped = Math.max(-1, Math.min(1, sample))
  return Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff)
}

function pcm16ToBase64(pcm16) {
  const bytes = new Uint8Array(pcm16.buffer)
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function normalizeClinicalTerms(text) {
  return text
    .replace(/ฮีล\s*สไลด์|ฮิล\s*สไลด์|ฮิว\s*สไลด์/gi, 'Heel Slide')
    .replace(/ควอด\s*เซ็ต|ควอด\s*เซต|ค quad\s*set/gi, 'Quad Set')
    .replace(/ที\s*เค\s*เอ|ทีเคเอ/gi, 'TKA')
    .replace(/อาร์\s*โอ\s*เอ็ม|อาร์โอเอ็ม/gi, 'ROM')
    .replace(/เคนี\s*เฟล็กชัน|คี\s*นี\s*เฟล็กชัน|นี\s*เฟล็กชัน|เข่า\s*เฟล็กชัน/gi, 'knee flexion')
    .replace(/เพน\s*สกอร์|คะแนน\s*เพน/gi, 'pain score')
    .replace(/(\d+)\s*(?:รีพ|เรปส์|เรป)/gi, '$1 reps')
    .replace(/(\d+)\s*(?:เซ็ต|เซต)/gi, '$1 sets')
    .replace(/\s+/g, ' ')
    .trim()
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
