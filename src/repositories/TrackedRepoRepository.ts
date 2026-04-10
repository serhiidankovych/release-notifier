import { eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { trackedRepos, TrackedRepoRecord } from "../db/schema.js";

export class TrackedRepoRepository {
  async getAll(): Promise<TrackedRepoRecord[]> {
    return db.select().from(trackedRepos);
  }

  async findByOwnerRepo(ownerRepo: string): Promise<TrackedRepoRecord | null> {
    const rows = await db
      .select()
      .from(trackedRepos)
      .where(eq(trackedRepos.owner_repo, ownerRepo))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(
    ownerRepo: string,
    lastSeenTag: string | null,
  ): Promise<TrackedRepoRecord> {
    const rows = await db
      .insert(trackedRepos)
      .values({ owner_repo: ownerRepo, last_seen_tag: lastSeenTag })
      .returning();
    return rows[0];
  }

  async updateLastSeenTag(id: number, tag: string): Promise<void> {
    await db
      .update(trackedRepos)
      .set({ last_seen_tag: tag })
      .where(eq(trackedRepos.id, id));
  }
}
