CREATE TABLE `client_visits` (
	`client_id` text PRIMARY KEY NOT NULL,
	`last_viewed_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entity_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`label` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entity_tags_client_idx` ON `entity_tags` (`client_id`);--> statement-breakpoint
CREATE INDEX `entity_tags_entity_idx` ON `entity_tags` (`entity_type`,`entity_id`);--> statement-breakpoint
ALTER TABLE `clients` ADD `archived` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `pinned` integer DEFAULT false NOT NULL;