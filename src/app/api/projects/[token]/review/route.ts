import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, panels, characters } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { applyReviewFeedback } from '@/lib/ai/review-parser'
import { generateImage } from '@/lib/jimeng/client'
import { getJimengCredentials } from '@/lib/jimeng/credentials'
import type { ModelConfig, Character } from '@/types'

interface ReviewItem {
  panelId: number
  feedback: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const { reviews } = body as { reviews: ReviewItem[] }
    if (!reviews?.length) return NextResponse.json({ error: 'reviews is required' }, { status: 400 })

    const modelConfig: ModelConfig = JSON.parse(project.modelConfig)
    const creds = await getJimengCredentials()
    const chars: Character[] = (await db.select().from(characters).where(eq(characters.projectId, project.id)))
      .map(c => ({ ...c, attributes: JSON.parse(c.attributes), type: c.type as Character['type'] }))

    // 标记所有被审核的格为 generating
    await Promise.all(reviews.map(({ panelId }) =>
      db.update(panels).set({ status: 'generating' }).where(eq(panels.id, panelId))
    ))

    // 异步重新生成
    Promise.all(reviews.map(async ({ panelId, feedback }) => {
      const [panel] = await db.select().from(panels).where(eq(panels.id, panelId))
      if (!panel) return

      try {
        const newPrompt = await applyReviewFeedback({
          currentPrompt: panel.prompt,
          feedback,
          modelConfig,
        })
        const referenceImageUrl = chars[0]?.referenceImageUrl ?? null
        const { imageUrl } = await generateImage({
          prompt: newPrompt,
          style: project.style,
          referenceImageUrl,
          accessKeyId: creds.accessKeyId,
          secretAccessKey: creds.secretAccessKey,
        })
        await db.update(panels).set({
          prompt: newPrompt,
          imageUrl,
          reviewFeedback: feedback,
          revision: (panel.revision ?? 0) + 1,
          status: 'done',
        }).where(eq(panels.id, panelId))
      } catch {
        await db.update(panels).set({ status: 'failed' }).where(eq(panels.id, panelId))
      }
    })).catch(e => {
      console.error('[review] background regeneration error', e)
    })

    return NextResponse.json({ message: 'Review processing started' }, { status: 202 })
  } catch (e) {
    console.error('[review] fatal error for token', token, e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
