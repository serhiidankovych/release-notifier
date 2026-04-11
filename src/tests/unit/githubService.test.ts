/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from "@jest/globals";

const mockGet = jest.fn() as jest.MockedFunction<any>;

jest.unstable_mockModule("axios", () => ({
  default: {
    create: jest.fn(() => ({
      get: mockGet,
      defaults: { headers: {} },
    })),
  },
}));

jest.unstable_mockModule("bottleneck", () => ({
  default: jest.fn().mockImplementation(() => ({
    schedule: (fn: any) => fn(),
  })),
}));

jest.unstable_mockModule("p-retry", () => ({
  default: jest.fn().mockImplementation((fn: any) => fn(1)),
  AbortError: class extends Error {
    constructor(public originalError: Error) {
      super(originalError.message);
    }
  },
}));

jest.unstable_mockModule("../../config/unifiedConfig.js", () => ({
  config: {
    github: { token: "fake-token" },
  },
}));

const { GithubService } = await import("../../services/githubService.js");
const { NotFoundError } = await import("../../types/errors.js");

describe("GithubService", () => {
  let githubService: any;

  beforeEach(() => {
    githubService = new GithubService();
    jest.clearAllMocks();
  });

  describe("getRepository", () => {
    it("should return repository data on success", async () => {
      const mockRepo = { full_name: "owner/repo", id: 123 };

      mockGet.mockResolvedValueOnce({ data: mockRepo });

      const result = await githubService.getRepository("owner/repo");

      expect(result).toEqual(mockRepo);
      expect(mockGet).toHaveBeenCalledWith("/repos/owner/repo");
    });

    it("should throw NotFoundError when GitHub returns 404", async () => {
      mockGet.mockRejectedValueOnce({
        response: { status: 404 },
      });

      await expect(githubService.getRepository("owner/repo")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("getLatestRelease", () => {
    it("should return the tag name of the latest release", async () => {
      mockGet.mockResolvedValueOnce({
        data: { tag_name: "v1.2.3" },
      });

      const result = await githubService.getLatestRelease("owner/repo");

      expect(result).toBe("v1.2.3");
      expect(mockGet).toHaveBeenCalledWith("/repos/owner/repo/releases/latest");
    });

    it("should fallback to tags if releases/latest returns 404", async () => {
      mockGet.mockRejectedValueOnce({
        response: { status: 404 },
      });

      mockGet.mockResolvedValueOnce({
        data: [{ name: "v1.2.0-tag" }],
      });

      const result = await githubService.getLatestRelease("owner/repo");

      expect(result).toBe("v1.2.0-tag");
      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockGet).toHaveBeenLastCalledWith("/repos/owner/repo/tags");
    });

    it("should return null if both releases and tags are empty", async () => {
      mockGet.mockRejectedValueOnce({ response: { status: 404 } });

      mockGet.mockResolvedValueOnce({ data: [] });

      const result = await githubService.getLatestRelease("owner/repo");

      expect(result).toBeNull();
    });
  });
});
