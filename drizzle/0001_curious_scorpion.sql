CREATE TABLE `jimeng_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`access_key_id` text NOT NULL,
	`secret_access_key` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`base_url` text NOT NULL,
	`model` text NOT NULL,
	`api_key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`name` text,
	`script` text DEFAULT '' NOT NULL,
	`style` text DEFAULT '日漫' NOT NULL,
	`model_config` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`video_url` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "token", "name", "script", "style", "model_config", "status", "video_url", "created_at") SELECT "id", "token", NULL, "script", "style", "model_config", "status", "video_url", "created_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `projects_token_unique` ON `projects` (`token`);