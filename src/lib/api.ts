// Base URL: อ่านจาก .env หรือ detect production/dev automatically
const PROD_API = "https://socialfiapp-production.up.railway.app";
const rawEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const BASE_URL = rawEnv || (typeof window !== "undefined" && !window.location.hostname.includes("localhost") ? PROD_API : "http://localhost:4000");

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
    targetInterests?: string[];
    targetLocation?: string;
    targetGender?: string;
    targetAgeMin?: number;
    targetAgeMax?: number;
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

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const subscriptionApi = {
  getTiers: () => request<{ tiers: any[] }>("/api/subscriptions/tiers"),
  getMySubscription: () => request<{ tier: string; subscription: any }>("/api/subscriptions/me"),
  checkout: (tier: string) => request<{ checkoutUrl: string; sessionId: string }>("/api/subscriptions/checkout", { method: "POST", body: JSON.stringify({ tier }) }),
  cancel: () => request<{ success: boolean; message: string }>("/api/subscriptions/cancel", { method: "POST" }),
};

// ─── Paid Services ────────────────────────────────────────────────────────────
export const serviceApi = {
  list: () => request<{ services: any[] }>("/api/services"),
  checkout: (serviceId: string, metadata?: any) => request<{ checkoutUrl: string; purchaseId: string }>(`/api/services/${serviceId}/checkout`, { method: "POST", body: JSON.stringify({ metadata }) }),
  myPurchases: () => request<{ purchases: any[] }>("/api/services/purchases"),
  checkActive: (type: string) => request<{ active: boolean; purchase?: any }>(`/api/services/check?type=${type}`),
};

// ─── Ad Targeting ─────────────────────────────────────────────────────────────
export const targetingApi = {
  updateDemographics: (data: { interests?: string[]; location?: string; birthYear?: number; gender?: string }) =>
    request<any>("/api/ads/demographics", { method: "PUT", body: JSON.stringify(data) }),
  getCampaignAnalytics: (campaignId: string) => request<any>(`/api/ads/campaigns/${campaignId}/analytics`),
  trackClick: (campaignId: string) => request<any>(`/api/ads/campaigns/${campaignId}/click`, { method: "POST" }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getMyAnalytics: () => request<any>("/api/analytics/me"),
  getPlatformAnalytics: () => request<any>("/api/analytics/platform"),
};

// ─── Uploads ──────────────────────────────────────────────────────────────────
export const uploadApi = {
  avatar: async (file: File): Promise<{ success: boolean; url: string; key: string }> => {
    const form = new FormData();
    form.append("avatar", file);
    const token = localStorage.getItem("sf_token");
    const res = await fetch("/api/uploads/avatar", {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Upload failed"); }
    return res.json();
  },

  media: async (file: File): Promise<{ success: boolean; url: string; key: string; contentType: string }> => {
    const form = new FormData();
    form.append("media", file);
    const token = localStorage.getItem("sf_token");
    const res = await fetch("/api/uploads/media", {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Upload failed"); }
    return res.json();
  },

  nft: async (file: File): Promise<{ success: boolean; url: string; key: string }> => {
    const form = new FormData();
    form.append("media", file);
    const token = localStorage.getItem("sf_token");
    const res = await fetch("/api/uploads/nft", {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Upload failed"); }
    return res.json();
  },
};

// ─── Referral ─────────────────────────────────────────────────────────────────
export const referralApi = {
  getStats: () => request<any>("/api/referrals/stats"),
  getLeaderboard: () => request<{ leaderboard: any[] }>("/api/referrals/leaderboard"),
  getTiers: () => request<{ tiers: any[] }>("/api/referrals/tiers"),
};

// ─── NFT ──────────────────────────────────────────────────────────────────────
export const nftApi = {
  mint: (body: { name: string; description?: string; imageUrl: string; collection?: string; rarity?: string; attributes?: { trait_type: string; value: string }[] }) =>
    request<{ nft: ApiNft }>("/api/nfts/mint", { method: "POST", body: JSON.stringify(body) }),

  listForSale: (nftId: string, price: number) =>
    request<{ listing: ApiListing }>(`/api/nfts/${nftId}/list`, { method: "POST", body: JSON.stringify({ price }) }),

  cancelListing: (listingId: string) =>
    request<{ success: boolean }>(`/api/nfts/listings/${listingId}`, { method: "DELETE" }),

  buy: (listingId: string) =>
    request<{ success: boolean; nftId: string; price: string; message: string }>(`/api/nfts/listings/${listingId}/buy`, { method: "POST" }),

  getMarket: (params?: { cursor?: string; limit?: number; rarity?: string; collection?: string; minPrice?: number; maxPrice?: number; sort?: string }) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.rarity) qs.set("rarity", params.rarity);
    if (params?.collection) qs.set("collection", params.collection);
    if (params?.minPrice !== undefined) qs.set("minPrice", String(params.minPrice));
    if (params?.maxPrice !== undefined) qs.set("maxPrice", String(params.maxPrice));
    if (params?.sort) qs.set("sort", params.sort);
    return request<{ listings: ApiListing[]; nextCursor: string | null; hasMore: boolean }>(`/api/nfts/market?${qs}`);
  },

  getMyNfts: (params?: { cursor?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<{ nfts: ApiNft[]; nextCursor: string | null; hasMore: boolean }>(`/api/nfts/my?${qs}`);
  },

  getNft: (id: string) => request<{ nft: ApiNft }>(`/api/nfts/${id}`),

  getUserNfts: (userId: string) => request<{ nfts: ApiNft[] }>(`/api/nfts/users/${userId}`),
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
export interface ApiNft {
  id: string;
  ownerId: string;
  minterId: string;
  name: string;
  description?: string;
  imageUrl: string;
  collection: string;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  attributes?: { trait_type: string; value: string }[];
  tokenId?: string;
  contractAddress?: string;
  createdAt: string;
  owner?: { id: string; username: string; displayName?: string; avatarUrl?: string };
  minter?: { id: string; username: string; displayName?: string };
  listings?: ApiListing[];
}

export interface ApiListing {
  id: string;
  nftId: string;
  sellerId: string;
  buyerId?: string;
  price: string;
  status: "ACTIVE" | "SOLD" | "CANCELLED";
  listedAt: string;
  soldAt?: string;
  nft?: ApiNft;
  seller?: { id: string; username: string; displayName?: string; avatarUrl?: string };
  buyer?: { id: string; username: string };
}

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
