import {
  pgTable,
  serial,
  varchar,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const trackedRepos = pgTable("tracked_repos", {
  id: serial("id").primaryKey(),
  owner_repo: varchar("owner_repo", { length: 255 }).notNull().unique(),
  last_seen_tag: varchar("last_seen_tag", { length: 255 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    repo_id: serial("repo_id")
      .notNull()
      .references(() => trackedRepos.id, { onDelete: "cascade" }),
    confirm_token: varchar("confirm_token", { length: 36 }).notNull().unique(),
    unsubscribe_token: varchar("unsubscribe_token", { length: 36 })
      .notNull()
      .unique(),
    confirmed_at: timestamp("confirmed_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("unique_email_repo").on(t.email, t.repo_id)],
);

export type TrackedRepoRecord = typeof trackedRepos.$inferSelect;
export type NewTrackedRepo = typeof trackedRepos.$inferInsert;
export type SubscriptionRecord = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export { trackedRepos as repositories };
