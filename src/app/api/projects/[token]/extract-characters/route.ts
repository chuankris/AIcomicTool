import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { callModel } from '@/lib/ai/model-client'
import { buildCharacterPrompt } from '@/lib/ai/prompt-builder'
import type { ModelConfig, CharacterAttributes } from '@/types'

const EXTRACT_SYSTEM = `你是漫画角色分析师。从剧本中提取所有出现的角色和重要背景场景，以 JSON 数组返回。

每个元素字段：
- name: 角色/场景名称
- description: 自然语言描述（外貌、性格、服装等）
- type: "character" 或 "background"

只返回 JSON 数组，不要添加任何解释。`

const REFINE_SYSTEM = `你是漫画角色设计师。将用户对角色的自然语言描述拆解为结构化属性，以 JSON 返回。

字段说明：
- age: 年龄描述（如"17岁"）
- gender: 性别（"男生"/"女生"）
- hairColor: 发色（如"黑色"）
- hairStyle: 发型（如"直发"）
- outfit: 服装（如"白色校服"）
- personality: 性格气质
- expressionTendency: 表情倾向

只返回 JSON，字段可以为空字符串，不要添加解释。`

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const [project] = await db.select().from(projects).where(eq(projects.token, token))
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!project.script?.trim()) return NextResponse.json({ error: 'Script is empty' }, { status: 400 })

  const modelConfig: ModelConfig = JSON.parse(project.modelConfig)

  try {
    const raw = await callModel(modelConfig, EXTRACT_SYSTEM, `剧本内容：\n${project.script}`)
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return NextResponse.json({ error: 'AI 返回格式异常' }, { status: 500 })

    const extracted: { name: string; description: string; type: string }[] = JSON.parse(match[0])

    const refined = await Promise.all(
      extracted.map(async item => {
        try {
          const attrRaw = await callModel(
            modelConfig,
            REFINE_SYSTEM,
            `角色名：${item.name}，描述：${item.description}`,
          )
          const attrMatch = attrRaw.match(/\{[\s\S]*\}/)
          const attributes: CharacterAttributes = attrMatch ? JSON.parse(attrMatch[0]) : {}
          const prompt = buildCharacterPrompt(attributes, project.style)
          return { ...item, type: item.type === 'background' ? 'background' : 'character', attributes, prompt }
        } catch {
          return { ...item, type: item.type === 'background' ? 'background' : 'character', attributes: {}, prompt: '' }
        }
      }),
    )

    return NextResponse.json({ characters: refined })
  } catch (e) {
    console.error('[extract-characters]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
