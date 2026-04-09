import { useCallback, useEffect, useState } from "react";
import { nftApi, type ApiListing, type ApiNft } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { ShoppingBag, RefreshCw, SlidersHorizontal, Search, Sparkles, History, BadgeInfo, X } from "lucide-react";
import { toast } from "sonner";

function getRarityConfig(t: any): Record<string, { label: string; color: string; bg: string }> {
  return {
    COMMON: { label: t.nft.rarityCommon, color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
    UNCOMMON: { label: t.nft.rarityUncommon, color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
    RARE: { label: t.nft.rarityRare, color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
    EPIC: { label: t.nft.rarityEpic, color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
    LEGENDARY: { label: t.nft.rarityLegendary, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  };
}

function getSortOptions(t: any) {
  return [
    { id: "newest", label: t.nftMarket.sortNewest },
    { id: "price_asc", label: t.nftMarket.sortPriceAsc },
    { id: "price_desc", label: t.nftMarket.sortPriceDesc },
    { id: "rarity", label: t.nftMarket.sortRarity },
  ];
}

function getRelativeTime(dateString?: string) {
  if (!dateString) return "-";
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function sellerName(listing: ApiListing) {
  return listing.seller?.displayName ?? listing.seller?.username ?? "unknown";
}

function sellerHandle(listing: ApiListing) {
  return listing.seller?.username ?? sellerName(listing).toLowerCase().replace(/\s+/g, "");
}

function avatarFallback(label: string) {
  return label.trim().charAt(0).toUpperCase() || "?";
}

function createDemoListings(): ApiListing[] {
  const now = Date.now();
  const hoursAgo = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString();
  return [
    {
      id: "demo-listing-1",
      nftId: "demo-nft-1",
      sellerId: "seller-1",
      price: "285",
      status: "ACTIVE",
      listedAt: hoursAgo(2),
      seller: { id: "seller-1", username: "astralnova", displayName: "Astral Nova" },
      nft: {
        id: "demo-nft-1",
        ownerId: "seller-1",
        minterId: "seller-1",
        name: "Midnight Signal Master #1",
        description: "Exclusive master token from the monthly finals campaign.",
        imageUrl: "https://picsum.photos/seed/demo-market-1/640/640",
        collection: "Top Artist Vault",
        rarity: "LEGENDARY",
        attributes: [{ trait_type: "Utility", value: "Backstage Pass" }, { trait_type: "Edition", value: "1/25" }, { trait_type: "Campaign", value: "April Finals" }],
        tokenId: "1101",
        contractAddress: "0x7a...e21f",
        createdAt: hoursAgo(72),
      },
    },
    {
      id: "demo-listing-2",
      nftId: "demo-nft-2",
      sellerId: "seller-2",
      price: "164",
      status: "ACTIVE",
      listedAt: hoursAgo(5),
      seller: { id: "seller-2", username: "lumenpark", displayName: "Lumen Park" },
      nft: {
        id: "demo-nft-2",
        ownerId: "seller-2",
        minterId: "seller-2",
        name: "Blue Static Poster Cut",
        description: "Visual edition tied to the current Top 10 rollout.",
        imageUrl: "https://picsum.photos/seed/demo-market-2/640/640",
        collection: "Tour Poster Drops",
        rarity: "EPIC",
        attributes: [{ trait_type: "Edition", value: "12/50" }, { trait_type: "Access", value: "Private Discord" }, { trait_type: "Genre", value: "Alt Pop" }],
        tokenId: "2104",
        contractAddress: "0x6f...19ad",
        createdAt: hoursAgo(96),
      },
    },
    {
      id: "demo-listing-3",
      nftId: "demo-nft-3",
      sellerId: "seller-3",
      price: "92",
      status: "ACTIVE",
      listedAt: hoursAgo(11),
      seller: { id: "seller-3", username: "kairobeats", displayName: "Kairo Beats" },
      nft: {
        id: "demo-nft-3",
        ownerId: "seller-3",
        minterId: "seller-3",
        name: "Velvet Run Session Stem",
        description: "Limited collectible with alternate stem pack access.",
        imageUrl: "https://picsum.photos/seed/demo-market-3/640/640",
        collection: "Session Access",
        rarity: "RARE",
        attributes: [{ trait_type: "Unlock", value: "Stem Pack" }, { trait_type: "Edition", value: "32/100" }, { trait_type: "Format", value: "Lossless" }],
        tokenId: "3122",
        contractAddress: "0x9d...82ac",
        createdAt: hoursAgo(120),
      },
    },
    {
      id: "demo-listing-4",
      nftId: "demo-nft-4",
      sellerId: "seller-4",
      price: "58",
      status: "ACTIVE",
      listedAt: hoursAgo(19),
      seller: { id: "seller-4", username: "opalgrid", displayName: "Opal Grid" },
      nft: {
        id: "demo-nft-4",
        ownerId: "seller-4",
        minterId: "seller-4",
        name: "Circuit Bloom Clip",
        description: "Collector reel from the growth campaign.",
        imageUrl: "https://picsum.photos/seed/demo-market-4/640/640",
        collection: "Clip Editions",
        rarity: "UNCOMMON",
        attributes: [{ trait_type: "Edition", value: "120/300" }, { trait_type: "Visual", value: "Animated" }, { trait_type: "Campaign", value: "Spring Push" }],
        tokenId: "4188",
        contractAddress: "0x4a...ab11",
        createdAt: hoursAgo(180),
      },
    },
    {
      id: "demo-listing-5",
      nftId: "demo-nft-5",
      sellerId: "seller-5",
      price: "41",
      status: "ACTIVE",
      listedAt: hoursAgo(28),
      seller: { id: "seller-5", username: "northlane", displayName: "North Lane" },
      nft: {
        id: "demo-nft-5",
        ownerId: "seller-5",
        minterId: "seller-5",
        name: "Afterimage Lyric Card",
        description: "Collectible lyric card with fan drop access.",
        imageUrl: "https://picsum.photos/seed/demo-market-5/640/640",
        collection: "Fan Archive",
        rarity: "COMMON",
        attributes: [{ trait_type: "Edition", value: "241/500" }, { trait_type: "Perk", value: "Early Merch" }, { trait_type: "Drop", value: "Archive" }],
        tokenId: "5009",
        contractAddress: "0xa3...c002",
        createdAt: hoursAgo(240),
      },
    },
    {
      id: "demo-listing-6",
      nftId: "demo-nft-6",
      sellerId: "seller-6",
      price: "133",
      status: "ACTIVE",
      listedAt: hoursAgo(34),
      seller: { id: "seller-6", username: "elliso", displayName: "Elliso" },
      nft: {
        id: "demo-nft-6",
        ownerId: "seller-6",
        minterId: "seller-6",
        name: "Silver Motel Fan Pass",
        description: "Campaign badge with gated pre-save unlock.",
        imageUrl: "https://picsum.photos/seed/demo-market-6/640/640",
        collection: "Top Artist Vault",
        rarity: "EPIC",
        attributes: [{ trait_type: "Edition", value: "18/60" }, { trait_type: "Access", value: "Meet & Greet" }, { trait_type: "Tier", value: "Gold" }],
        tokenId: "6120",
        contractAddress: "0xbc...43ef",
        createdAt: hoursAgo(260),
      },
    },
  ];
}

function buildDemoDetail(listing: ApiListing): ApiNft {
  const nft = listing.nft!;
  return {
    ...nft,
    owner: { id: listing.sellerId, username: listing.seller?.username ?? "owner", displayName: listing.seller?.displayName, avatarUrl: listing.seller?.avatarUrl },
    minter: { id: listing.sellerId, username: listing.seller?.username ?? "minter", displayName: listing.seller?.displayName },
    listings: [
      {
        id: `${listing.id}-sold`,
        nftId: nft.id,
        sellerId: "origin-seller",
        buyerId: listing.sellerId,
        price: `${Math.max(12, parseFloat(listing.price) - 38)}`,
        status: "SOLD",
        listedAt: new Date(new Date(listing.listedAt).getTime() - 72 * 60 * 60 * 1000).toISOString(),
        soldAt: new Date(new Date(listing.listedAt).getTime() - 68 * 60 * 60 * 1000).toISOString(),
        seller: { id: "origin-seller", username: "origin", displayName: "Origin Seller" },
        buyer: { id: listing.sellerId, username: listing.seller?.username ?? "buyer" },
      },
      {
        id: `${listing.id}-cancelled`,
        nftId: nft.id,
        sellerId: listing.sellerId,
        price: `${parseFloat(listing.price) + 22}`,
        status: "CANCELLED",
        listedAt: new Date(new Date(listing.listedAt).getTime() - 24 * 60 * 60 * 1000).toISOString(),
        seller: listing.seller,
      },
      listing,
    ],
  };
}

function applyDemoFilters(listings: ApiListing[], params: { sort: string; rarity?: string; collection?: string; minPrice?: number; maxPrice?: number }) {
  let next = [...listings];
  if (params.rarity) next = next.filter((listing) => listing.nft?.rarity === params.rarity);
  if (params.collection) {
    const query = params.collection.toLowerCase();
    next = next.filter((listing) => listing.nft?.collection.toLowerCase().includes(query));
  }
  if (params.minPrice !== undefined) next = next.filter((listing) => parseFloat(listing.price) >= params.minPrice!);
  if (params.maxPrice !== undefined) next = next.filter((listing) => parseFloat(listing.price) <= params.maxPrice!);

  if (params.sort === "price_asc") next.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  else if (params.sort === "price_desc") next.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  else if (params.sort === "rarity") {
    const rank = { LEGENDARY: 5, EPIC: 4, RARE: 3, UNCOMMON: 2, COMMON: 1 } as Record<string, number>;
    next.sort((a, b) => (rank[b.nft?.rarity ?? "COMMON"] ?? 0) - (rank[a.nft?.rarity ?? "COMMON"] ?? 0));
  } else {
    next.sort((a, b) => new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime());
  }

  return next;
}

function MarketStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(10,16,32,0.7)", border: "1px solid rgba(148,163,184,0.08)" }}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function NftCard({ listing, onBuy, buying, onCollectionSelect, onOpenDetails }: { listing: ApiListing; onBuy: (id: string) => void; buying: boolean; onCollectionSelect: (collection: string) => void; onOpenDetails: (listing: ApiListing) => void }) {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLang();
  const rarityConfig = getRarityConfig(t);
  const nft = listing.nft!;
  const rarity = rarityConfig[nft.rarity] ?? rarityConfig.COMMON;
  const isOwn = user?.id === listing.sellerId;
  const seller = sellerName(listing);

  return (
    <div className="glass rounded-2xl overflow-hidden border border-slate-700/10 hover:border-slate-600/30 transition-all group">
      <div className="relative aspect-square overflow-hidden bg-slate-800">
        <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${nft.id}/400/400`; }} />
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-xs font-bold border" style={{ background: rarity.bg, color: rarity.color, borderColor: `${rarity.color}40` }}>
          {rarity.label}
        </div>
        <button onClick={() => onCollectionSelect(nft.collection)} className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-xs bg-black/50 text-slate-300 backdrop-blur-sm border border-slate-700/30 hover:text-white transition-colors">
          {nft.collection}
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <button onClick={() => onOpenDetails(listing)} className="font-bold text-white text-sm truncate text-left hover:text-cyan-300 transition-colors block max-w-full">{nft.name}</button>
            <p className="text-xs text-slate-500 mt-0.5">#{nft.tokenId ?? listing.id.slice(-4)}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-500">{t.nftMarket.listed}</p>
            <p className="text-xs font-mono text-slate-300">{getRelativeTime(listing.listedAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl px-2.5 py-2 bg-slate-900/55 border border-slate-800/70">
          <div className="w-8 h-8 rounded-full bg-slate-700/70 flex items-center justify-center text-xs font-semibold text-slate-200 overflow-hidden">
            {listing.seller?.avatarUrl ? <img src={listing.seller.avatarUrl} alt={seller} className="w-full h-full object-cover" /> : avatarFallback(seller)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400 truncate">{seller}</p>
            <p className="text-[11px] text-slate-500 truncate">@{sellerHandle(listing)}</p>
          </div>
        </div>

        {nft.attributes && nft.attributes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {nft.attributes.slice(0, 3).map((attr, index) => (
              <span key={`${attr.trait_type}-${index}`} className="px-1.5 py-0.5 rounded-md text-xs bg-slate-800 text-slate-400 border border-slate-700/30">
                {attr.trait_type}: {attr.value}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/20">
          <div>
            <p className="text-xs text-slate-500">{t.nftMarket.price}</p>
            <p className="text-base font-bold font-mono" style={{ color: rarity.color }}>
              {parseFloat(listing.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="text-xs text-slate-400 ml-1">SFT</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onOpenDetails(listing)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 border border-slate-700/30 hover:border-cyan-400/30 hover:text-cyan-200 transition-all">
              {t.nftMarket.details}
            </button>
            {isOwn ? (
              <span className="text-xs text-slate-500 border border-slate-700/30 px-2.5 py-1.5 rounded-xl">{t.nftMarket.yourNft}</span>
            ) : (
              <button
                onClick={() => onBuy(listing.id)}
                disabled={!isAuthenticated || buying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)" }}
              >
                {buying ? <RefreshCw size={11} className="animate-spin" /> : <ShoppingBag size={11} />}
                {t.nftMarket.buy}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NftDetailModal({ nft, fallbackListing, loading, buying, onClose, onBuy }: { nft: ApiNft | null; fallbackListing?: ApiListing | null; loading: boolean; buying: boolean; onClose: () => void; onBuy: (id: string) => void }) {
  const { t } = useLang();
  const { user, isAuthenticated } = useAuth();
  const rarityConfig = getRarityConfig(t);

  if (!nft && !loading) return null;

  const activeListing = nft?.listings?.find((listing) => listing.status === "ACTIVE") ?? fallbackListing ?? null;
  const rarity = rarityConfig[nft?.rarity ?? fallbackListing?.nft?.rarity ?? "COMMON"] ?? rarityConfig.COMMON;
  const history = [...(nft?.listings ?? (fallbackListing ? [fallbackListing] : []))].sort((a, b) => new Date(b.soldAt ?? b.listedAt).getTime() - new Date(a.soldAt ?? a.listedAt).getTime());
  const lastSale = history.find((listing) => listing.status === "SOLD");
  const isOwn = Boolean(user && activeListing && user.id === activeListing.sellerId);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 p-4 flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl" style={{ background: "rgba(6, 12, 24, 0.96)", border: "1px solid rgba(34,211,238,0.16)", boxShadow: "0 24px 80px rgba(2,6,23,0.58)" }} onClick={(event) => event.stopPropagation()}>
        {loading ? (
          <div className="flex justify-center items-center py-24"><RefreshCw size={24} className="text-cyan-400 animate-spin" /></div>
        ) : nft ? (
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-0">
            <div className="p-5 border-b lg:border-b-0 lg:border-r border-slate-800/70">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold border" style={{ background: rarity.bg, color: rarity.color, borderColor: `${rarity.color}40` }}>{rarity.label}</span>
                <button onClick={onClose} className="w-9 h-9 rounded-xl border border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-500/50 transition-all flex items-center justify-center"><X size={16} /></button>
              </div>
              <div className="rounded-2xl overflow-hidden bg-slate-900/60 border border-slate-800/70">
                <img src={nft.imageUrl} alt={nft.name} className="w-full aspect-square object-cover" />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <MarketStat label={t.nftMarket.floor} value={activeListing ? `${parseFloat(activeListing.price).toFixed(0)} SFT` : "-"} accent="#22d3ee" />
                <MarketStat label={t.nftMarket.lastSale} value={lastSale ? `${parseFloat(lastSale.price).toFixed(0)} SFT` : "-"} accent="#a855f7" />
                <MarketStat label={t.nftMarket.activity} value={String(history.length)} accent="#f59e0b" />
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{nft.name}</h2>
                    <p className="text-sm text-slate-400 mt-1">{nft.collection} · #{nft.tokenId ?? nft.id.slice(-4)}</p>
                  </div>
                  {activeListing && <p className="text-lg font-bold font-mono" style={{ color: rarity.color }}>{parseFloat(activeListing.price).toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs text-slate-400">SFT</span></p>}
                </div>
                {nft.description && <p className="text-sm text-slate-400 mt-3 leading-relaxed">{nft.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: "rgba(10,16,32,0.72)", border: "1px solid rgba(148,163,184,0.08)" }}>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{t.nftMarket.owner}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{nft.owner?.displayName ?? nft.owner?.username ?? "-"}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "rgba(10,16,32,0.72)", border: "1px solid rgba(148,163,184,0.08)" }}>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{t.nftMarket.minter}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{nft.minter?.displayName ?? nft.minter?.username ?? "-"}</p>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: "rgba(10,16,32,0.72)", border: "1px solid rgba(148,163,184,0.08)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <BadgeInfo size={14} className="text-cyan-300" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-[0.16em]">{t.nftMarket.metadata}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                  <div>
                    <p className="text-slate-500">{t.nftMarket.contract}</p>
                    <p className="mt-1 font-mono text-slate-300 break-all">{nft.contractAddress ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t.nftMarket.tokenId}</p>
                    <p className="mt-1 font-mono text-slate-300">{nft.tokenId ?? "-"}</p>
                  </div>
                </div>
              </div>

              {nft.attributes && nft.attributes.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: "rgba(10,16,32,0.72)", border: "1px solid rgba(148,163,184,0.08)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-purple-300" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-[0.16em]">{t.nftMarket.attributes}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {nft.attributes.map((attribute, index) => (
                      <div key={`${attribute.trait_type}-${index}`} className="rounded-lg px-3 py-2 bg-slate-900/60 border border-slate-800/70">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{attribute.trait_type}</p>
                        <p className="mt-1 text-sm font-medium text-slate-200">{attribute.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl p-4" style={{ background: "rgba(10,16,32,0.72)", border: "1px solid rgba(148,163,184,0.08)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <History size={14} className="text-amber-300" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-[0.16em]">{t.nftMarket.activityFeed}</span>
                </div>
                <div className="space-y-2">
                  {history.length === 0 ? (
                    <p className="text-sm text-slate-500">{t.nftMarket.noActivity}</p>
                  ) : history.map((listing) => (
                    <div key={listing.id} className="rounded-lg px-3 py-2 bg-slate-900/60 border border-slate-800/70 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200 truncate">
                          {listing.status === "ACTIVE" ? t.nftMarket.activityListed : listing.status === "SOLD" ? t.nftMarket.activitySold : t.nftMarket.activityCancelled}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {listing.seller?.displayName ?? listing.seller?.username ?? "seller"}
                          {listing.buyer?.username ? ` → ${listing.buyer.username}` : ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-mono text-slate-200">{parseFloat(listing.price).toFixed(0)} SFT</p>
                        <p className="text-[10px] text-slate-500">{getRelativeTime(listing.soldAt ?? listing.listedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {activeListing && !isOwn && isAuthenticated && (
                <button onClick={() => onBuy(activeListing.id)} disabled={buying} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-40" style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)" }}>
                  {buying ? <RefreshCw size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
                  {t.nftMarket.buy}
                </button>
              )}

              {!isAuthenticated && activeListing && (
                <div className="text-xs text-slate-500">{t.brochureHub.signInToPurchase}</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function NFTMarketplacePage() {
  const { t } = useLang();
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);
  const [sort, setSort] = useState("newest");
  const [rarity, setRarity] = useState<string | undefined>(undefined);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ApiListing | null>(null);
  const [detailNft, setDetailNft] = useState<ApiNft | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDemoMarket = useCallback(() => {
    const demoListings = applyDemoFilters(createDemoListings(), {
      sort,
      rarity,
      collection: collection || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    });
    setListings(demoListings);
    setNextCursor(null);
    setHasMore(false);
    setUsingDemo(true);
  }, [sort, rarity, collection, minPrice, maxPrice]);

  const fetchListings = useCallback(async (cursor?: string) => {
    if (!cursor) setLoading(true); else setLoadingMore(true);
    try {
      const res = await nftApi.getMarket({
        cursor,
        limit: 20,
        sort,
        rarity: rarity || undefined,
        collection: collection || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      });

      const hasActiveServerFilters = Boolean(rarity || collection || minPrice || maxPrice);
      if (!cursor && res.listings.length === 0 && !hasActiveServerFilters) {
        loadDemoMarket();
        return;
      }

      setUsingDemo(false);
      setListings((prev) => cursor ? [...prev, ...res.listings] : res.listings);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch {
      if (!cursor) loadDemoMarket();
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sort, rarity, collection, minPrice, maxPrice, loadDemoMarket]);

  useEffect(() => {
    setListings([]);
    setNextCursor(null);
    fetchListings();
  }, [fetchListings]);

  const displayedListings = listings.filter((listing) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [listing.nft?.name, listing.nft?.collection, listing.seller?.username, listing.seller?.displayName]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const collectionCounts = displayedListings.reduce((map, listing) => {
    const name = listing.nft?.collection ?? "Unknown";
    map.set(name, (map.get(name) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const featuredCollections = Array.from(collectionCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const floorPrice = displayedListings.length > 0 ? Math.min(...displayedListings.map((listing) => parseFloat(listing.price))) : 0;
  const averagePrice = displayedListings.length > 0 ? displayedListings.reduce((sum, listing) => sum + parseFloat(listing.price), 0) / displayedListings.length : 0;
  const uniqueSellers = new Set(displayedListings.map((listing) => listing.sellerId)).size;
  const topCollection = featuredCollections[0]?.[0] ?? "-";

  const handleOpenDetails = async (listing: ApiListing) => {
    setSelectedListing(listing);
    setDetailLoading(true);
    try {
      if (usingDemo) {
        setDetailNft(buildDemoDetail(listing));
        return;
      }

      const res = await nftApi.getNft(listing.nftId);
      setDetailNft(res.nft);
    } catch {
      setDetailNft(buildDemoDetail(listing));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBuy = async (listingId: string) => {
    setBuyingId(listingId);
    try {
      if (usingDemo) {
        const purchased = listings.find((listing) => listing.id === listingId);
        setListings((prev) => prev.filter((listing) => listing.id !== listingId));
        if (selectedListing?.id === listingId) {
          setSelectedListing(null);
          setDetailNft(null);
        }
        toast.success(`${t.nftMarket.demoPurchased} ${purchased?.nft?.name ?? "NFT"}`);
        return;
      }

      const res = await nftApi.buy(listingId);
      if (selectedListing?.id === listingId) {
        setSelectedListing(null);
        setDetailNft(null);
      }
      toast.success(res.message);
      fetchListings();
    } catch (err: any) {
      toast.error(err?.message ?? t.nftMarket.purchaseFailed);
    } finally {
      setBuyingId(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setCollection("");
    setRarity(undefined);
    setMinPrice("");
    setMaxPrice("");
  };

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5 border border-slate-700/10 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.2),rgba(99,102,241,0.2))", border: "1px solid rgba(168,85,247,0.3)" }}>
              <ShoppingBag size={20} className="text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-white">{t.nftMarket.title}</h1>
                {usingDemo && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-purple-300 border border-purple-400/20 bg-purple-400/10">
                    {t.nftMarket.demoMode}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{displayedListings.length} {t.nftMarket.activeListings}</p>
            </div>
          </div>
          <button onClick={() => setShowFilters((value) => !value)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${showFilters ? "bg-purple-500/15 text-purple-400 border-purple-500/25" : "text-slate-400 border-slate-700/30 hover:text-white"}`}>
            <SlidersHorizontal size={13} /> {t.nftMarket.filters}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MarketStat label={t.nftMarket.floor} value={`${floorPrice.toFixed(0)} SFT`} accent="#22d3ee" />
          <MarketStat label={t.nftMarket.average} value={`${averagePrice.toFixed(0)} SFT`} accent="#a855f7" />
          <MarketStat label={t.nftMarket.uniqueSellers} value={uniqueSellers.toLocaleString()} accent="#10b981" />
          <MarketStat label={t.nftMarket.topCollection} value={topCollection} accent="#f59e0b" />
        </div>

        <div className="rounded-xl p-4" style={{ background: "rgba(8,15,30,0.75)", border: "1px solid rgba(148,163,184,0.08)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-cyan-300" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-[0.18em]">{t.nftMarket.marketPulse}</span>
          </div>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.nftMarket.searchPlaceholder}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          {featuredCollections.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {featuredCollections.map(([name, count]) => (
                <button
                  key={name}
                  onClick={() => setCollection(name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${collection === name ? "bg-purple-500/15 text-purple-400 border border-purple-500/25" : "text-slate-400 border border-slate-700/30 hover:text-white"}`}
                >
                  {name} <span className="text-slate-500">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {getSortOptions(t).map((option) => (
            <button
              key={option.id}
              onClick={() => setSort(option.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sort === option.id ? "bg-purple-500/15 text-purple-400 border border-purple-500/25" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="pt-4 border-t border-slate-700/20 grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.nftMarket.collection}</label>
              <input
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                placeholder={t.nftMarket.allCollections}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/30 text-xs text-white placeholder:text-slate-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.nftMarket.filterRarity}</label>
              <select value={rarity ?? ""} onChange={(e) => setRarity(e.target.value || undefined)} className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/30 text-xs text-white focus:outline-none">
                <option value="">{t.nftMarket.filterAllRarities}</option>
                {Object.entries(getRarityConfig(t)).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.nftMarket.filterMinPrice}</label>
              <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/30 text-xs text-white placeholder:text-slate-600 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.nftMarket.filterMaxPrice}</label>
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="∞" className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/30 text-xs text-white placeholder:text-slate-600 focus:outline-none" />
            </div>
            <div className="flex items-end">
              <button onClick={resetFilters} className="w-full py-1.5 rounded-xl text-xs font-medium text-slate-400 border border-slate-700/30 hover:text-white hover:border-slate-600/50 transition-all">
                {t.nftMarket.clearFilters}
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="text-slate-500 animate-spin" /></div>
      ) : displayedListings.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-slate-700/10">
          <ShoppingBag size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400">{t.nftMarket.noListings}</p>
          <p className="text-xs text-slate-600 mt-1">{t.nftMarket.noListingsSub}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedListings.map((listing) => (
              <NftCard key={listing.id} listing={listing} onBuy={handleBuy} buying={buyingId === listing.id} onCollectionSelect={setCollection} onOpenDetails={handleOpenDetails} />
            ))}
          </div>

          {hasMore && !loadingMore && !usingDemo && (
            <button onClick={() => fetchListings(nextCursor ?? undefined)} className="w-full py-3 glass rounded-2xl text-sm font-semibold text-slate-400 border border-slate-700/10 hover:text-white hover:border-slate-600/30 transition-all">
              {t.nftMarket.loadMore}
            </button>
          )}
          {loadingMore && <div className="flex justify-center py-4"><RefreshCw size={16} className="text-slate-500 animate-spin" /></div>}
        </>
      )}

      {(selectedListing || detailLoading) && (
        <NftDetailModal
          nft={detailNft}
          fallbackListing={selectedListing}
          loading={detailLoading}
          buying={buyingId === selectedListing?.id || buyingId === detailNft?.listings?.find((listing) => listing.status === "ACTIVE")?.id}
          onClose={() => {
            setSelectedListing(null);
            setDetailNft(null);
          }}
          onBuy={handleBuy}
        />
      )}
    </div>
  );
}