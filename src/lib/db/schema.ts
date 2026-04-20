import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  name: text('name'),
  script: text('script').notNull().default(''),
  style: text('style').notNull().default('日漫'),
  modelConfig: text('model_config').notNull().default('{}'),
  status: text('status').notNull().default('draft'),
  videoUrl: text('video_url'),
  createdAt: integer('created_at').notNull(),
})

export const characters = sqliteTable('characters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  attributes: text('attributes').notNull().default('{}'),
  prompt: text('prompt').notNull().default(''),
  referenceImageUrl: text('reference_image_url'),
  type: text('type').notNull().default('character'),
})

export const panels = sqliteTable('panels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull(),
  index: integer('index').notNull(),
  sceneDesc: text('scene_desc').notNull(),
  dialogue: text('dialogue').notNull().default(''),
  prompt: text('prompt').notNull(),
  imageUrl: text('image_url'),
  audioUrl: text('audio_url'),
  reviewFeedback: text('review_feedback'),
  revision: integer('revision').notNull().default(0),
  status: text('status').notNull().default('pending'),
})

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  baseURL: text('base_url').notNull(),
  model: text('model').notNull(),
  apiKey: text('api_key').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const jimengConfig = sqliteTable('jimeng_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accessKeyId: text('access_key_id').notNull(),
  secretAccessKey: text('secret_access_key').notNull(),
  updatedAt: integer('updated_at').notNull(),
})
