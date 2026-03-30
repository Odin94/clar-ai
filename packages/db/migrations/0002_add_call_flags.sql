CREATE TABLE IF NOT EXISTS `call_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`call_id` text NOT NULL UNIQUE REFERENCES `calls`(`id`),
	`positive` integer NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
