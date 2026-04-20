import { describe, it, expect, vi } from 'vitest'
import type { ModelConfig } from '@/types'

vi.mock('./model-client', () => ({ callModel: vi.fn() }))

import { callModel } from './model-client'
import { applyReviewFeedback } from './review-parser'

const mockConfig: ModelConfig = { provider: 'claude', baseURL: '', apiKey: 'sk-test', model: '' }

describe('applyReviewFeedback', () => {
  it('returns trimmed AI response as new prompt', async () => {
    vi.mocked(callModel).mockResolvedValue('  【黑色直发】男生，教室，悲伤情绪，日漫风格，正面中景，高清细腻  ')
    const result = await applyReviewFeedback({
      currentPrompt: '【黑色直发】男生，教室，愤怒情绪，日漫风格',
      feedback: '表情应该是悲伤，不是愤怒',
      modelConfig: mockConfig,
    })
    expect(result).toBe('【黑色直发】男生，教室，悲伤情绪，日漫风格，正面中景，高清细腻')
  })
})
