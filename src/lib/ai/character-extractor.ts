// src/lib/ai/character-extractor.ts
import { callModel } from './model-client'
import type { ModelConfig, CharacterAttributes } from '@/types'

const SYSTEM_PROMPT = `你是漫画角色设计师。将用户对角色的自然语言描述拆解为结构化属性，以 JSON 返回。

字段说明：
- age: 年龄描述（如"17岁"）
- gender: 性别（"男生"/"女生"）
- hairColor: 发色（如"黑色"、"棕色"、"金色"）
- hairStyle: 发型（如"直发"、"卷发"、"短发"、"双马尾"）
- outfit: 服装（如"白色校服"、"黑色西装"）
- personality: 性格气质（如"内向"、"活泼"、"冷酷"）
- expressionTendency: 表情倾向（如"微笑"、"严肃"、"忧郁"）
- relationships: 与其他角色的关系数组
- storyRole: 剧情功能（如"主角"、"冲突触发者"）
- voiceProfile: 角色声音和台词气质，包含 tone、speed、lineStyle
- fixedOutfit: 需要长期保持的固定服装
- keyProps: 与角色绑定的关键道具数组
- doNotChange: 后续出图不可变化的特征数组

只返回 JSON，字段可以为空字符串，不要添加解释。`

export async function extractCharacterAttributes(
  description: string,
  modelConfig: ModelConfig,
): Promise<CharacterAttributes> {
  const raw = await callModel(modelConfig, SYSTEM_PROMPT, `角色描述：${description}`)
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return {}
  try {
    return JSON.parse(jsonMatch[0]) as CharacterAttributes
  } catch {
    return {}
  }
}
