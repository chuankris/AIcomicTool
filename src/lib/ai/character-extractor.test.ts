// src/lib/ai/character-extractor.test.ts
import { describe, it, expect, vi } from 'vitest'
import type { ModelConfig } from '@/types'

vi.mock('./model-client', () => ({ callModel: vi.fn() }))
import { callModel } from './model-client'
import { extractCharacterAttributes } from './character-extractor'

const mockConfig: ModelConfig = { provider: 'claude', baseURL: '', apiKey: 'sk-test', model: '' }

describe('extractCharacterAttributes', () => {
  it('parses valid JSON from AI', async () => {
    vi.mocked(callModel).mockResolvedValue('{"age":"17岁","gender":"男生","hairColor":"黑色","hairStyle":"直发","outfit":"校服","personality":"内向","expressionTendency":"严肃","relationships":["误会对象"],"storyRole":"主角","voiceProfile":{"tone":"清冷","speed":"标准","lineStyle":"克制"},"fixedOutfit":"深色校服","keyProps":["素描本"],"doNotChange":["黑色直发"]}')
    const result = await extractCharacterAttributes('一个17岁内向的黑发男高中生', mockConfig)
    expect(result.age).toBe('17岁')
    expect(result.hairColor).toBe('黑色')
    expect(result.gender).toBe('男生')
    expect(result.relationships).toEqual(['误会对象'])
    expect(result.voiceProfile?.tone).toBe('清冷')
    expect(result.keyProps).toEqual(['素描本'])
  })

  it('returns empty object on parse failure', async () => {
    vi.mocked(callModel).mockResolvedValue('无法解析')
    const result = await extractCharacterAttributes('test', mockConfig)
    expect(result).toEqual({})
  })
})
