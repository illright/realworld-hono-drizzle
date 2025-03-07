CREATE TABLE `article_favorite` (
	`articleSlug` text NOT NULL,
	`userId` integer NOT NULL,
	PRIMARY KEY(`articleSlug`, `userId`),
	FOREIGN KEY (`articleSlug`) REFERENCES `articles`(`slug`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `article_tag` (
	`articleSlug` text NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`articleSlug`, `tag`),
	FOREIGN KEY (`articleSlug`) REFERENCES `articles`(`slug`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`tag`) REFERENCES `tags`(`tag`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`body` text NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`authorId` integer NOT NULL,
	FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`body` text NOT NULL,
	`articleSlug` text NOT NULL,
	`authorId` integer NOT NULL,
	FOREIGN KEY (`articleSlug`) REFERENCES `articles`(`slug`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`tag` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_tag_unique` ON `tags` (`tag`);--> statement-breakpoint
CREATE TABLE `user_follow` (
	`followerId` integer NOT NULL,
	`followedId` integer NOT NULL,
	PRIMARY KEY(`followerId`, `followedId`),
	FOREIGN KEY (`followerId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`followedId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`bio` text,
	`image` text,
	`passwordHash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);