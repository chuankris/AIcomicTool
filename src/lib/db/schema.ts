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
  currentStep: integer('current_step').notNull().default(0),
  furthestStep: integer('furthest_step').notNull().default(0),
  imageModel: text('image_model').notNull().default('jimeng'),
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
  identityLock: text('identity_lock').notNull().default(''),
  defaultForm: text('default_form').notNull().default('default'),
  humanFormPrompt: text('human_form_prompt').notNull().default(''),
  animalFormPrompt: text('animal_form_prompt').notNull().default(''),
  transformingFormPrompt: text('transforming_form_prompt').notNull().default(''),
})

export const storyboardShots = sqliteTable('storyboard_shots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull(),
  index: integer('index').notNull(),
  sceneDesc: text('scene_desc').notNull().default(''),
  dialogue: text('dialogue').notNull().default(''),
  emotion: text('emotion').notNull().default(''),
  composition: text('composition').notNull().default(''),
  promptOverride: text('prompt_override'),
  durationSec: integer('duration_sec').notNull().default(3),
  subtitlePosition: text('subtitle_position').notNull().default('bottom'),
  localFeedback: text('local_feedback').notNull().default(''),
  aspectRatio: text('aspect_ratio').notNull().default('9:16'),
  resolutionWidth: integer('resolution_width'),
  resolutionHeight: integer('resolution_height'),
  safeAreaTop: integer('safe_area_top'),
  safeAreaBottom: integer('safe_area_bottom'),
  safeAreaLeft: integer('safe_area_left'),
  safeAreaRight: integer('safe_area_right'),
  keyProps: text('key_props').notNull().default('[]'),
  backgroundId: integer('background_id'),
  backgroundStrength: integer('background_strength'),
})

export const shotCharacterRefs = sqliteTable('shot_character_refs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull(),
  shotId: integer('shot_id').notNull(),
  characterId: integer('character_id').notNull(),
  strength: integer('strength'),
})

export const shotCharacterNames = sqliteTable('shot_character_names', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull(),
  shotId: integer('shot_id').notNull(),
  name: text('name').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
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
  imageModel: text('image_model').notNull().default('jimeng'),
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
