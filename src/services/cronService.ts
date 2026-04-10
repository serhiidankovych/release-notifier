import cron, { ScheduledTask } from "node-cron";
import * as Sentry from "@sentry/node";
import { ReleaseScanner } from "./releaseScanner.js";
import { config } from "../config/unifiedConfig.js";

export class CronService {
  private task: ScheduledTask | null = null;

  constructor(private scanner = new ReleaseScanner()) {}

  start(): void {
    this.task = cron.schedule(config.github.cronSchedule, async () => {
      await Sentry.startSpan(
        { name: "cron.check-releases", op: "cron" },
        async () => {
          try {
            await this.scanner.scan();
          } catch (error) {
            Sentry.captureException(error, {
              tags: { "cron.job": "check-releases" },
            });
            console.error(
              "Release scanner encountered an unhandled error:",
              error,
            );
          }
        },
      );
    });

    console.log(
      `Release scanner cron started [schedule: ${config.github.cronSchedule}]`,
    );
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log("Release scanner cron stopped");
    }
  }
}
