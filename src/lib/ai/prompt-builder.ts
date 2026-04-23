import type { Character, CharacterAttributes, CharacterForm, Shot } from '@/types'
import { resolveStylePrompt, type StyleInput } from './style-presets'

const QUALITY_SUFFIX = '高清细腻，细节丰富，光影精妙'
const PANEL_PROMPT_LIMIT = 280

const FORM_KEYWORDS: Record<CharacterForm, string[]> = {
  default: [],
  human: ['人形', '少女', '少年', '女子', '男子', '书生', '人类', '化人', '化为人形'],
  animal: ['真身', '狐狸形态', '动物形态', '兽形', '四足', '一只白狐', '一只狐狸', '受伤的白狐', '受伤白狐'],
  transforming: ['化形', '变身', '人形渐显', '化作', '幻化', '半人半狐'],
}

function getShotText(shot?: Partial<Shot>): string {
  if (!shot) return ''
  return [
    shot.sceneDesc,
    shot.dialogue,
    shot.emotion,
    shot.composition,
    shot.localFeedback,
    ...(shot.keyProps ?? []),
  ].filter(Boolean).join('，')
}

function detectCharacterForm(char: Character, shot?: Partial<Shot>): CharacterForm {
  const text = getShotText(shot)
  if (!text) return char.defaultForm ?? 'default'

  if (FORM_KEYWORDS.transforming.some(keyword => text.includes(keyword))) return 'transforming'
  if (FORM_KEYWORDS.animal.some(keyword => text.includes(keyword))) return 'animal'
  if (FORM_KEYWORDS.human.some(keyword => text.includes(keyword)) && text.includes(char.name)) return 'human'

  return char.defaultForm ?? 'default'
}

function inferIdentityLock(char: Character): string {
  const source = `${char.name}，${char.description}，${char.prompt}`
  if ((source.includes('白狐') || source.includes('狐妖') || source.includes('九尾')) && source.includes('人')) {
    return '人形狐妖少女，保持人类少女形态，狐耳，九条白色狐尾，非动物狐狸'
  }
  return ''
}

function getCharacterFormPrompt(char: Character, shot?: Partial<Shot>): string {
  const form = detectCharacterForm(char, shot)
  const configured = char.formPrompts?.[form] || (form !== 'default' ? char.formPrompts?.default : '')
  if (configured) return configured

  const source = `${char.name}，${char.description}，${char.prompt}`
  if (source.includes('白狐') || source.includes('狐妖') || source.includes('九尾')) {
    if (form === 'animal') return '白狐真身，动物狐狸形态，雪白狐狸，四足，非人形'
    if (form === 'transforming') return '白狐从动物真身化为人形，人形渐显，保留狐耳和白色狐尾'
    return '人形九尾狐妖少女，保持人类少女形态，白色长发，古风服饰，狐耳，九条白色狐尾，非动物狐狸'
  }

  if (form === 'human') return '保持人形，非动物形态'
  if (form === 'animal') return '动物形态，非人形'
  if (form === 'transforming') return '化形过程，形态变化清晰'
  return ''
}

function buildCharacterPanelLock(char: Character, shot?: Partial<Shot>): string {
  const locks = char.prompt.match(/【[^】]+】/g) ?? []
  const identity = char.identityLock?.trim() || inferIdentityLock(char)
  const formPrompt = getCharacterFormPrompt(char, shot)
  const parts = [identity, formPrompt, locks.join('') || char.description].filter(Boolean)
  return `${char.name}：${parts.join('，')}`
}

export function buildCharacterPrompt(attrs: CharacterAttributes, style: StyleInput): string {
  const parts: string[] = []

  if (attrs.hairColor && attrs.hairStyle) {
    parts.push(`【${attrs.hairColor}${attrs.hairStyle}】`)
  } else if (attrs.hairColor) {
    parts.push(`【${attrs.hairColor}头发】`)
  }
  if (attrs.outfit) parts.push(`【${attrs.outfit}】`)
  if (attrs.fixedOutfit && attrs.fixedOutfit !== attrs.outfit) parts.push(`【固定服装：${attrs.fixedOutfit}】`)

  const subjectParts: string[] = []
  if (attrs.age) subjectParts.push(attrs.age)
  if (attrs.gender) subjectParts.push(attrs.gender)
  if (attrs.personality) subjectParts.push(attrs.personality)
  if (attrs.storyRole) subjectParts.push(`剧情功能：${attrs.storyRole}`)
  if (subjectParts.length) parts.push(subjectParts.join('，'))
  if (attrs.expressionTendency) parts.push(`${attrs.expressionTendency}表情倾向`)
  if (attrs.relationships?.length) parts.push(`角色关系：${attrs.relationships.join('、')}`)
  if (attrs.keyProps?.length) parts.push(`关键道具：${attrs.keyProps.join('、')}`)
  if (attrs.doNotChange?.length) parts.push(`保持不变：${attrs.doNotChange.join('、')}`)

  const stylePrompt = resolveStylePrompt(style)
  if (stylePrompt) parts.push(stylePrompt)
  parts.push('正面全身，角色参考图')
  parts.push(QUALITY_SUFFIX)

  return parts.join('，').slice(0, 200)
}

export function buildBackgroundPrompt(
  attrs: CharacterAttributes,
  style: StyleInput,
  context?: { name?: string; description?: string },
): string {
  const parts: string[] = []

  if (context?.name) parts.push(context.name)
  if (context?.description) parts.push(context.description)
  if (attrs.locationType) parts.push(attrs.locationType)
  if (attrs.timeOfDay) parts.push(attrs.timeOfDay)
  if (attrs.lighting) parts.push(`${attrs.lighting}光线`)
  if (attrs.keyProps?.length) parts.push(`关键道具：${attrs.keyProps.join('、')}`)
  if (attrs.atmosphere) parts.push(`${attrs.atmosphere}氛围`)
  if (attrs.storyUsage) parts.push(`场景用途：${attrs.storyUsage}`)
  if (attrs.reusableShots?.length) parts.push(`可复用镜头：${attrs.reusableShots.join('、')}`)

  const stylePrompt = resolveStylePrompt(style)
  if (stylePrompt) parts.push(stylePrompt)
  parts.push('空场景构图，场景参考图')
  parts.push(QUALITY_SUFFIX)

  return parts.join('，').slice(0, 220)
}

export function buildReferencePrompt(params: {
  type: 'character' | 'background'
  attributes: CharacterAttributes
  style: StyleInput
  name?: string
  description?: string
  identityLock?: string
  defaultForm?: CharacterForm
  formPrompts?: Partial<Record<CharacterForm, string>>
}): string {
  if (params.type === 'background') {
    return buildBackgroundPrompt(params.attributes, params.style, {
      name: params.name,
      description: params.description,
    })
  }
  const prompt = buildCharacterPrompt(params.attributes, params.style)
  const formPrompt = params.formPrompts?.[params.defaultForm ?? 'default'] || params.formPrompts?.default
  return [params.identityLock, formPrompt, prompt].filter(Boolean).join('；').slice(0, 240)
}

export function buildPanelPrompt(params: {
  characters: Character[]
  background?: Character | null
  sceneDesc: string
  emotion: string
  composition: string
  style: StyleInput
  shot?: Partial<Shot>
  localFeedback?: string
}): string {
  const { characters, background, sceneDesc, emotion, composition, style, shot, localFeedback } = params
  const parts: string[] = []
  const promptShot = { ...shot, sceneDesc: shot?.sceneDesc ?? sceneDesc, emotion: shot?.emotion ?? emotion, composition: shot?.composition ?? composition }

  for (const char of characters) {
    parts.push(buildCharacterPanelLock(char, promptShot))
  }

  if (sceneDesc) parts.push(sceneDesc)
  if (background) {
    parts.push(`背景场景：${background.name}，${background.description}`)
    if (background.prompt) parts.push(`背景参考：${background.prompt}`)
  }
  if (shot?.keyProps?.length) parts.push(`关键道具：${shot.keyProps.join('、')}`)

  const stylePrompt = resolveStylePrompt(style)
  if (stylePrompt) parts.push(stylePrompt)
  if (emotion) parts.push(`${emotion}情绪`)
  if (composition) parts.push(composition)
  if (shot?.durationSec) parts.push(`预计时长${shot.durationSec}秒`)
  if (shot?.subtitlePosition && shot.subtitlePosition !== 'none') {
    parts.push(`字幕安全区：${shot.subtitlePosition === 'bottom' ? '底部留白' : '中下方留白'}`)
  }
  if (shot?.safeArea) {
    const safeArea = [
      shot.safeArea.top ? `上${shot.safeArea.top}%` : '',
      shot.safeArea.bottom ? `下${shot.safeArea.bottom}%` : '',
      shot.safeArea.left ? `左${shot.safeArea.left}%` : '',
      shot.safeArea.right ? `右${shot.safeArea.right}%` : '',
    ].filter(Boolean).join('、')
    if (safeArea) parts.push(`画面安全区：${safeArea}`)
  }
  const feedback = localFeedback ?? shot?.localFeedback
  if (feedback) parts.push(`本格调整要求：${feedback}`)
  parts.push(QUALITY_SUFFIX)

  return parts.join('，').slice(0, PANEL_PROMPT_LIMIT)
}

export function resolvePanelCharacters(allCharacters: Character[], shot: Partial<Shot>): Character[] {
  if (shot.characterRefs?.length) {
    const ids = new Set(shot.characterRefs.map(ref => ref.characterId))
    return allCharacters.filter(char => ids.has(char.id) && char.type !== 'background')
  }
  const names = new Set(shot.characters ?? [])
  return Array.from(names)
    .map(name => pickBestCharacterByName(allCharacters, name))
    .filter((char): char is Character => Boolean(char))
}

export function resolvePanelBackground(allCharacters: Character[], shot: Partial<Shot>): Character | null {
  if (shot.backgroundRef?.backgroundId) {
    return allCharacters.find(char => char.id === shot.backgroundRef?.backgroundId && char.type === 'background') ?? null
  }

  const scene = shot.sceneDesc ?? ''
  return allCharacters.find(char => (
    char.type === 'background' && (scene.includes(char.name) || char.description.includes(scene))
  )) ?? null
}

export function resolvePanelReferenceImage(params: {
  characters: Character[]
  background?: Character | null
  shot?: Partial<Shot>
}): { referenceImageUrl?: string; referenceStrength?: number } {
  const { characters, background, shot } = params
  const explicitRef = shot?.characterRefs
    ?.map(ref => ({ ref, char: characters.find(char => char.id === ref.characterId) }))
    .find(item => item.char?.referenceImageUrl)

  if (explicitRef?.char?.referenceImageUrl) {
    return {
      referenceImageUrl: explicitRef.char.referenceImageUrl,
      referenceStrength: explicitRef.ref.strength,
    }
  }

  const firstCharacterWithRef = characters.find(char => char.referenceImageUrl)
  if (firstCharacterWithRef?.referenceImageUrl) {
    return { referenceImageUrl: firstCharacterWithRef.referenceImageUrl }
  }

  if (background?.referenceImageUrl) {
    return {
      referenceImageUrl: background.referenceImageUrl,
      referenceStrength: shot?.backgroundRef?.strength,
    }
  }

  return {}
}

export function pickBestCharacterByName(allCharacters: Character[], name: string): Character | null {
  const candidates = allCharacters
    .filter(char => char.type !== 'background' && char.name === name)
    .sort((a, b) => {
      const aHasRef = a.referenceImageUrl ? 1 : 0
      const bHasRef = b.referenceImageUrl ? 1 : 0
      if (aHasRef !== bHasRef) return bHasRef - aHasRef
      return b.id - a.id
    })
  return candidates[0] ?? null
}

export function bindShotReferences(allCharacters: Character[], shot: Shot): Shot {
  const resolvedCharacters = resolvePanelCharacters(allCharacters, shot)
  const resolvedBackground = resolvePanelBackground(allCharacters, shot)

  return {
    ...shot,
    characters: resolvedCharacters.length ? resolvedCharacters.map(char => char.name) : shot.characters,
    characterRefs: resolvedCharacters.length
      ? resolvedCharacters.map(char => ({ characterId: char.id, strength: 0.82 }))
      : shot.characterRefs,
    backgroundRef: resolvedBackground
      ? { backgroundId: resolvedBackground.id, strength: 0.68 }
      : shot.backgroundRef,
  }
}
