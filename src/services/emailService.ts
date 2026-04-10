import nodemailer from "nodemailer";
import pRetry from "p-retry";
import * as Sentry from "@sentry/node";
import { config } from "../config/unifiedConfig.js";
import { EmailDeliveryError } from "../types/errors.js";

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: config.email.user
        ? { user: config.email.user, pass: config.email.pass }
        : undefined,
    });
  }

  async sendConfirmationEmail(
    email: string,
    repo: string,
    confirmToken: string,
  ): Promise<void> {
    const confirmUrl = `${config.server.baseUrl}/api/confirm/${confirmToken}`;
    await this.sendWithRetry(
      {
        from: config.email.from,
        to: email,
        subject: `Confirm your subscription to ${repo} releases`,
        html: `<p>Please confirm your subscription to <b>${escapeHtml(repo)}</b> by clicking <a href="${confirmUrl}">here</a>.</p>`,
      },
      `sendConfirmationEmail to ${email} for ${repo}`,
    );
  }

  async sendReleaseNotification(
    email: string,
    repo: string,
    version: string,
    unsubscribeToken: string,
  ): Promise<void> {
    const unsubUrl = `${config.server.baseUrl}/api/unsubscribe/${unsubscribeToken}`;
    try {
      await this.sendWithRetry(
        {
          from: config.email.from,
          to: email,
          subject: `New release for ${repo}: ${version}`,
          html: `
            <p>A new version <b>${escapeHtml(version)}</b> has been released for <b>${escapeHtml(repo)}</b>.</p>
            <p><a href="${unsubUrl}">Unsubscribe</a></p>
          `,
        },
        `sendReleaseNotification to ${email} for ${repo}@${version}`,
      );
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: "sendReleaseNotification", repo, version },
      });
      console.error(
        `Failed to send release notification to ${email} for ${repo}@${version}:`,
        error,
      );
    }
  }

  private async sendWithRetry(
    mailOptions: nodemailer.SendMailOptions,
    operationLabel: string,
  ): Promise<void> {
    try {
      await pRetry(() => this.transporter.sendMail(mailOptions), {
        retries: config.email.maxRetries,
        onFailedAttempt: (error) => {
          console.warn(
            `${operationLabel} — attempt ${error.attemptNumber} failed: ${error}`,
          );
        },
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: operationLabel } });
      throw new EmailDeliveryError(
        `Failed to send email after ${config.email.maxRetries} attempts: ${operationLabel}`,
      );
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
