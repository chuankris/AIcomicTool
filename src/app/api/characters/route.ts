import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characters, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { buildCharacterPrompt } from '@/lib/ai/prompt-builder'
import { generateImage } from '@/lib/jimeng/client'
import { getJimengCredentials } from '@/lib/jimeng/credentials'
import type { CharacterAttributes, ModelConfig } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectToken, name, description, attributes, type = 'character' } = body as {
      projectToken: string
      name: string
      description: string
      attributes: CharacterAttributes
      type?: 'character' | 'background'
    }

    const [project] = await db.select().from(projects).where(eq(projects.token, projectToken))
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const modelConfig: ModelConfig = JSON.parse(project.modelConfig)
    const style = project.style

    const prompt = buildCharacterPrompt(attributes, style)
    const { accessKeyId, secretAccessKey } = await getJimengCredentials()
    const { imageUrl: referenceImageUrl } = await generateImage({
      prompt,
      style: project.style,
      accessKeyId,
      secretAccessKey,
    })

    const [char] = await db.insert(characters).values({
      projectId: project.id,
      name,
      description,
      attributes: JSON.stringify(attributes),
      prompt,
      referenceImageUrl,
      type,
    }).returning()

    return NextResponse.json(char, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
