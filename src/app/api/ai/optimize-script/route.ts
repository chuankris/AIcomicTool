import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { callModel } from '@/lib/ai/model-client'
import type { ModelConfig } from '@/types'

const SYSTEM_PROMPT = `你是漫画剧本编辑。将用户的故事文本优化为标准漫画剧本格式：
- 每个主要场景开头加【场景：简短描述】
- 对话格式：角色名：（动作/表情）台词
- 适当补充角色的情绪和肢体动作描述，使画面感更强
- 保持原有故事内容和情节不变
只返回优化后的剧本文本，不要添加任何解释或标题。`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, script } = body as { token: string; script: string }

    if (!token || !script?.trim()) {
      return NextResponse.json({ error: 'token and script are required' }, { status: 400 })
    }

    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const modelConfig: ModelConfig = JSON.parse(project.modelConfig)
    const optimizedScript = await callModel(
      modelConfig,
      SYSTEM_PROMPT,
      `请优化以下漫画剧本，风格为${project.style}：\n\n${script}`,
    )

    return NextResponse.json({ optimizedScript })
  } catch (e) {
    console.error('[ai/optimize-script]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
