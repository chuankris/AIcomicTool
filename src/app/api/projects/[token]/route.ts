import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, characters, panels } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const [project] = await db.select().from(projects).where(eq(projects.token, token))
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const chars = await db.select().from(characters).where(eq(characters.projectId, project.id))
    const panelList = await db.select().from(panels).where(eq(panels.projectId, project.id))
      .orderBy(asc(panels.index))

    return NextResponse.json({
      ...project,
      modelConfig: undefined, // don't expose apiKey to frontend
      characters: chars.map(c => ({ ...c, attributes: JSON.parse(c.attributes) })),
      panels: panelList,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
