const INPUT_SAMPLE_RATE = 16000
const OUTPUT_SAMPLE_RATE = 24000

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function floatToPcm16(samples: Float32Array): Uint8Array {
  const buffer = new ArrayBuffer(samples.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    const value = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
    view.setInt16(i * 2, value, true)
  }
  return new Uint8Array(buffer)
}

/** Captures microphone audio and emits 16 kHz 16-bit PCM chunks. */
export class MicRecorder {
  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private node: AudioWorkletNode | null = null
  private chunks: Uint8Array[] = []

  async start(processorUrl: string): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.context = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE })
    await this.context.audioWorklet.addModule(processorUrl)
    this.source = this.context.createMediaStreamSource(this.stream)
    this.node = new AudioWorkletNode(this.context, 'audio-processor')
    this.node.port.onmessage = (event: MessageEvent<Float32Array>) => {
      this.chunks.push(floatToPcm16(event.data))
    }
    this.source.connect(this.node)
    this.node.connect(this.context.destination)
  }

  /** Return the buffered PCM since the last call and clear it. */
  takeBuffer(): Uint8Array | null {
    if (this.chunks.length === 0) return null
    const total = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const combined = new Uint8Array(total)
    let offset = 0
    for (const chunk of this.chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }
    this.chunks = []
    return combined
  }

  async stop(): Promise<void> {
    this.source?.disconnect()
    this.node?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())
    await this.context?.close()
    this.context = null
    this.stream = null
    this.source = null
    this.node = null
    this.chunks = []
  }
}

/** Encodes a PCM chunk as a base64 live-audio blob payload. */
export function pcmBlobPayload(bytes: Uint8Array): {
  blob: { mime_type: string; data: string }
} {
  return {
    blob: {
      mime_type: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
      data: bytesToBase64(bytes),
    },
  }
}

/** Decodes a base64 PCM chunk into a playable AudioBuffer. */
export function pcmToAudioBuffer(
  context: AudioContext,
  base64: string,
): AudioBuffer {
  const bytes = base64ToBytes(base64)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const samples = new Float32Array(Math.floor(bytes.length / 2))
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = view.getInt16(i * 2, true) / 0x8000
  }
  const buffer = context.createBuffer(1, samples.length, context.sampleRate)
  buffer.copyToChannel(samples, 0)
  return buffer
}

/** Plays streaming 24 kHz PCM audio from the live model. */
export class AudioPlayer {
  private context: AudioContext | null = null
  private nextTime = 0
  private sources = new Set<AudioBufferSourceNode>()

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE })
    }
    if (this.context.state === 'suspended') {
      void this.context.resume()
    }
    return this.context
  }

  resume(): void {
    this.ensureContext()
  }

  play(base64: string): void {
    const context = this.ensureContext()
    const buffer = pcmToAudioBuffer(context, base64)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    const start = Math.max(this.nextTime, context.currentTime)
    source.start(start)
    this.nextTime = start + buffer.duration
    source.onended = () => this.sources.delete(source)
    this.sources.add(source)
  }

  /** Stop all scheduled audio, e.g. when the model is interrupted. */
  stop(): void {
    for (const source of this.sources) {
      source.onended = null
      source.stop()
    }
    this.sources.clear()
    if (this.context) {
      this.nextTime = this.context.currentTime
    }
  }

  async close(): Promise<void> {
    this.stop()
    await this.context?.close()
    this.context = null
    this.nextTime = 0
  }
}
