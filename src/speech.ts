type Command = 'next' | 'found' | 'repeat' | 'unknown'
type RecognitionStatus = { listening?: boolean; heard?: string; error?: string }

interface RecognitionEventLike extends Event {
  results: ArrayLike<{ 0: { transcript: string } }>
}

interface RecognitionErrorLike extends Event {
  error: string
}

interface RecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: RecognitionEventLike) => void) | null
  onerror: ((event: RecognitionErrorLike) => void) | null
  onend: (() => void) | null
}

type RecognitionConstructor = new () => RecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
}

let speechContext: AudioContext | null = null
let activeSpeechSource: AudioBufferSourceNode | null = null
let activeSpeechRequest: AbortController | null = null
let speechGeneration = 0

function getSpeechContext(): AudioContext | null {
  if (speechContext) return speechContext
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  speechContext = new AudioContext()
  return speechContext
}

function unlockSpeechAudio(): void {
  const context = getSpeechContext()
  if (context?.state === 'suspended') void context.resume().catch(() => undefined)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockSpeechAudio, { capture: true, passive: true })
  window.addEventListener('keydown', unlockSpeechAudio, { capture: true })
}

export function speak(text: string, onError?: () => void): boolean {
  const spokenText = text.trim()
  if (
    !spokenText
    || typeof window === 'undefined'
    || typeof window.fetch !== 'function'
    || typeof navigator === 'undefined'
    || !navigator.onLine
  ) return false

  const context = getSpeechContext()
  if (!context) return false

  stopSpeaking()
  const generation = speechGeneration
  const controller = new AbortController()
  activeSpeechRequest = controller

  void (async () => {
    try {
      if (context.state === 'suspended') await context.resume()

      const response = await window.fetch('/api/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: spokenText }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('Voice request failed')

      const encodedAudio = await response.arrayBuffer()
      if (controller.signal.aborted || generation !== speechGeneration) return

      const audioBuffer = await context.decodeAudioData(encodedAudio.slice(0))
      if (controller.signal.aborted || generation !== speechGeneration) return

      const source = context.createBufferSource()
      source.buffer = audioBuffer
      source.connect(context.destination)
      source.onended = () => {
        if (activeSpeechSource !== source) return
        source.disconnect()
        activeSpeechSource = null
      }
      activeSpeechSource = source
      activeSpeechRequest = null
      source.start()
    } catch (error) {
      if (activeSpeechRequest === controller) activeSpeechRequest = null
      if (controller.signal.aborted || generation !== speechGeneration) return
      onError?.()
    }
  })()

  return true
}

export function stopSpeaking(): void {
  speechGeneration += 1
  activeSpeechRequest?.abort()
  activeSpeechRequest = null

  if (activeSpeechSource) {
    activeSpeechSource.onended = null
    try {
      activeSpeechSource.stop()
    } catch {
      // The source may already have ended.
    }
    activeSpeechSource.disconnect()
    activeSpeechSource = null
  }
}

export function parseCommand(transcript: string): Command {
  const value = transcript.toLocaleLowerCase().trim()
  if (/\b(found|got it|there it is|found it)\b/.test(value)) return 'found'
  if (/\b(next|nothing here|keep going|not here)\b/.test(value)) return 'next'
  if (/\b(repeat|say (?:that )?again|read it)\b/.test(value)) return 'repeat'
  return 'unknown'
}

export function createRecognition(onCommand: (command: Exclude<Command, 'unknown'>) => void, onStatus: (status: RecognitionStatus) => void): RecognitionLike | null {
  if (typeof window === 'undefined') return null
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
  if (!Recognition) return null
  const instance = new Recognition()
  instance.continuous = false
  instance.interimResults = false
  instance.lang = 'en-US'
  instance.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim() ?? ''
    onStatus({ heard: transcript })
    const command = parseCommand(transcript)
    if (command === 'unknown') {
      onStatus({ error: 'Try “next,” “found it,” or “repeat.”' })
      return
    }
    onCommand(command)
  }
  instance.onerror = (event) => {
    const message = event.error === 'not-allowed' ? 'Microphone permission was not granted.' : 'Voice command stopped. Tap to try again.'
    onStatus({ listening: false, error: message })
  }
  instance.onend = () => onStatus({ listening: false })
  return instance
}
