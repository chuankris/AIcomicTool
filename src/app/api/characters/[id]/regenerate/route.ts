import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characters, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateImage } from '@/lib/jimeng/client'
import { getJimengCredentials } from '@/lib/jimeng/credentials'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const charId = parseInt(id)
  if (isNaN(charId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const [char] = await db.select().from(characters).where(eq(characters.id, charId))
  if (!char) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [project] = await db.select().from(projects).where(eq(projects.id, char.projectId))
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  try {
    const { accessKeyId, secretAccessKey } = await getJimengCredentials()
    const { imageUrl: referenceImageUrl } = await generateImage({
      prompt: char.prompt,
      style: project.style,
      accessKeyId,
      secretAccessKey,
    })
    const [updated] = await db.update(characters).set({ referenceImageUrl }).where(eq(characters.id, charId)).returning()
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
