import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const body = await req.json()
    const { name, provider, baseURL, model, apiKey } = body as {
      name?: string; provider?: string; baseURL?: string; model?: string; apiKey?: string
    }

    const updates: Record<string, unknown> = {}
    if (name?.trim()) updates.name = name.trim()
    if (provider?.trim()) updates.provider = provider.trim()
    if (baseURL !== undefined) updates.baseURL = baseURL
    if (model?.trim()) updates.model = model.trim()
    if (apiKey?.trim()) updates.apiKey = apiKey.trim()

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const updated = await db.update(settings).set(updates).where(eq(settings.id, numId)).returning()
    if (!updated.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated[0])
  } catch (e) {
    console.error('[settings PATCH]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const deleted = await db.delete(settings).where(eq(settings.id, numId)).returning()
    if (!deleted.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[settings DELETE]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
