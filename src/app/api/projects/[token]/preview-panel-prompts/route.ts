import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characters, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  buildPanelPrompt,
  resolvePanelBackground,
  resolvePanelCharacters,
  resolvePanelReferenceImage,
} from '@/lib/ai/prompt-builder'
import { serializeCharacter } from '@/lib/db/serializers'
import { listProjectShots } from '@/lib/db/shots'
import type { Character, Shot } from '@/types'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const shotList: Shot[] = await listProjectShots(project)
    const chars: Character[] = (await db.select().from(characters).where(eq(characters.projectId, project.id)))
      .map(serializeCharacter)

    const previews = shotList.map(shot => {
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
      return {
        index: shot.index,
        prompt: shot.promptOverride?.trim() || systemPrompt,
        systemPrompt,
        usingOverride: Boolean(shot.promptOverride?.trim()),
        referenceImageUrl: reference.referenceImageUrl ?? null,
      }
    })

    return NextResponse.json({ previews })
  } catch (e) {
    console.error('[preview-panel-prompts]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
