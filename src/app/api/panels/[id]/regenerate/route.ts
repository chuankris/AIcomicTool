import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { panels, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateImage } from '@/lib/jimeng/client'
import { getJimengCredentials } from '@/lib/jimeng/credentials'
import type { ModelConfig } from '@/types'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  try {
    const [panel] = await db.select().from(panels).where(eq(panels.id, numId))
    if (!panel) return NextResponse.json({ error: 'Panel not found' }, { status: 404 })

    const [project] = await db.select().from(projects).where(eq(projects.id, panel.projectId))
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const effectiveModel = panel.imageModel || project.imageModel || 'jimeng'
    const modelConfig: ModelConfig = JSON.parse(project.modelConfig)
    const { accessKeyId, secretAccessKey } = await getJimengCredentials()

    const prompt = panel.prompt || panel.sceneDesc

    await db.update(panels).set({ status: 'generating' }).where(eq(panels.id, numId))

    const { imageUrl } = await generateImage({ prompt, style: project.style, accessKeyId, secretAccessKey })

    const [updated] = await db.update(panels)
      .set({ imageUrl, status: 'done' })
      .where(eq(panels.id, numId))
      .returning()

    return NextResponse.json({ ...updated, usedModel: effectiveModel !== 'jimeng' ? 'jimeng (fallback)' : 'jimeng' })
  } catch (e) {
    await db.update(panels).set({ status: 'failed' }).where(eq(panels.id, parseInt(id, 10))).catch(() => {})
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
