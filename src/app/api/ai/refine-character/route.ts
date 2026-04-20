import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { callModel } from '@/lib/ai/model-client'
import { buildCharacterPrompt } from '@/lib/ai/prompt-builder'
import type { ModelConfig, CharacterAttributes } from '@/types'

const REFINE_SYSTEM_PROMPT = `你是漫画角色设计师。将用户对角色的自然语言描述拆解为结构化属性，以 JSON 返回。

字段说明：
- age: 年龄描述（如"17岁"）
- gender: 性别（"男生"/"女生"）
- hairColor: 发色（如"黑色"、"棕色"、"金色"）
- hairStyle: 发型（如"直发"、"卷发"、"短发"、"双马尾"）
- outfit: 服装（如"白色校服"、"黑色西装"）
- personality: 性格气质（如"内向"、"活泼"、"冷酷"）
- expressionTendency: 表情倾向（如"微笑"、"严肃"、"忧郁"）

只返回 JSON，字段可以为空字符串，不要添加解释。`

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
      const raw = await callModel(modelConfig, REFINE_SYSTEM_PROMPT, `角色名：${name}，描述：${description}`)
      const match = raw.match(/\{[\s\S]*\}/)
      attributes = match ? (JSON.parse(match[0]) as CharacterAttributes) : {}
    }

    const prompt = buildCharacterPrompt(attributes, project.style)
    return NextResponse.json({ attributes, prompt })
  } catch (e) {
    console.error('[ai/refine-character]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
