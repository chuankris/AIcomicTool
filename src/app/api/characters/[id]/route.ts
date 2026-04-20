import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characters, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { buildCharacterPrompt } from '@/lib/ai/prompt-builder'
import { generateImage } from '@/lib/jimeng/client'
import { getJimengCredentials } from '@/lib/jimeng/credentials'
import type { CharacterAttributes } from '@/types'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    const body = await req.json()
    const { description, attributes } = body as {
      description?: string
      attributes?: CharacterAttributes
    }

    const [existing] = await db.select().from(characters).where(eq(characters.id, id))
    if (!existing) return NextResponse.json({ error: 'Character not found' }, { status: 404 })

    const [project] = await db.select().from(projects).where(eq(projects.id, existing.projectId))
    const mergedAttributes: CharacterAttributes = {
      ...JSON.parse(existing.attributes),
      ...(attributes ?? {}),
    }
    const prompt = buildCharacterPrompt(mergedAttributes, project.style)
    const { accessKeyId, secretAccessKey } = await getJimengCredentials()
    const { imageUrl } = await generateImage({ prompt, style: project.style, accessKeyId, secretAccessKey })

    const [updated] = await db.update(characters)
      .set({
        description: description ?? existing.description,
        attributes: JSON.stringify(mergedAttributes),
        prompt,
        referenceImageUrl: imageUrl,
      })
      .where(eq(characters.id, id))
      .returning()

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
