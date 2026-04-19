import { describe, it, expect, vi } from 'vitest'
import type { ModelConfig } from '@/types'

vi.mock('./model-client', () => ({
  callModel: vi.fn(),
}))

import { callModel } from './model-client'
import { parseScript } from './script-parser'

const mockConfig: ModelConfig = { provider: 'claude', baseURL: '', apiKey: 'sk-test', model: '' }

describe('parseScript', () => {
  it('parses valid JSON response from AI', async () => {
    vi.mocked(callModel).mockResolvedValue(JSON.stringify([
      { index: 1, sceneDesc: '教室', characters: ['小明'], dialogue: '你好', emotion: '开心', composition: '中景', prompt: '教室，日漫风格' },
    ]))
    const result = await parseScript('小明说你好', '日漫', mockConfig)
    expect(result).toHaveLength(1)
    expect(result[0].index).toBe(1)
    expect(result[0].characters).toEqual(['小明'])
  })

  it('extracts JSON from response with surrounding text', async () => {
    vi.mocked(callModel).mockResolvedValue('好的，分镜如下：[{"index":1,"sceneDesc":"街道","characters":[],"dialogue":"","emotion":"平静","composition":"远景","prompt":"街道，日漫"}]')
    const result = await parseScript('街道场景', '日漫', mockConfig)
    expect(result[0].sceneDesc).toBe('街道')
  })

  it('throws when AI returns no JSON', async () => {
    vi.mocked(callModel).mockResolvedValue('抱歉，我无法处理这个请求')
    await expect(parseScript('test', '日漫', mockConfig)).rejects.toThrow('AI 返回格式错误')
  })
})
