import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { callModel } from '@/lib/ai/model-client'
import { buildReferencePrompt } from '@/lib/ai/prompt-builder'
import type { ModelConfig, CharacterAttributes } from '@/types'

const REFINE_SYSTEM_PROMPT = `你是漫画前期设定师。将用户对角色或背景场景的自然语言描述拆解为结构化属性，以 JSON 返回。

角色字段说明：
- age: 年龄描述（如"17岁"）
- gender: 性别（"男生"/"女生"）
- hairColor: 发色（如"黑色"、"棕色"、"金色"）
- hairStyle: 发型（如"直发"、"卷发"、"短发"、"双马尾"）
- outfit: 服装（如"白色校服"、"黑色西装"）
- personality: 性格气质（如"内向"、"活泼"、"冷酷"）
- expressionTendency: 表情倾向（如"微笑"、"严肃"、"忧郁"）
- relationships: 与其他角色的关系数组（如["误会对象","暗恋"]）
- storyRole: 剧情功能（如"主角"、"冲突触发者"、"秘密持有者"）
- voiceProfile: 角色声音和台词气质，包含 tone、speed、lineStyle
- fixedOutfit: 需要长期保持的固定服装
- keyProps: 与角色绑定的关键道具数组
- doNotChange: 后续出图不可变化的特征数组

背景字段说明：
- locationType: 场景类型或地点（如"旧教学楼美术教室"）
- timeOfDay: 时间/天气（如"雨夜"、"午后"）
- lighting: 光线（如"霓虹反光"、"烛光"）
- keyProps: 场景关键道具数组（如["画架","素描本"]）
- atmosphere: 氛围（如"悬疑暧昧"）
- storyUsage: 场景用途（如"对峙场景"、"转场空镜"）
- reusableShots: 可复用镜头数组（如["窗边","门口"]）

只返回 JSON。无关字段可以为空字符串或空数组，不要添加解释。`

const REFINE_WITH_FEEDBACK_PROMPT = `你是漫画角色设计师。根据用户反馈调整角色属性，以 JSON 返回更新后的属性。
原则：只调整用户指出的问题，其他属性保持不变。只返回 JSON，不要添加解释。`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, name, description, type, feedback, currentAttributes } = body as {
      token: string
      name: string
      description: string
      type: string
      feedback?: string
      currentAttributes?: CharacterAttributes
    }

    if (!token || !description?.trim()) {
      return NextResponse.json({ error: 'token and description are required' }, { status: 400 })
    }

    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const modelConfig: ModelConfig = JSON.parse(project.modelConfig)

    let attributes: CharacterAttributes
    if (feedback && currentAttributes) {
      const userMessage = `角色名：${name}
原描述：${description}
当前属性：${JSON.stringify(currentAttributes)}
用户反馈：${feedback}
请根据反馈调整属性。`
      const raw = await callModel(modelConfig, REFINE_WITH_FEEDBACK_PROMPT, userMessage)
      const match = raw.match(/\{[\s\S]*\}/)
      attributes = match ? (JSON.parse(match[0]) as CharacterAttributes) : currentAttributes
    } else {
      const raw = await callModel(modelConfig, REFINE_SYSTEM_PROMPT, `类型：${type === 'background' ? 'background' : 'character'}\n名称：${name}\n描述：${description}`)
      const match = raw.match(/\{[\s\S]*\}/)
      attributes = match ? (JSON.parse(match[0]) as CharacterAttributes) : {}
    }

    const prompt = buildReferencePrompt({
      type: type === 'background' ? 'background' : 'character',
      attributes,
      style: project.style,
      name,
      description,
    })
    return NextResponse.json({ attributes, prompt })
  } catch (e) {
    console.error('[ai/refine-character]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
