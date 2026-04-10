CREATE TABLE "tracked_repos" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_repo" varchar(255) NOT NULL,
	"last_seen_tag" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tracked_repos_owner_repo_unique" UNIQUE("owner_repo")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"repo_id" serial NOT NULL,
	"confirm_token" varchar(36) NOT NULL,
	"unsubscribe_token" varchar(36) NOT NULL,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_confirm_token_unique" UNIQUE("confirm_token"),
	CONSTRAINT "subscriptions_unsubscribe_token_unique" UNIQUE("unsubscribe_token"),
	CONSTRAINT "unique_email_repo" UNIQUE("email","repo_id")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_repo_id_tracked_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."tracked_repos"("id") ON DELETE cascade ON UPDATE no action;