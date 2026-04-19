import { callModel } from './model-client'
import type { ModelConfig, ParsedPanel } from '@/types'

const SYSTEM_PROMPT = `你是一个漫画分镜专家。将用户输入的故事剧本拆解为分镜列表，以 JSON 数组返回。

每个分镜包含以下字段：
- index: 序号（从1开始）
- sceneDesc: 场景环境描述（地点、时间、光线）
- characters: 出场角色名字数组
- dialogue: 台词（若无则为空字符串）
- emotion: 情绪关键词（如：愤怒、温柔、悲伤、欢快）
- composition: 构图/镜头（如：正面中景、侧面近景、俯拍全景、仰拍特写）
- prompt: 即梦图像生成 prompt，遵循以下规则：
  1. 格式：场景描述 + 漫画风格 + 情绪 + 构图 + 高清细腻
  2. 不超过 40 个词（约 80 个汉字）
  3. 用中文写，不用英文

只返回 JSON 数组，不要包含其他文字。示例：
[{"index":1,"sceneDesc":"教室，午后阳光","characters":["小明"],"dialogue":"你好！","emotion":"开心","composition":"正面中景","prompt":"明亮教室，午后阳光穿透窗帘，日漫风格，开心情绪，正面中景，高清细腻"}]`

export async function parseScript(
  script: string,
  style: string,
  modelConfig: ModelConfig,
): Promise<ParsedPanel[]> {
  const userMessage = `漫画风格：${style}\n\n剧本内容：\n${script}`
  const raw = await callModel(modelConfig, SYSTEM_PROMPT, userMessage)

  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('AI 返回格式错误，无法解析为分镜列表')

  const panels: ParsedPanel[] = JSON.parse(jsonMatch[0])
  if (!Array.isArray(panels) || panels.length === 0) {
    throw new Error('AI 解析结果为空')
  }
  return panels
}
