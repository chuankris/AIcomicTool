import { describe, it, expect, vi } from 'vitest'
import { createModelClient } from './model-client'
import type { ModelConfig } from '@/types'

describe('createModelClient', () => {
  it('creates client with Claude preset baseURL', () => {
    const config: ModelConfig = { provider: 'claude', baseURL: '', apiKey: 'sk-test', model: '' }
    const client = createModelClient(config)
    expect((client as any).baseURL).toContain('anthropic.com')
  })

  it('uses custom baseURL when provider is custom', () => {
    const config: ModelConfig = {
      provider: 'custom', baseURL: 'http://localhost:11434/v1', apiKey: 'ollama', model: 'llama3',
    }
    const client = createModelClient(config)
    expect((client as any).baseURL).toContain('localhost:11434')
  })
})
