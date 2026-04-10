import { eq, and } from "drizzle-orm";
import { db } from "../db/db.js";
import {
  subscriptions,
  trackedRepos,
  SubscriptionRecord,
} from "../db/schema.js";
import { SubscriptionView } from "../types/subscription.js";

export class SubscriptionRepository {
  async findByEmailAndRepoId(
    email: string,
    repoId: number,
  ): Promise<SubscriptionRecord | null> {
    const rows = await db
      .select()
      .from(subscriptions)
      .where(
        and(eq(subscriptions.email, email), eq(subscriptions.repo_id, repoId)),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findByConfirmToken(token: string): Promise<SubscriptionRecord | null> {
    const rows = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.confirm_token, token))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByUnsubscribeToken(
    token: string,
  ): Promise<SubscriptionRecord | null> {
    const rows = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.unsubscribe_token, token))
      .limit(1);
    return rows[0] ?? null;
  }

  async findConfirmedByRepoId(repoId: number): Promise<SubscriptionRecord[]> {
    return db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.repo_id, repoId)))
      .then((rows) => rows.filter((r) => r.confirmed_at !== null));
  }

  async findByEmail(email: string): Promise<SubscriptionView[]> {
    const rows = await db
      .select({
        repo: trackedRepos.owner_repo,
        email: subscriptions.email,
        confirmedAt: subscriptions.confirmed_at,
      })
      .from(subscriptions)
      .innerJoin(trackedRepos, eq(subscriptions.repo_id, trackedRepos.id))
      .where(eq(subscriptions.email, email));

    return rows.map((r) => ({
      repo: r.repo,
      email: r.email,
      confirmedAt: r.confirmedAt,
    }));
  }

  async create(
    email: string,
    repoId: number,
    confirmToken: string,
    unsubscribeToken: string,
  ): Promise<SubscriptionRecord> {
    const rows = await db
      .insert(subscriptions)
      .values({
        email,
        repo_id: repoId,
        confirm_token: confirmToken,
        unsubscribe_token: unsubscribeToken,
      })
      .returning();
    return rows[0];
  }

  async confirm(id: number): Promise<void> {
    await db
      .update(subscriptions)
      .set({ confirmed_at: new Date() })
      .where(eq(subscriptions.id, id));
  }

  async remove(id: number): Promise<void> {
    await db.delete(subscriptions).where(eq(subscriptions.id, id));
  }
}
