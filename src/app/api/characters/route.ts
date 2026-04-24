import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characters, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { buildReferencePrompt } from '@/lib/ai/prompt-builder'
import { generateImage } from '@/lib/jimeng/client'
import { getJimengCredentials } from '@/lib/jimeng/credentials'
import { serializeCharacter } from '@/lib/db/serializers'
import type { CharacterAttributes, CharacterForm } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectToken, name, description, attributes, type = 'character', identityLock = '', defaultForm = 'default', formPrompts = {} } = body as {
      projectToken: string
      name: string
      description: string
      attributes: CharacterAttributes
      type?: 'character' | 'background'
      identityLock?: string
      defaultForm?: CharacterForm
      formPrompts?: Partial<Record<CharacterForm, string>>
    }

    const [project] = await db.select().from(projects).where(eq(projects.token, projectToken))
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const style = project.style

    const prompt = buildReferencePrompt({
      type,
      attributes,
      style,
      name,
      description,
      identityLock,
      defaultForm,
      formPrompts,
    })
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
      identityLock,
      defaultForm,
      humanFormPrompt: formPrompts.human ?? '',
      animalFormPrompt: formPrompts.animal ?? '',
      transformingFormPrompt: formPrompts.transforming ?? '',
    }).returning()

    return NextResponse.json(serializeCharacter(char), { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
