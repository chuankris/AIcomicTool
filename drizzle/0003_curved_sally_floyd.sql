ALTER TABLE `characters` ADD `identity_lock` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `default_form` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `form_prompts` text DEFAULT '{}' NOT NULL;