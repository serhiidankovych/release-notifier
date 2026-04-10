import { v4 as uuidv4 } from "uuid";
import { db } from "../db/db.js";
import { SubscriptionRepository } from "../repositories/SubscriptionRepository.js";
import { GithubService } from "./githubService.js";
import { EmailService } from "./emailService.js";
import { ConflictError, NotFoundError } from "../types/errors.js";
import { SubscribeRequestDTO } from "../validators/subscriptionSchemas.js";
import { SubscriptionView } from "../types/subscription.js";
import { trackedRepos, subscriptions } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export class SubscriptionService {
  constructor(
    private subscriptionRepo = new SubscriptionRepository(),

    private githubService = new GithubService(),
    private emailService = new EmailService(),
  ) {}

  async subscribe(data: SubscribeRequestDTO): Promise<void> {
    const email = data.email.toLowerCase().trim();
    const repo = data.repo.trim();

    await this.githubService.getRepository(repo);

    await db.transaction(async (tx) => {
      const repoRows = await tx
        .select()
        .from(trackedRepos)
        .where(eq(trackedRepos.owner_repo, repo))
        .limit(1);

      let repoRecord = repoRows[0];

      if (!repoRecord) {
        const latestRelease = await this.githubService.getLatestRelease(repo);
        const inserted = await tx
          .insert(trackedRepos)
          .values({ owner_repo: repo, last_seen_tag: latestRelease })
          .returning();
        repoRecord = inserted[0];
      }

      const existingSub = await tx
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.email, email),
            eq(subscriptions.repo_id, repoRecord.id),
          ),
        )
        .limit(1);

      if (existingSub.length > 0) {
        throw new ConflictError("Email already subscribed to this repository");
      }

      const confirmToken = uuidv4();
      const unsubscribeToken = uuidv4();

      await tx.insert(subscriptions).values({
        email,
        repo_id: repoRecord.id,
        confirm_token: confirmToken,
        unsubscribe_token: unsubscribeToken,
      });

      await this.emailService.sendConfirmationEmail(email, repo, confirmToken);
    });
  }

  async confirm(token: string): Promise<void> {
    const sub = await this.subscriptionRepo.findByConfirmToken(token);
    if (!sub)
      throw new NotFoundError("Confirmation token not found or already used");
    await this.subscriptionRepo.confirm(sub.id);
  }

  async unsubscribe(token: string): Promise<void> {
    const sub = await this.subscriptionRepo.findByUnsubscribeToken(token);
    if (!sub) throw new NotFoundError("Unsubscribe token not found");
    await this.subscriptionRepo.remove(sub.id);
  }

  async getSubscriptions(email: string): Promise<SubscriptionView[]> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.subscriptionRepo.findByEmail(normalizedEmail);
  }
}
