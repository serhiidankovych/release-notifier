export interface Subscription {
  id: number;
  email: string;
  repoId: number;
  confirmToken: string;
  unsubscribeToken: string;
  confirmedAt: Date | null;
  createdAt: Date;
}

export interface TrackedRepo {
  id: number;
  ownerRepo: string;
  lastSeenTag: string | null;
  createdAt: Date;
}

export interface SubscriptionView {
  repo: string;
  email: string;
  confirmedAt: Date | null;
}
