import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jimengConfig } from '@/lib/db/schema'

export async function GET() {
  try {
    const [row] = await db.select().from(jimengConfig)
    if (!row) return NextResponse.json(null)
    return NextResponse.json({
      id: row.id,
      accessKeyId: row.accessKeyId,
      secretAccessKeyMasked: row.secretAccessKey.slice(0, 4) + '****',
      updatedAt: row.updatedAt,
    })
  } catch (e) {
    console.error('[jimeng-config GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { accessKeyId, secretAccessKey } = body as { accessKeyId?: string; secretAccessKey?: string }

    if (!accessKeyId?.trim()) return NextResponse.json({ error: 'accessKeyId is required' }, { status: 400 })
    if (!secretAccessKey?.trim()) return NextResponse.json({ error: 'secretAccessKey is required' }, { status: 400 })

    const [existing] = await db.select().from(jimengConfig)
    if (existing) {
      await db.update(jimengConfig).set({
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        updatedAt: Date.now(),
      })
    } else {
      await db.insert(jimengConfig).values({
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        updatedAt: Date.now(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[jimeng-config PUT]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
