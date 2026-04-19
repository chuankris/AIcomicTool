import OpenAI from 'openai'
import type { ModelConfig } from '@/types'

const PRESET_CONFIGS: Record<string, { baseURL: string; model: string }> = {
  claude: { baseURL: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6' },
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' },
  gemini: { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-1.5-pro' },
}

export function createModelClient(config: ModelConfig): OpenAI {
  const preset = config.provider !== 'custom' ? PRESET_CONFIGS[config.provider] : null
  return new OpenAI({
    baseURL: config.baseURL || preset?.baseURL,
    apiKey: config.apiKey,
    defaultHeaders: config.provider === 'claude'
      ? { 'anthropic-version': '2023-06-01' }
      : undefined,
  })
}

export async function callModel(config: ModelConfig, systemPrompt: string, userMessage: string): Promise<string> {
  const client = createModelClient(config)
  const preset = config.provider !== 'custom' ? PRESET_CONFIGS[config.provider] : null
  const modelName = config.model || preset?.model || 'gpt-4o'

  const response = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
  })
  return response.choices[0].message.content ?? ''
}
