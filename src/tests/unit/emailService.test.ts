/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from "@jest/globals";

const mockSendMail = jest.fn() as jest.MockedFunction<any>;

jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: jest.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

jest.unstable_mockModule("p-retry", () => ({
  default: jest.fn().mockImplementation((fn: any) => fn()),
}));

jest.unstable_mockModule("@sentry/node", () => ({
  captureException: jest.fn(),
}));

jest.unstable_mockModule("../../config/unifiedConfig.js", () => ({
  config: {
    server: { baseUrl: "http://localhost:3003" },
    email: {
      from: "noreply@test.com",
      host: "smtp.test.com",
      port: 587,
      maxRetries: 2,
    },
  },
}));

const { EmailService } = await import("../../services/emailService.js");
const { EmailDeliveryError } = await import("../../types/errors.js");
const Sentry = await import("@sentry/node");

describe("EmailService", () => {
  let emailService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    emailService = new EmailService();
  });

  describe("sendConfirmationEmail", () => {
    it("should send a confirmation email with the correct URL and escaped HTML", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "123" });

      await emailService.sendConfirmationEmail(
        "user@example.com",
        "owner/repo",
        "mock-uuid-token",
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: expect.stringContaining("owner/repo"),
          html: expect.stringContaining(
            "http://localhost:3003/api/confirm/mock-uuid-token",
          ),
        }),
      );
    });

    it("should escape HTML characters in the repository name", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "123" });

      await emailService.sendConfirmationEmail(
        "user@example.com",
        "<script>alert(1)</script>",
        "token",
      );

      const sentHtml = mockSendMail.mock.calls[0][0].html;
      expect(sentHtml).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
      expect(sentHtml).not.toContain("<script>");
    });
  });

  describe("sendReleaseNotification", () => {
    it("should send a release notification with version and unsubscribe link", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "456" });

      await emailService.sendReleaseNotification(
        "sub@test.com",
        "facebook/react",
        "v18.0.0",
        "unsub-token",
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "sub@test.com",
          subject: "New release for facebook/react: v18.0.0",
          html: expect.stringContaining("v18.0.0"),
        }),
      );

      expect(mockSendMail.mock.calls[0][0].html).toContain(
        "/api/unsubscribe/unsub-token",
      );
    });

    it("should capture exception in Sentry if email sending fails", async () => {
      const error = new Error("SMTP connection failed");
      mockSendMail.mockRejectedValue(error);

      await emailService.sendReleaseNotification(
        "sub@test.com",
        "repo",
        "v1",
        "token",
      );

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(EmailDeliveryError),
        expect.objectContaining({
          tags: expect.objectContaining({
            operation: "sendReleaseNotification",
          }),
        }),
      );
    });
  });

  describe("sendWithRetry (internal logic)", () => {
    it("should throw EmailDeliveryError if all retries fail", async () => {
      mockSendMail.mockRejectedValue(new Error("Persistent failure"));

      await expect(
        emailService.sendConfirmationEmail("test@test.com", "repo", "token"),
      ).rejects.toThrow(EmailDeliveryError);
    });
  });
});
