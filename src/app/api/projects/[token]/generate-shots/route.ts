import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { callModel } from '@/lib/ai/model-client'
import type { ModelConfig, Shot } from '@/types'

const SYSTEM_PROMPT = `你是漫画分镜助手。将用户提供的剧本拆解为分镜列表。
每格分镜返回一个 JSON 对象，所有分镜组成一个 JSON 数组。
字段说明：
- index: 从 1 开始的序号
- sceneDesc: 场景描述（中文，20字以内）
- characters: 出场角色名数组（没有则为空数组）
- dialogue: 台词（没有则为空字符串）
- emotion: 主要情绪（如 平静、紧张、喜悦、悲伤、愤怒）
- composition: 镜头构图（如 全景、中景、近景、特写、俯视、仰视）
只返回 JSON 数组，不要其他文字或 markdown 代码块。`

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params

    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    if (!project.script?.trim()) {
      return NextResponse.json({ error: '请先填写剧本' }, { status: 400 })
    }

    const modelConfig: ModelConfig = JSON.parse(project.modelConfig)
    const raw = await callModel(modelConfig, SYSTEM_PROMPT, project.script)

    const shots: Shot[] = JSON.parse(raw)

    await db.update(projects).set({ shots: JSON.stringify(shots) }).where(eq(projects.token, token))

    return NextResponse.json({ shots })
  } catch (e) {
    console.error('[projects/generate-shots]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
