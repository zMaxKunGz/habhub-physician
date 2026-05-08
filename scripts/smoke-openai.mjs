import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index), line.slice(index + 1)]
    }),
)

const apiKey = env.VITE_OPENAI_API_KEY

if (!apiKey) {
  throw new Error('Missing VITE_OPENAI_API_KEY in .env')
}

const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Return only valid JSON with keys ok and summary.',
      },
      {
        role: 'user',
        content: 'Return {"ok":true} and a short summary saying the dashboard summary API path is reachable.',
      },
    ],
  }),
})

if (!chatResponse.ok) {
  throw new Error(`Chat completion failed: ${chatResponse.status} ${await chatResponse.text()}`)
}

const chatData = await chatResponse.json()
JSON.parse(chatData.choices[0].message.content)
console.log('Chat completion smoke test: passed')

const wav = createSilentWav(3)
const formData = new FormData()
formData.append('file', new Blob([wav], { type: 'audio/wav' }), 'silence.wav')
formData.append('model', 'whisper-1')
formData.append('language', 'en')

const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
  body: formData,
})

if (!transcriptionResponse.ok) {
  throw new Error(`Whisper transcription failed: ${transcriptionResponse.status} ${await transcriptionResponse.text()}`)
}

await transcriptionResponse.json()
console.log('Whisper transcription smoke test: passed')

function createSilentWav(seconds) {
  const sampleRate = 16_000
  const channels = 1
  const bitsPerSample = 16
  const samples = sampleRate * seconds
  const dataSize = samples * channels * (bitsPerSample / 8)
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28)
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  return buffer
}
