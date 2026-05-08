export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
export const OPENAI_MODEL = 'gpt-4o'

export function hasOpenAIKey() {
  return Boolean(OPENAI_API_KEY)
}
