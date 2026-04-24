import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characters, panels, projects } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import {
  buildPanelPrompt,
  resolvePanelBackground,
  resolvePanelCharacters,
  resolvePanelReferenceImage,
} from '@/lib/ai/prompt-builder'
import { generateImage } from '@/lib/jimeng/client'
import { getJimengCredentials } from '@/lib/jimeng/credentials'
import { formatGenerationError } from '@/lib/errors'
import { serializeCharacter } from '@/lib/db/serializers'
import { listProjectShots } from '@/lib/db/shots'
import type { Character, Shot } from '@/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json().catch(() => ({}))
  const shotIndex = Number(body.shotIndex)
  if (!Number.isInteger(shotIndex) || shotIndex < 1) {
    return NextResponse.json({ error: 'Invalid shotIndex' }, { status: 400 })
  }

  let panelId: number | undefined
  try {
    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const shotList: Shot[] = await listProjectShots(project)
    const shot = shotList.find(item => item.index === shotIndex)
    if (!shot) return NextResponse.json({ error: 'Shot not found' }, { status: 404 })

    const chars: Character[] = (await db.select().from(characters).where(eq(characters.projectId, project.id)))
      .map(serializeCharacter)
    const panelChars = resolvePanelCharacters(chars, shot)
    const panelBackground = resolvePanelBackground(chars, shot)
    const reference = resolvePanelReferenceImage({
      characters: panelChars,
      background: panelBackground,
      shot,
    })
    const systemPrompt = buildPanelPrompt({
      characters: panelChars,
      background: panelBackground,
      sceneDesc: shot.sceneDesc,
      emotion: shot.emotion,
      composition: shot.composition,
      style: project.style,
      shot,
    })
    const prompt = shot.promptOverride?.trim() || systemPrompt

    const [existingPanel] = await db.select().from(panels).where(and(
      eq(panels.projectId, project.id),
      eq(panels.index, shot.index),
    ))

    const [panel] = existingPanel
      ? await db.update(panels)
          .set({
            sceneDesc: shot.sceneDesc,
            dialogue: shot.dialogue,
            prompt,
            status: 'generating',
          })
          .where(eq(panels.id, existingPanel.id))
          .returning()
      : await db.insert(panels).values({
          projectId: project.id,
          index: shot.index,
          sceneDesc: shot.sceneDesc,
          dialogue: shot.dialogue,
          prompt,
          status: 'generating',
          imageModel: project.imageModel || 'jimeng',
        }).returning()
    panelId = panel.id

    const { accessKeyId, secretAccessKey } = await getJimengCredentials()
    const { imageUrl } = await generateImage({
      prompt,
      style: project.style,
      referenceImageUrl: reference.referenceImageUrl,
      referenceStrength: reference.referenceStrength,
      width: shot.resolution?.width,
      height: shot.resolution?.height,
      accessKeyId,
      secretAccessKey,
    })

    const [updated] = await db.update(panels)
      .set({ imageUrl, prompt, status: 'done' })
      .where(eq(panels.id, panel.id))
      .returning()

    return NextResponse.json(updated)
  } catch (e) {
    const errorMessage = formatGenerationError(e)
    if (panelId) {
      await db.update(panels)
        .set({ status: 'failed', reviewFeedback: errorMessage })
        .where(eq(panels.id, panelId))
        .catch(() => {})
    }
    console.error('[generate-panel]', e)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
