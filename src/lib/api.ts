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

  sendVerification: () =>
    request<{ success: boolean; message: string }>("/api/auth/send-verification", { method: "POST" }),

  verifyEmail: (token: string) =>
    request<{ success: boolean; message: string }>(`/api/auth/verify-email?token=${token}`),

  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ success: boolean; message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
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

  withdraw: (body: { amount: number; walletAddress?: string }) =>
    request<{ success: boolean; status: string; txHash: string | null; explorerUrl: string | null; amount: number; walletAddress: string; message: string }>(
      "/api/rewards/withdraw",
      { method: "POST", body: JSON.stringify(body) }
    ),

  getTransactions: (params?: { cursor?: string; limit?: number; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.type) qs.set("type", params.type);
    return request<{ transactions: ApiTransaction[]; nextCursor: string | null; hasMore: boolean }>(`/api/rewards/transactions?${qs.toString()}`);
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

// ─── Admin ─────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () =>
    request<any>("/api/admin/stats"),

  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.role) qs.set("role", params.role);
    return request<{ users: any[]; total: number; page: number; pages: number; limit: number }>(`/api/admin/users?${qs}`);
  },

  updateUserRole: (userId: string, role: string) =>
    request<{ user: any; message: string }>(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  getCampaigns: (params?: { page?: number; limit?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status) qs.set("status", params.status);
    return request<{ campaigns: any[]; total: number; page: number; pages: number; limit: number }>(`/api/admin/campaigns?${qs}`);
  },

  updateCampaignStatus: (campaignId: string, status: string) =>
    request<{ campaign: any; message: string }>(`/api/admin/campaigns/${campaignId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  distributeRewards: () =>
    request<{ success: boolean; processed: number; distributed: number; failed: number; results: any[] }>(
      "/api/admin/rewards/distribute",
      { method: "POST" }
    ),

  airdropTokens: (userIds: string[], amount: number, description?: string) =>
    request<{ success: boolean; airdropped: number; amountEach: number; totalDistributed: number }>(
      "/api/admin/rewards/airdrop",
      { method: "POST", body: JSON.stringify({ userIds, amount, description }) }
    ),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  getList: (params?: { unreadOnly?: boolean; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.unreadOnly) qs.set("unreadOnly", "true");
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<{ notifications: ApiNotification[]; unreadCount: number; nextCursor: string | null; hasMore: boolean }>(`/api/notifications?${qs}`);
  },
  markRead: (id: string) =>
    request<{ success: boolean; unreadCount: number }>(`/api/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () =>
    request<{ success: boolean; unreadCount: number }>("/api/notifications/read-all", { method: "POST" }),
  deleteOne: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}`, { method: "DELETE" }),
};

// ─── API Types ────────────────────────────────────────────────────────────────
export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedPostId?: string;
  relatedUserId?: string;
  relatedTxId?: string;
  createdAt: string;
}

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

export interface ApiTransaction {
  id: string;
  type: string;
  amount: string;
  description?: string;
  status: string;
  onChainTxHash?: string;
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
