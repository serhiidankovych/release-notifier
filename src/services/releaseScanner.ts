import PQueue from "p-queue";
import * as Sentry from "@sentry/node";
import { TrackedRepoRepository } from "../repositories/TrackedRepoRepository.js";
import { SubscriptionRepository } from "../repositories/SubscriptionRepository.js";
import { GithubService } from "./githubService.js";
import { EmailService } from "./emailService.js";
import { config } from "../config/unifiedConfig.js";
import { TrackedRepoRecord } from "../db/schema.js";

export class ReleaseScanner {
  private queue: PQueue;

  constructor(
    private trackedRepoRepo = new TrackedRepoRepository(),
    private subscriptionRepo = new SubscriptionRepository(),
    private githubService = new GithubService(),
    private emailService = new EmailService(),
  ) {
    this.queue = new PQueue({ concurrency: config.scanner.concurrency });
  }

  async scan(): Promise<void> {
    const repos = await this.trackedRepoRepo.getAll();

    await Promise.all(
      repos.map((repo) => this.queue.add(() => this.processRepo(repo))),
    );

    await this.queue.onIdle();
  }

  private async processRepo(repo: TrackedRepoRecord): Promise<void> {
    return Sentry.startSpan(
      { name: `scanner.processRepo:${repo.owner_repo}`, op: "scanner.repo" },
      async () => {
        try {
          const latestTag = await this.githubService.getLatestRelease(
            repo.owner_repo,
          );

          if (!latestTag || latestTag === repo.last_seen_tag) {
            return;
          }

          await this.trackedRepoRepo.updateLastSeenTag(repo.id, latestTag);

          const subscribers = await this.subscriptionRepo.findConfirmedByRepoId(
            repo.id,
          );

          await Promise.all(
            subscribers.map((sub) =>
              this.emailService.sendReleaseNotification(
                sub.email,
                repo.owner_repo,
                latestTag,
                sub.unsubscribe_token,
              ),
            ),
          );
        } catch (error) {
          Sentry.captureException(error, {
            tags: { "scanner.repo": repo.owner_repo },
          });
          console.error(`Scanner failed for repo ${repo.owner_repo}:`, error);
        }
      },
    );
  }
}
