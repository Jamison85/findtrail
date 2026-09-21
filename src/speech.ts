type Command = 'next' | 'found' | 'repeat' | 'unknown'
type RecognitionStatus = { listening?: boolean; heard?: string; error?: string }

export type SpeechStatus =
  | { state: 'preparing'; progress?: number }
  | { state: 'speaking' }
  | { state: 'idle' }
  | { state: 'error'; message: string }

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

interface PiperProgress {
  loaded: number
  total: number
}

interface PiperModule {
  predict(
    config: { text: string; voiceId: string },
    callback?: (progress: PiperProgress) => void,
  ): Promise<Blob>
}

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
}

const PIPER_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm'
const PIPER_VOICE = 'en_US-hfc_female-medium'

let piperModule: Promise<PiperModule> | null = null
let speechContext: AudioContext | null = null
let activeSpeechSource: AudioBufferSourceNode | null = null
let speechGeneration = 0

function getSpeechContext(): AudioContext | null {
  if (speechContext) return speechContext
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null
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

function loadPiper(): Promise<PiperModule> {
  piperModule ??= import(/* @vite-ignore */ PIPER_MODULE_URL) as Promise<PiperModule>
  return piperModule
}

export function speak(text: string, onStatus?: (status: SpeechStatus) => void): boolean {
  const spokenText = text.trim()
  if (
    !spokenText
    || typeof window === 'undefined'
    || typeof window.fetch !== 'function'
    || typeof WebAssembly === 'undefined'
  ) return false

  const context = getSpeechContext()
  if (!context) return false

  stopSpeaking()
  const generation = speechGeneration
  onStatus?.({ state: 'preparing' })

  void (async () => {
    try {
      if (context.state === 'suspended') await context.resume()
      const piper = await loadPiper()
      if (generation !== speechGeneration) return

      const wav = await piper.predict(
        { text: spokenText, voiceId: PIPER_VOICE },
        ({ loaded, total }) => {
          if (generation !== speechGeneration) return
          const progress = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : undefined
          onStatus?.({ state: 'preparing', progress })
        },
      )
      if (generation !== speechGeneration) return

      const encodedAudio = await wav.arrayBuffer()
      const audioBuffer = await context.decodeAudioData(encodedAudio.slice(0))
      if (generation !== speechGeneration) return

      const source = context.createBufferSource()
      source.buffer = audioBuffer
      source.connect(context.destination)
      source.onended = () => {
        if (activeSpeechSource !== source) return
        source.disconnect()
        activeSpeechSource = null
        onStatus?.({ state: 'idle' })
      }
      activeSpeechSource = source
      onStatus?.({ state: 'speaking' })
      source.start()
    } catch {
      if (generation !== speechGeneration) return
      onStatus?.({
        state: 'error',
        message: 'The local voice could not load. Check your connection and try Read aloud again.',
      })
    }
  })()

  return true
}

export function stopSpeaking(): void {
  speechGeneration += 1

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
