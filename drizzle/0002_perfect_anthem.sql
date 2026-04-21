ALTER TABLE `panels` ADD `image_model` text DEFAULT 'jimeng' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `current_step` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `furthest_step` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `shots` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `image_model` text DEFAULT 'jimeng' NOT NULL;