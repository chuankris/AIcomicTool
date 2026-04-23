import { NextRequest, NextResponse } from 'next/server'
import type { Shot } from '@/types'
import { db } from '@/lib/db'
import { projects, characters, panels, shotCharacterNames, shotCharacterRefs, storyboardShots } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { serializeCharacter } from '@/lib/db/serializers'
import { listProjectShots, replaceProjectShots } from '@/lib/db/shots'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const chars = await db.select().from(characters).where(eq(characters.projectId, project.id))
    const panelList = await db.select().from(panels).where(eq(panels.projectId, project.id))
      .orderBy(asc(panels.index))
    const shotList = await listProjectShots(project)

    return NextResponse.json({
      ...project,
      modelConfig: undefined, // don't expose apiKey to frontend
      shots: shotList,
      characters: chars.map(serializeCharacter),
      panels: panelList,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.delete(panels).where(eq(panels.projectId, project.id))
    await db.delete(shotCharacterNames).where(eq(shotCharacterNames.projectId, project.id))
    await db.delete(shotCharacterRefs).where(eq(shotCharacterRefs.projectId, project.id))
    await db.delete(storyboardShots).where(eq(storyboardShots.projectId, project.id))
    await db.delete(characters).where(eq(characters.projectId, project.id))
    await db.delete(projects).where(eq(projects.token, token))
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[projects DELETE]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const { script, style, name, currentStep, furthestStep, shots, imageModel } = body as {
      script?: string
      style?: string
      name?: string
      currentStep?: number
      furthestStep?: number
      shots?: string | Shot[]
      imageModel?: string
    }

    const updates: Record<string, unknown> = {}
    if (script !== undefined) updates.script = script
    if (style !== undefined) updates.style = style
    if (name !== undefined) updates.name = name
    if (currentStep !== undefined) updates.currentStep = currentStep
    if (furthestStep !== undefined) updates.furthestStep = furthestStep
    if (shots !== undefined) {
      const nextShots = typeof shots === 'string' ? JSON.parse(shots) as Shot[] : shots
      await replaceProjectShots(project.id, nextShots)
    }
    if (imageModel !== undefined) updates.imageModel = imageModel

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    await db.update(projects).set(updates).where(eq(projects.token, token))
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[projects PATCH]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
