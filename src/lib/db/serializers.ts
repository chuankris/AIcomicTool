import type { Character, CharacterAttributes, CharacterForm, Shot } from '@/types'

export function parseJsonObject<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function serializeCharacter(row: {
  id: number
  projectId: number
  name: string
  description: string
  attributes: string
  prompt: string
  referenceImageUrl: string | null
  type: string
  identityLock?: string
  defaultForm?: string
  humanFormPrompt?: string
  animalFormPrompt?: string
  transformingFormPrompt?: string
}): Character {
  const formPrompts: Partial<Record<CharacterForm, string>> = {
    ...(row.humanFormPrompt ? { human: row.humanFormPrompt } : {}),
    ...(row.animalFormPrompt ? { animal: row.animalFormPrompt } : {}),
    ...(row.transformingFormPrompt ? { transforming: row.transformingFormPrompt } : {}),
  }

  return {
    ...row,
    type: row.type === 'background' ? 'background' : 'character',
    attributes: parseJsonObject<CharacterAttributes>(row.attributes, {}),
    identityLock: row.identityLock ?? '',
    defaultForm: (row.defaultForm || 'default') as CharacterForm,
    formPrompts,
  }
}

export function serializeShot(
  row: {
    id: number
    index: number
    sceneDesc: string
    dialogue: string
    emotion: string
    composition: string
    promptOverride: string | null
    durationSec: number
    subtitlePosition: string
    localFeedback: string
    aspectRatio: string
    resolutionWidth: number | null
    resolutionHeight: number | null
    safeAreaTop: number | null
    safeAreaBottom: number | null
    safeAreaLeft: number | null
    safeAreaRight: number | null
    keyProps: string
    backgroundId: number | null
    backgroundStrength: number | null
  },
  refs: Array<{ characterId: number; strength: number | null }>,
  characterNames: string[],
): Shot {
  const resolution = row.resolutionWidth || row.resolutionHeight
    ? { width: row.resolutionWidth ?? undefined, height: row.resolutionHeight ?? undefined }
    : undefined
  const safeArea = row.safeAreaTop || row.safeAreaBottom || row.safeAreaLeft || row.safeAreaRight
    ? {
        top: row.safeAreaTop ?? undefined,
        bottom: row.safeAreaBottom ?? undefined,
        left: row.safeAreaLeft ?? undefined,
        right: row.safeAreaRight ?? undefined,
      }
    : undefined

  return {
    index: row.index,
    sceneDesc: row.sceneDesc,
    characters: characterNames,
    dialogue: row.dialogue,
    emotion: row.emotion,
    composition: row.composition,
    ...(row.promptOverride ? { promptOverride: row.promptOverride } : {}),
    durationSec: row.durationSec,
    subtitlePosition: row.subtitlePosition as Shot['subtitlePosition'],
    keyProps: parseJsonObject<string[]>(row.keyProps, []),
    characterRefs: refs.length ? refs.map(ref => ({
      characterId: ref.characterId,
      ...(ref.strength !== null ? { strength: ref.strength / 100 } : {}),
    })) : undefined,
    backgroundRef: row.backgroundId ? {
      backgroundId: row.backgroundId,
      ...(row.backgroundStrength !== null ? { strength: row.backgroundStrength / 100 } : {}),
    } : undefined,
    localFeedback: row.localFeedback,
    aspectRatio: row.aspectRatio as Shot['aspectRatio'],
    resolution,
    safeArea,
  }
}
