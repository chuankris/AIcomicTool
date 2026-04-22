import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { panels, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { callModel } from '@/lib/ai/model-client'
import type { ModelConfig } from '@/types'

const SYSTEM = `你是即梦AI绘画提示词优化师。将场景描述优化为适合即梦生成漫画分镜的提示词。

要求：
- 具体的视觉描述：人物动作、表情、环境氛围、光影
- 保留原有的角色外观关键词（【】括号内容）
- 风格标签放在最后
- 控制在 150 字以内
- 直接返回提示词，不加任何解释`

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { feedback } = body as { feedback?: string }

  const [panel] = await db.select().from(panels).where(eq(panels.id, numId))
  if (!panel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [project] = await db.select().from(projects).where(eq(projects.id, panel.projectId))
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const modelConfig: ModelConfig = JSON.parse(project.modelConfig)

  const userMsg = [
    `当前提示词：${panel.prompt || panel.sceneDesc}`,
    `场景描述：${panel.sceneDesc}`,
    feedback ? `用户要求：${feedback}` : '',
  ].filter(Boolean).join('\n')

  try {
    const refined = await callModel(modelConfig, SYSTEM, userMsg)
    return NextResponse.json({ prompt: refined.trim() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
