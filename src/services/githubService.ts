import axios, { AxiosError } from "axios";
import Bottleneck from "bottleneck";
import pRetry, { AbortError } from "p-retry";
import { config } from "../config/unifiedConfig.js";
import { NotFoundError } from "../types/errors.js";

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  default_branch: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  html_url: string;
}

export interface GitHubTag {
  name: string;
}

const limiter = new Bottleneck({ minTime: 1000 });

const githubApi = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Accept: "application/vnd.github+json",
    ...(config.github.token
      ? { Authorization: `Bearer ${config.github.token}` }
      : {}),
  },
});

function retryAfterMs(error: AxiosError): number {
  const retryAfter = error.response?.headers?.["retry-after"];
  if (retryAfter) {
    const seconds = parseInt(String(retryAfter), 10);
    if (!isNaN(seconds)) return seconds * 1000;
  }
  return 60_000;
}

async function githubGet<T>(path: string): Promise<T> {
  return limiter.schedule(() =>
    pRetry(
      async (attemptNumber) => {
        console.log(`GET ${path} (attempt ${attemptNumber})`);
        try {
          const response = await githubApi.get<T>(path);
          return response.data;
        } catch (err) {
          const error = err as AxiosError;
          const status = error.response?.status;

          if (status === 404) {
            throw new AbortError(
              new NotFoundError("Repository not found on GitHub"),
            );
          }

          if (status === 429) {
            const waitMs = retryAfterMs(error);

            await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
            throw error;
          }

          throw error;
        }
      },
      {
        retries: 3,
        onFailedAttempt: (error) => {
          const status = (error.error as AxiosError | undefined)?.response
            ?.status;
          console.warn(
            `GitHub API call to ${path} failed (attempt ${error.attemptNumber}/${error.retriesLeft + error.attemptNumber}). Status: ${status ?? "network error"}`,
          );
        },
      },
    ),
  );
}

export class GithubService {
  async getRepository(ownerRepo: string): Promise<GitHubRepo> {
    return githubGet<GitHubRepo>(`/repos/${ownerRepo}`);
  }

  async getLatestRelease(ownerRepo: string): Promise<string | null> {
    try {
      const release = await githubGet<GitHubRelease>(
        `/repos/${ownerRepo}/releases/latest`,
      );
      return release.tag_name;
    } catch (err) {
      if (err instanceof NotFoundError) {
        try {
          const tags = await githubGet<GitHubTag[]>(`/repos/${ownerRepo}/tags`);
          return tags.length > 0 ? tags[0].name : null;
        } catch {
          return null;
        }
      }
      throw err;
    }
  }
}
