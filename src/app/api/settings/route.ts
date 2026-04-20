import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import type { ModelSetting } from '@/types'

export async function GET() {
  try {
    const rows = await db.select().from(settings).orderBy(desc(settings.createdAt))
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[settings GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, provider, baseURL, model, apiKey } = body as Partial<ModelSetting>

    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    if (!provider?.trim()) return NextResponse.json({ error: 'provider is required' }, { status: 400 })
    if (!apiKey?.trim()) return NextResponse.json({ error: 'apiKey is required' }, { status: 400 })
    if (!model?.trim()) return NextResponse.json({ error: 'model is required' }, { status: 400 })
    if (!baseURL?.trim()) return NextResponse.json({ error: 'baseURL is required' }, { status: 400 })

    const [row] = await db.insert(settings).values({
      name: name.trim(),
      provider,
      baseURL,
      model,
      apiKey,
      createdAt: Date.now(),
    }).returning()

    return NextResponse.json(row, { status: 201 })
  } catch (e) {
    console.error('[settings POST]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
