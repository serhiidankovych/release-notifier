/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from "@jest/globals";

const mockRepoRecord = {
  id: 1,
  owner_repo: "owner/repo",
  last_seen_tag: "v1.0.0",
};
const mockSubscriptionRecord = { id: 10, email: "test@test.com", repo_id: 1 };

const txMock = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([mockRepoRecord]),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([mockRepoRecord]),
};

jest.unstable_mockModule("../../db/db.js", () => ({
  db: {
    transaction: jest.fn(async (cb: any) => await cb(txMock)),
  },
}));

jest.unstable_mockModule("uuid", () => ({
  v4: jest.fn(() => "mock-uuid"),
}));

const mockGithubService = {
  getRepository: jest.fn(),
  getLatestRelease: jest.fn(),
};
const mockEmailService = {
  sendConfirmationEmail: jest.fn(),
};
const mockRepo = {
  findByConfirmToken: jest.fn(),
  confirm: jest.fn(),
  findByUnsubscribeToken: jest.fn(),
  remove: jest.fn(),
  findByEmail: jest.fn(),
};

jest.unstable_mockModule(
  "../../repositories/SubscriptionRepository.js",
  () => ({
    SubscriptionRepository: jest.fn(() => mockRepo),
  }),
);
jest.unstable_mockModule("../../services/githubService.js", () => ({
  GithubService: jest.fn(() => mockGithubService),
}));
jest.unstable_mockModule("../../services/emailService.js", () => ({
  EmailService: jest.fn(() => mockEmailService),
}));

const { SubscriptionService } =
  await import("../../services/subscriptionService.js");
const { ConflictError, NotFoundError } = await import("../../types/errors.js");

describe("SubscriptionService", () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionService();

    txMock.limit.mockResolvedValue([mockRepoRecord]);
  });

  describe("subscribe", () => {
    it("should handle new subscriptions successfully", async () => {
      mockGithubService.getRepository.mockResolvedValue({ id: 123 });

      txMock.limit
        .mockResolvedValueOnce([mockRepoRecord])
        .mockResolvedValueOnce([]);

      await service.subscribe({ email: "test@test.com", repo: "owner/repo" });

      expect(mockGithubService.getRepository).toHaveBeenCalledWith(
        "owner/repo",
      );
      expect(mockEmailService.sendConfirmationEmail).toHaveBeenCalledWith(
        "test@test.com",
        "owner/repo",
        "mock-uuid",
      );
    });

    it("should throw ConflictError if already subscribed", async () => {
      mockGithubService.getRepository.mockResolvedValue({ id: 123 });

      txMock.limit
        .mockResolvedValueOnce([mockRepoRecord])
        .mockResolvedValueOnce([mockSubscriptionRecord]);

      await expect(
        service.subscribe({ email: "test@test.com", repo: "owner/repo" }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("confirm / unsubscribe", () => {
    it("should confirm a subscription if token is valid", async () => {
      mockRepo.findByConfirmToken.mockResolvedValue({ id: 10 });

      await service.confirm("valid-token");

      expect(mockRepo.confirm).toHaveBeenCalledWith(10);
    });

    it("should throw NotFoundError if confirm token not found", async () => {
      mockRepo.findByConfirmToken.mockResolvedValue(null);

      await expect(service.confirm("bad-token")).rejects.toThrow(NotFoundError);
    });

    it("should remove subscription on unsubscribe", async () => {
      mockRepo.findByUnsubscribeToken.mockResolvedValue({ id: 10 });

      await service.unsubscribe("unsub-token");

      expect(mockRepo.remove).toHaveBeenCalledWith(10);
    });
  });
});
