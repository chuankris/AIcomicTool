import { describe, it, expect } from 'vitest'
import {
  buildBackgroundPrompt,
  buildCharacterPrompt,
  buildPanelPrompt,
  buildReferencePrompt,
  resolvePanelBackground,
  resolvePanelCharacters,
  resolvePanelReferenceImage,
  bindShotReferences,
} from './prompt-builder'
import { composeVisualStylePrompt, resolveStylePrompt } from './style-presets'
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

  it('includes director foundation fields when present', () => {
    const result = buildCharacterPrompt({
      hairColor: '黑色',
      hairStyle: '短发',
      fixedOutfit: '深色校服',
      relationships: ['误会对象'],
      storyRole: '冲突触发者',
      keyProps: ['素描本'],
      doNotChange: ['黑色短发'],
    }, '韩漫')
    expect(result).toContain('【固定服装：深色校服】')
    expect(result).toContain('剧情功能：冲突触发者')
    expect(result).toContain('角色关系：误会对象')
    expect(result).toContain('关键道具：素描本')
    expect(result).toContain('保持不变：黑色短发')
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

  it('supports composed visual style strings', () => {
    const result = buildPanelPrompt({
      characters: [],
      sceneDesc: '雨夜旧街道',
      emotion: '紧张',
      composition: '低角度',
      style: '韩漫 / 赛博朋克 / 电影感',
    })
    expect(result).toContain('韩漫风格')
    expect(result).toContain('赛博朋克都市')
    expect(result).toContain('电影感构图')
  })
})

describe('style presets', () => {
  it('composes visual style config', () => {
    const result = composeVisualStylePrompt({
      baseStyle: '韩漫',
      genreTags: ['赛博朋克'],
      moodTags: ['电影感'],
    })
    expect(result).toContain('韩漫风格')
    expect(result).toContain('赛博朋克都市')
    expect(result).toContain('电影感构图')
  })

  it('keeps seductive fashion mature but non-explicit', () => {
    const result = resolveStylePrompt('性感魅惑')
    expect(result).toContain('成熟气质')
    expect(result).toContain('非露骨表达')
  })
})

describe('background prompts', () => {
  it('builds scene reference prompts without character-only wording', () => {
    const result = buildBackgroundPrompt(
      {
        locationType: '旧教学楼美术教室',
        timeOfDay: '雨夜',
        lighting: '霓虹反光',
        keyProps: ['画架', '素描本'],
        atmosphere: '悬疑暧昧',
      },
      '韩漫',
    )
    expect(result).toContain('旧教学楼美术教室')
    expect(result).toContain('关键道具：画架、素描本')
    expect(result).toContain('场景参考图')
    expect(result).not.toContain('正面全身')
    expect(result).not.toContain('角色参考图')
  })

  it('routes reference prompts by type', () => {
    const background = buildReferencePrompt({
      type: 'background',
      attributes: {},
      style: '韩漫',
      name: '旧教学楼',
      description: '雨后潮湿的走廊',
    })
    const character = buildReferencePrompt({
      type: 'character',
      attributes: { hairColor: '黑色', hairStyle: '短发' },
      style: '韩漫',
    })
    expect(background).toContain('场景参考图')
    expect(background).not.toContain('角色参考图')
    expect(character).toContain('角色参考图')
  })
})

describe('panel prompt data foundation', () => {
  const character: Character = {
    id: 1,
    projectId: 1,
    name: '林夏',
    description: '黑色短发，深色校服',
    type: 'character',
    attributes: {},
    referenceImageUrl: 'https://example.com/linxia.png',
    prompt: '【黑色短发】【深色校服】沉默敏锐',
  }
  const background: Character = {
    id: 2,
    projectId: 1,
    name: '废弃地铁站',
    description: '冷色应急灯，积水反光',
    type: 'background',
    attributes: {},
    referenceImageUrl: 'https://example.com/station.png',
    prompt: '废弃地铁站，冷色应急灯，场景参考图',
  }

  it('builds prompts with character locks, background, props and local feedback', () => {
    const result = buildPanelPrompt({
      characters: [character],
      background,
      sceneDesc: '林夏站在站台边缘',
      emotion: '紧张',
      composition: '低角度中景',
      style: '韩漫',
      shot: {
        keyProps: ['旧耳机'],
        subtitlePosition: 'bottom',
        safeArea: { bottom: 18 },
        localFeedback: '更暗，强调孤独感',
      },
    })
    expect(result).toContain('林夏')
    expect(result).toContain('【黑色短发】')
    expect(result).toContain('背景场景：废弃地铁站')
    expect(result).toContain('关键道具：旧耳机')
    expect(result).toContain('字幕安全区')
    expect(result).toContain('本格调整要求：更暗，强调孤独感')
  })

  it('keeps multi-form fox characters humanoid by default', () => {
    const fox: Character = {
      id: 8,
      projectId: 1,
      name: '白狐',
      description: '修行千年的九尾白狐，可化为人形',
      type: 'character',
      attributes: {},
      referenceImageUrl: 'https://example.com/fox.png',
      prompt: '【白色长发】【古风服饰】九尾白狐真身',
      identityLock: 'white fox girl, humanoid nine-tailed fox spirit, not an animal fox',
      defaultForm: 'human',
      formPrompts: {
        human: 'keep human girl form, fox ears, nine white fox tails, not animal fox',
        animal: 'true white fox animal form, four-legged, not humanoid',
      },
    }
    const result = buildPanelPrompt({
      characters: [fox],
      sceneDesc: '月下庭院，白狐初次现身，眼含柔情',
      emotion: '温柔',
      composition: '中景',
      style: '日漫',
    })

    expect(result).toContain('humanoid nine-tailed fox spirit')
    expect(result).toContain('keep human girl form')
    expect(result).not.toContain('four-legged')
  })

  it('allows explicit white fox animal-form flashback shots', () => {
    const fox: Character = {
      id: 8,
      projectId: 1,
      name: '白狐',
      description: '修行千年的九尾白狐，可化为人形',
      type: 'character',
      attributes: {},
      referenceImageUrl: 'https://example.com/fox.png',
      prompt: '【白色长发】【古风服饰】九尾白狐真身',
      identityLock: 'white fox girl, humanoid nine-tailed fox spirit, not an animal fox',
      defaultForm: 'human',
      formPrompts: {
        human: 'keep human girl form, fox ears, nine white fox tails, not animal fox',
        animal: 'true white fox animal form, four-legged, not humanoid',
      },
    }
    const result = buildPanelPrompt({
      characters: [fox],
      sceneDesc: '山间小路，少年书生救起一只受伤的白狐',
      emotion: '怜惜',
      composition: '近景',
      style: '日漫',
    })

    expect(result).toContain('true white fox animal form')
    expect(result).toContain('four-legged')
  })

  it('resolves panel references with graceful fallback', () => {
    const shot = {
      characters: ['林夏'],
      sceneDesc: '废弃地铁站入口',
      characterRefs: [{ characterId: 1, strength: 0.82 }],
      backgroundRef: { backgroundId: 2, strength: 0.55 },
    }
    const chars = resolvePanelCharacters([character, background], shot)
    const bg = resolvePanelBackground([character, background], shot)
    const ref = resolvePanelReferenceImage({ characters: chars, background: bg, shot })

    expect(chars).toEqual([character])
    expect(bg).toEqual(background)
    expect(ref.referenceImageUrl).toBe(character.referenceImageUrl)
    expect(ref.referenceStrength).toBe(0.82)
  })

  it('dedupes repeated character names and binds references', () => {
    const oldCharacter: Character = {
      ...character,
      id: 10,
      referenceImageUrl: null,
    }
    const latestCharacter: Character = {
      ...character,
      id: 11,
      referenceImageUrl: 'https://example.com/latest.png',
    }
    const shot = bindShotReferences([oldCharacter, latestCharacter, background], {
      index: 1,
      sceneDesc: '废弃地铁站，林夏回头',
      characters: ['林夏'],
      dialogue: '',
      emotion: '紧张',
      composition: '中景',
    })

    expect(shot.characterRefs).toEqual([{ characterId: 11, strength: 0.82 }])
    expect(shot.backgroundRef).toEqual({ backgroundId: 2, strength: 0.68 })
  })
})
