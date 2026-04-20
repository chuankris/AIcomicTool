import { describe, it, expect } from 'vitest'
import { buildCharacterPrompt, buildPanelPrompt } from './prompt-builder'
import type { Character } from '@/types'

describe('buildCharacterPrompt', () => {
  it('locks hair color and style', () => {
    const result = buildCharacterPrompt(
      { hairColor: '黑色', hairStyle: '直发', gender: '男生', age: '17岁', outfit: '校服' },
      '日漫'
    )
    expect(result).toContain('【黑色直发】')
    expect(result).toContain('【校服】')
    expect(result).toContain('日漫风格')
    expect(result.length).toBeLessThan(200)
  })

  it('locks only hair color when no style provided', () => {
    const result = buildCharacterPrompt({ hairColor: '金色' }, '韩漫')
    expect(result).toContain('【金色头发】')
  })
})

describe('buildPanelPrompt', () => {
  it('extracts lock tokens from character prompt', () => {
    const char: Character = {
      id: 1, projectId: 1, name: '小明', description: '', type: 'character',
      attributes: {}, referenceImageUrl: null,
      prompt: '【黑色直发】【白色校服】17岁男生',
    }
    const result = buildPanelPrompt({
      characters: [char],
      sceneDesc: '教室，午后阳光',
      emotion: '愤怒',
      composition: '正面中景',
      style: '日漫',
    })
    expect(result).toContain('【黑色直发】')
    expect(result).toContain('【白色校服】')
    expect(result).toContain('教室，午后阳光')
    expect(result).toContain('愤怒情绪')
    expect(result.length).toBeLessThan(160)
  })
})
