CREATE TABLE `hotels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`city` text NOT NULL,
	`address` text,
	`phone` text,
	`email` text,
	`description` text,
	`reception_hours` text,
	`check_in_time` text,
	`check_out_time` text,
	`total_rooms` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hotels_slug_unique` ON `hotels` (`slug`);
--> statement-breakpoint
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
CREATE TABLE `calls` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`status` text,
	`start_time` integer NOT NULL,
	`duration` integer,
	`summary` text,
	`call_successful` text,
	`message_count` integer,
	`cost_credits` real,
	`termination_reason` text,
	`synced_at` integer,
	`hotel_mentioned` text,
	`complaint_category` text
);
--> statement-breakpoint
CREATE TABLE `call_transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`call_id` text NOT NULL,
	`role` text NOT NULL,
	`message` text NOT NULL,
	`time_in_call_secs` real,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`call_id`) REFERENCES `calls`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `call_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`call_id` text NOT NULL,
	`rating` integer,
	`comment` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`call_id`) REFERENCES `calls`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `call_feedback_call_id_unique` ON `call_feedback` (`call_id`);
--> statement-breakpoint
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
CREATE UNIQUE INDEX `call_flags_call_id_unique` ON `call_flags` (`call_id`);
