export type ProjectStatus = 'pending' | 'generating' | 'reviewing' | 'done' | 'failed'
export type PanelStatus = 'pending' | 'generating' | 'done' | 'failed'
export type CharacterType = 'character' | 'background'

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
}

export interface Project {
  id: number
  token: string
  script: string
  style: string
  modelConfig: ModelConfig
  status: ProjectStatus
  videoUrl: string | null
  createdAt: number
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
