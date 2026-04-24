import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characters, panels, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateImage } from '@/lib/jimeng/client'
import { getJimengCredentials } from '@/lib/jimeng/credentials'
import {
  buildPanelPrompt,
  resolvePanelBackground,
  resolvePanelCharacters,
  resolvePanelReferenceImage,
} from '@/lib/ai/prompt-builder'
import { formatGenerationError } from '@/lib/errors'
import { serializeCharacter } from '@/lib/db/serializers'
import { listProjectShots } from '@/lib/db/shots'
import type { Character, Shot } from '@/types'

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
    const { accessKeyId, secretAccessKey } = await getJimengCredentials()

    const chars: Character[] = (await db.select().from(characters).where(eq(characters.projectId, project.id)))
      .map(serializeCharacter)
    const shotList: Shot[] = await listProjectShots(project)
    const shot = shotList.find(item => item.index === panel.index)
    const panelChars = resolvePanelCharacters(chars, shot ?? { characters: [] })
    const panelBackground = resolvePanelBackground(chars, shot ?? { sceneDesc: panel.sceneDesc })
    const reference = resolvePanelReferenceImage({
      characters: panelChars,
      background: panelBackground,
      shot,
    })

    const systemPrompt = buildPanelPrompt({
      characters: panelChars,
      background: panelBackground,
      sceneDesc: panel.sceneDesc,
      emotion: shot?.emotion ?? '',
      composition: shot?.composition ?? '',
      style: project.style,
      shot,
      localFeedback: panel.reviewFeedback ?? undefined,
    })
    const prompt = shot?.promptOverride?.trim() || panel.prompt || systemPrompt

    await db.update(panels).set({ status: 'generating' }).where(eq(panels.id, numId))

    const { imageUrl } = await generateImage({
      prompt,
      style: project.style,
      referenceImageUrl: reference.referenceImageUrl,
      referenceStrength: reference.referenceStrength,
      width: shot?.resolution?.width,
      height: shot?.resolution?.height,
      accessKeyId,
      secretAccessKey,
    })

    const [updated] = await db.update(panels)
      .set({ imageUrl, prompt, status: 'done' })
      .where(eq(panels.id, numId))
      .returning()

    return NextResponse.json({ ...updated, usedModel: effectiveModel !== 'jimeng' ? 'jimeng (fallback)' : 'jimeng' })
  } catch (e) {
    const errorMessage = formatGenerationError(e)
    await db.update(panels)
      .set({ status: 'failed', reviewFeedback: errorMessage })
      .where(eq(panels.id, parseInt(id, 10)))
      .catch(() => {})
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
