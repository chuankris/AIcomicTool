CREATE TABLE `shot_character_refs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`shot_id` integer NOT NULL,
	`character_id` integer NOT NULL,
	`strength` integer
);
--> statement-breakpoint
CREATE TABLE `storyboard_shots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`index` integer NOT NULL,
	`scene_desc` text DEFAULT '' NOT NULL,
	`dialogue` text DEFAULT '' NOT NULL,
	`emotion` text DEFAULT '' NOT NULL,
	`composition` text DEFAULT '' NOT NULL,
	`prompt_override` text,
	`duration_sec` integer DEFAULT 3 NOT NULL,
	`subtitle_position` text DEFAULT 'bottom' NOT NULL,
	`local_feedback` text DEFAULT '' NOT NULL,
	`aspect_ratio` text DEFAULT '9:16' NOT NULL,
	`resolution_width` integer,
	`resolution_height` integer,
	`safe_area_top` integer,
	`safe_area_bottom` integer,
	`safe_area_left` integer,
	`safe_area_right` integer,
	`key_props` text DEFAULT '[]' NOT NULL,
	`background_id` integer,
	`background_strength` integer
);
--> statement-breakpoint
ALTER TABLE `characters` ADD `human_form_prompt` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `animal_form_prompt` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `transforming_form_prompt` text DEFAULT '' NOT NULL;