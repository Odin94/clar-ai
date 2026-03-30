CREATE TABLE `call_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`call_id` text NOT NULL,
	`positive` integer NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`call_id`) REFERENCES `calls`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `call_flags_call_id_unique` ON `call_flags` (`call_id`);--> statement-breakpoint
CREATE TABLE `knowledge_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`hotel_id` text,
	`topic` text NOT NULL,
	`subtopic` text,
	`content` text NOT NULL,
	`keywords` text,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE `hotel_facilities`;--> statement-breakpoint
DROP TABLE `hotel_policies`;--> statement-breakpoint
DROP TABLE `room_types`;--> statement-breakpoint
ALTER TABLE `hotels` ADD `reception_hours` text;--> statement-breakpoint
ALTER TABLE `hotels` ADD `total_rooms` integer;