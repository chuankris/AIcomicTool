CREATE TABLE `characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`attributes` text DEFAULT '{}' NOT NULL,
	`prompt` text DEFAULT '' NOT NULL,
	`reference_image_url` text,
	`type` text DEFAULT 'character' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `panels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`index` integer NOT NULL,
	`scene_desc` text NOT NULL,
	`dialogue` text DEFAULT '' NOT NULL,
	`prompt` text NOT NULL,
	`image_url` text,
	`audio_url` text,
	`review_feedback` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`script` text NOT NULL,
	`style` text NOT NULL,
	`model_config` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`video_url` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_token_unique` ON `projects` (`token`);