import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

function createTestDb() {
  const sqlite = new Database(':memory:')
  sqlite.pragma('journal_mode = WAL')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: './drizzle' })
  return db
}

describe('database schema', () => {
  it('inserts and retrieves a project', () => {
    const db = createTestDb()
    db.insert(schema.projects).values({
      token: 'test-token',
      script: 'test script',
      style: '日漫',
      modelConfig: '{}',
      status: 'pending',
      createdAt: Date.now(),
    }).run()
    const rows = db.select().from(schema.projects).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].token).toBe('test-token')
  })

  it('inserts a character linked to a project', () => {
    const db = createTestDb()
    db.insert(schema.projects).values({
      token: 'tk-2',
      script: 's',
      style: '日漫',
      modelConfig: '{}',
      status: 'pending',
      createdAt: Date.now(),
    }).run()
    const [project] = db.select().from(schema.projects).all()
    db.insert(schema.characters).values({
      projectId: project.id,
      name: '小明',
      description: '黑发男生',
      prompt: '【黑色直发】男生',
      type: 'character',
    }).run()
    const chars = db.select().from(schema.characters).all()
    expect(chars[0].name).toBe('小明')
  })
})
