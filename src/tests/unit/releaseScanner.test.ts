/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from "@jest/globals";

const mockTrackedRepo = { getAll: jest.fn(), updateLastSeenTag: jest.fn() };
const mockSubRepo = { findConfirmedByRepoId: jest.fn() };
const mockGithub = { getLatestRelease: jest.fn() };
const mockEmail = { sendReleaseNotification: jest.fn() };

jest.unstable_mockModule("../../repositories/TrackedRepoRepository.js", () => ({
  TrackedRepoRepository: jest.fn(() => mockTrackedRepo),
}));
jest.unstable_mockModule(
  "../../repositories/SubscriptionRepository.js",
  () => ({
    SubscriptionRepository: jest.fn(() => mockSubRepo),
  }),
);
jest.unstable_mockModule("../../services/githubService.js", () => ({
  GithubService: jest.fn(() => mockGithub),
}));
jest.unstable_mockModule("../../services/emailService.js", () => ({
  EmailService: jest.fn(() => mockEmail),
}));
jest.unstable_mockModule("@sentry/node", () => ({
  startSpan: jest.fn((ctx, cb: any) => cb()),
  captureException: jest.fn(),
}));

const { ReleaseScanner } = await import("../../services/releaseScanner.js");

describe("ReleaseScanner", () => {
  let scanner: any;

  beforeEach(() => {
    jest.clearAllMocks();
    scanner = new ReleaseScanner();
  });

  it("should send emails when a new release is found", async () => {
    mockTrackedRepo.getAll.mockResolvedValue([
      { id: 1, owner_repo: "a/b", last_seen_tag: "v1" },
    ]);

    mockGithub.getLatestRelease.mockResolvedValue("v2");

    mockSubRepo.findConfirmedByRepoId.mockResolvedValue([
      { email: "user@test.com", unsubscribe_token: "unsub1" },
    ]);

    await scanner.scan();

    expect(mockTrackedRepo.updateLastSeenTag).toHaveBeenCalledWith(1, "v2");
    expect(mockEmail.sendReleaseNotification).toHaveBeenCalledWith(
      "user@test.com",
      "a/b",
      "v2",
      "unsub1",
    );
  });

  it("should NOT send emails if the tag has not changed", async () => {
    mockTrackedRepo.getAll.mockResolvedValue([
      { id: 1, owner_repo: "a/b", last_seen_tag: "v1" },
    ]);
    mockGithub.getLatestRelease.mockResolvedValue("v1");

    await scanner.scan();

    expect(mockEmail.sendReleaseNotification).not.toHaveBeenCalled();
  });
});
