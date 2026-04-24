export type ProjectStatus = 'draft' | 'pending' | 'generating' | 'reviewing' | 'done' | 'failed'

export interface Shot {
  index: number
  sceneDesc: string
  characters: string[]
  dialogue: string
  emotion: string
  composition: string
  promptOverride?: string
  durationSec?: number
  subtitlePosition?: 'bottom' | 'middle-bottom' | 'none'
  keyProps?: string[]
  characterRefs?: Array<{ characterId: number; strength?: number }>
  backgroundRef?: { backgroundId: number; strength?: number }
  localFeedback?: string
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:3'
  resolution?: {
    width?: number
    height?: number
  }
  safeArea?: {
    top?: number
    bottom?: number
    left?: number
    right?: number
  }
}

export type ImageModel = 'jimeng' | 'mj-niji' | 'sd-xl' | 'kling'
export type PanelStatus = 'pending' | 'generating' | 'done' | 'failed'
export type CharacterType = 'character' | 'background'
export type CharacterForm = 'default' | 'human' | 'animal' | 'transforming'

export interface ModelConfig {
  provider: 'claude' | 'openai' | 'gemini' | 'custom'
  baseURL: string
  apiKey: string
  model: string
}

export interface CharacterAttributes {
  age?: string
  gender?: string
  hairColor?: string
  hairStyle?: string
  outfit?: string
  personality?: string
  expressionTendency?: string
  relationships?: string[]
  storyRole?: string
  voiceProfile?: {
    tone?: string
    speed?: string
    lineStyle?: string
  }
  fixedOutfit?: string
  doNotChange?: string[]
  locationType?: string
  timeOfDay?: string
  lighting?: string
  keyProps?: string[]
  atmosphere?: string
  storyUsage?: string
  reusableShots?: string[]
}

export interface Project {
  id: number
  token: string
  name: string | null
  script: string
  style: string
  modelConfig: ModelConfig
  status: ProjectStatus
  videoUrl: string | null
  createdAt: number
  currentStep: number
  furthestStep: number
  shots: Shot[]
  imageModel: string
}

export interface Character {
  id: number
  projectId: number
  name: string
  description: string
  attributes: CharacterAttributes
  prompt: string
  referenceImageUrl: string | null
  type: CharacterType
  identityLock?: string
  defaultForm?: CharacterForm
  formPrompts?: Partial<Record<CharacterForm, string>>
}

export interface Panel {
  id: number
  projectId: number
  index: number
  sceneDesc: string
  dialogue: string
  prompt: string
  imageUrl: string | null
  audioUrl: string | null
  reviewFeedback: string | null
  revision: number
  status: PanelStatus
  imageModel: string
}

export interface ParsedPanel {
  index: number
  sceneDesc: string
  characters: string[]
  dialogue: string
  emotion: string
  composition: string
  prompt: string
}

export interface ProjectWithDetails extends Project {
  characters: Character[]
  panels: Panel[]
}

export interface ModelSetting {
  id: number
  name: string
  provider: 'claude' | 'openai' | 'gemini' | 'custom'
  baseURL: string
  model: string
  apiKey: string
  createdAt: number
}

export interface JimengConfig {
  id: number
  accessKeyId: string
  secretAccessKey: string
  updatedAt: number
}
