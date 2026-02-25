// Base URL: อ่านจาก .env หรือใช้ localhost ตอน dev
const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:4000";

// ─── Token storage ──────────────────────────────────────────────────────────────
export const tokenStorage = {
  get: () => localStorage.getItem("sf_token"),
  set: (token: string) => localStorage.setItem("sf_token", token),
  clear: () => { localStorage.removeItem("sf_token"); localStorage.removeItem("sf_refresh_token"); },
  getRefresh: () => localStorage.getItem("sf_refresh_token"),
  setRefresh: (token: string) => localStorage.setItem("sf_refresh_token", token),
};

// ─── Core fetch wrapper with auto-refresh ──────────────────────────────────────
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    tokenStorage.set(data.token);
    tokenStorage.setRefresh(data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  _retry = false
): Promise<T> {
  const token = tokenStorage.get();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  // Auto-refresh on 401 (expired access token)
  if (res.status === 401 && !_retry && tokenStorage.getRefresh()) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken().finally(() => { isRefreshing = false; });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      return request<T>(path, options, true);
    }
    // Refresh failed — clear tokens (force re-login)
    tokenStorage.clear();
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed: ${res.status}`);
  }

  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (body: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
    referralCode?: string;
  }) => request<{ token: string; refreshToken: string; user: ApiUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; refreshToken: string; user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getMe: () => request<{ user: ApiUser }>("/api/auth/me"),

  getNonce: (address: string) =>
    request<{ nonce: string }>(`/api/auth/nonce/${address}`),

  verifySiwe: (body: { message: string; signature: string }) =>
    request<{ token: string; refreshToken: string; user: ApiUser }>("/api/auth/siwe/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ─── Feed ─────────────────────────────────────────────────────────────────────
export const feedApi = {
  getFeed: (params?: { cursor?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<FeedResponse>(`/api/feed?${qs.toString()}`);
  },

  createPost: (body: { content: string; mediaUrl?: string; mediaType?: string }) =>
    request<{ post: ApiPost }>("/api/feed/posts", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  interact: (postId: string, body: { type: "LIKE" | "COMMENT" | "SHARE" | "BOOKMARK"; commentText?: string }) =>
    request<{ interaction?: object; removed?: boolean; type?: string }>(
      `/api/feed/posts/${postId}/interact`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  deletePost: (postId: string) =>
    request<{ success: boolean }>(`/api/feed/posts/${postId}`, { method: "DELETE" }),
};

// ─── Users ──────────────────────────────────────────────────────────────
export const usersApi = {
  getProfile: (userId: string) =>
    request<{ user: ApiUser & { posts: ApiPost[]; isFollowing: boolean } }>(`/api/users/${userId}`),

  search: (q: string, limit = 20) => {
    const qs = new URLSearchParams({ q, limit: String(limit) });
    return request<{ users: (ApiUser & { isFollowing: boolean })[] }>(`/api/users/search?${qs}`);
  },

  updateProfile: (body: { displayName?: string; bio?: string; avatarUrl?: string }) =>
    request<{ user: ApiUser }>("/api/users/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>("/api/users/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  linkWallet: (walletAddress: string) =>
    request<{ user: ApiUser; message: string }>("/api/users/link-wallet", {
      method: "POST",
      body: JSON.stringify({ walletAddress }),
    }),

  toggleFollow: (userId: string) =>
    request<{ following: boolean; message: string }>(`/api/users/${userId}/follow`, {
      method: "POST",
    }),
};

// ─── Rewards ──────────────────────────────────────────────────────────────────
export const rewardsApi = {
  getBalance: () =>
    request<{
      balance: string;
      totalEarned: string;
      totalWithdrawn: string;
      pendingRewards: number;
    }>("/api/rewards/balance"),

  claimReward: (body: { postId: string; type: "VIEW" | "ENGAGEMENT" }) =>
    request<{ success: boolean; reward: { type: string; amount: string; postId: string } }>(
      "/api/rewards/claim",
      { method: "POST", body: JSON.stringify(body) }
    ),

  getHistory: (params?: { type?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<{ rewards: ApiReward[]; hasMore: boolean }>(`/api/rewards/history?${qs.toString()}`);
  },
};

// ─── Ads ──────────────────────────────────────────────────────────────────────
export const adsApi = {
  getPackages: () => request<{ packages: ApiAdPackage[] }>("/api/ads/packages"),

  createCampaign: (body: {
    adPackageId: string;
    campaignTitle: string;
    campaignDescription?: string;
    targetUrl?: string;
    content?: string;
  }) =>
    request<{ success: boolean; campaign: any; message: string }>(
      "/api/ads/campaigns",
      { method: "POST", body: JSON.stringify(body) }
    ),

  createCheckout: (body: {
    adPackageId: string;
    campaignTitle: string;
    campaignDescription?: string;
    targetUrl?: string;
  }) =>
    request<{ checkoutUrl: string; campaignId: string; sessionId: string }>(
      "/api/ads/checkout",
      { method: "POST", body: JSON.stringify(body) }
    ),

  getMyCampaigns: () =>
    request<{ campaigns: any[] }>("/api/ads/campaigns"),
};

// ─── API Types ────────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  email?: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  role: "USER" | "MERCHANT" | "ADMIN";
  walletAddress?: string;
  referralCode: string;
  offChainBalance?: string;
  totalEarned?: string;
  isVerified?: boolean;
  _count?: { followers: number; following: number; posts: number };
}

export interface ApiPost {
  id: string;
  content: string;
  type: "ORGANIC" | "SPONSORED";
  mediaUrl?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  rewardPerView?: string;
  rewardPerEngagement?: string;
  createdAt: string;
  isSponsored: boolean;
  rewardClaimed: boolean;
  userInteractions: string[];
  author: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    isVerified: boolean;
  };
  adCampaign?: {
    id: string;
    title: string;
    targetUrl?: string;
  };
}

export interface FeedResponse {
  feed: ApiPost[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiReward {
  id: string;
  type: string;
  amount: string;
  description?: string;
  status: string;
  createdAt: string;
  relatedPost?: { id: string; content: string };
  relatedCampaign?: { id: string; title: string };
}

export interface ApiAdPackage {
  id: string;
  name: string;
  description?: string;
  priceFiat: string;
  priceCrypto: string;
  impressions: number;
  durationDays: number;
  totalRewardPool: string;
}
