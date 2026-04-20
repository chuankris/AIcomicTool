import type { Character, CharacterAttributes } from '@/types'

const STYLE_MAP: Record<string, string> = {
  '日漫': '日漫风格，Manga 2.0 Pro风格',
  '韩漫': '韩漫风格，精致线条',
  '美漫': '美漫风格，粗犷线条，强对比',
  '国风': '国风水墨漫画，工笔风格',
}

const QUALITY_SUFFIX = '高清细腻，细节丰富，光影精妙'

export function buildCharacterPrompt(attrs: CharacterAttributes, style: string): string {
  const parts: string[] = []

  if (attrs.hairColor && attrs.hairStyle) {
    parts.push(`【${attrs.hairColor}${attrs.hairStyle}】`)
  } else if (attrs.hairColor) {
    parts.push(`【${attrs.hairColor}头发】`)
  }
  if (attrs.outfit) parts.push(`【${attrs.outfit}】`)

  const subjectParts: string[] = []
  if (attrs.age) subjectParts.push(attrs.age)
  if (attrs.gender) subjectParts.push(attrs.gender)
  if (attrs.personality) subjectParts.push(attrs.personality)
  if (subjectParts.length) parts.push(subjectParts.join('，'))

  parts.push(STYLE_MAP[style] ?? `${style}风格`)
  parts.push('正面全身，角色参考图')
  parts.push(QUALITY_SUFFIX)

  return parts.join('，').slice(0, 200)
}

export function buildPanelPrompt(params: {
  characters: Character[]
  sceneDesc: string
  emotion: string
  composition: string
  style: string
}): string {
  const { characters, sceneDesc, emotion, composition, style } = params
  const parts: string[] = []

  for (const char of characters) {
    const locks = char.prompt.match(/【[^】]+】/g) ?? []
    parts.push(...locks)
  }

  if (sceneDesc) parts.push(sceneDesc)

  parts.push(STYLE_MAP[style] ?? `${style}风格`)
  if (emotion) parts.push(`${emotion}情绪`)
  if (composition) parts.push(composition)
  parts.push(QUALITY_SUFFIX)

  return parts.join('，').slice(0, 160)
}
