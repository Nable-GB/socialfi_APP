import { useState, useEffect, useCallback, useRef } from "react";
import { Search, TrendingUp, Flame, Users, Hash, Star, Globe, RefreshCw, UserCheck } from "lucide-react";
import { usersApi, type ApiUser } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

const TRENDING_TOPICS = [
  { tag: "#DeFiSummer", posts: "12.4K", trend: "+340%" },
  { tag: "#NFTDrop", posts: "8.7K", trend: "+180%" },
  { tag: "#Layer2", posts: "6.2K", trend: "+95%" },
  { tag: "#DAOGovernance", posts: "4.1K", trend: "+67%" },
  { tag: "#Web3Gaming", posts: "3.8K", trend: "+52%" },
  { tag: "#SocialFi", posts: "2.9K", trend: "+210%" },
];

type SearchUser = ApiUser & { isFollowing: boolean };

export function ExplorePage() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"trending" | "people" | "topics">("trending");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { users } = await usersApi.search(q);
      setSearchResults(users);
      // Seed following state from results
      const followed = new Set(users.filter(u => u.isFollowing).map(u => u.id));
      setFollowingSet(followed);
    } catch {
      // ignore search errors
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (activeTab === "people") {
      debounceRef.current = setTimeout(() => doSearch(search), 400);
    }
  }, [search, activeTab, doSearch]);

  // When switching to People tab, load initial results
  useEffect(() => {
    if (activeTab === "people") doSearch(search || "a");
  }, [activeTab]); // eslint-disable-line

  const handleToggleFollow = async (user: SearchUser) => {
    if (!isAuthenticated) { toast.error("Please sign in to follow users"); return; }
    try {
      const { following, message } = await usersApi.toggleFollow(user.id);
      setFollowingSet(prev => {
        const next = new Set(prev);
        if (following) next.add(user.id); else next.delete(user.id);
        return next;
      });
      toast.success(message);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to follow user");
    }
  };

  const avatarFallback = (name: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e293b&color=22d3ee&bold=true`;

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="glass rounded-2xl p-4 border border-slate-700/10">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          {searching && <RefreshCw size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 animate-spin" />}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people, topics, posts..."
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div className="flex gap-2 mt-3">
          {([
            { id: "trending", icon: Flame, label: "Trending" },
            { id: "people", icon: Users, label: "People" },
            { id: "topics", icon: Hash, label: "Topics" },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === tab.id
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
                : "text-slate-500 hover:text-slate-300 border border-transparent"}`}>
              <tab.icon size={13} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trending Posts */}
      {activeTab === "trending" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-cyan-400" /> Trending Now
          </h2>
          {[
            { author: "0xNova", content: "Just discovered a new yield farming strategy that's generating 40% APY. Thread 🧵👇", likes: 342, comments: 89 },
            { author: "VoxelQueen", content: "My new collection 'Ethereal Voids' drops tomorrow at 2PM UTC. 1000 unique pieces, each procedurally generated. Who's ready? 🎨", likes: 1205, comments: 234 },
            { author: "CryptoPulse", content: "On-chain data shows whale accumulation at ATH levels. Something big is brewing... 📊", likes: 567, comments: 123 },
          ].map((post, i) => (
            <div key={i} className="glass rounded-2xl p-5 border border-slate-700/10 hover:border-slate-600/30 transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                  {post.author[0]}
                </div>
                <span className="font-semibold text-sm text-white">{post.author}</span>
                <Star size={12} className="text-cyan-400 fill-cyan-400" />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{post.content}</p>
              <div className="flex gap-4 mt-3 text-xs text-slate-500 font-mono">
                <span>❤️ {post.likes.toLocaleString()}</span>
                <span>💬 {post.comments}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* People — Real API */}
      {activeTab === "people" && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users size={18} className="text-indigo-400" />
            {search ? `Results for "${search}"` : "Suggested for You"}
          </h2>
          {searching && (
            <div className="flex justify-center py-8">
              <RefreshCw size={20} className="text-slate-500 animate-spin" />
            </div>
          )}
          {!searching && searchResults.length === 0 && (
            <div className="glass rounded-2xl p-8 border border-slate-700/10 text-center">
              <Users size={32} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No users found{search ? ` for "${search}"` : ""}</p>
            </div>
          )}
          {!searching && searchResults.map(user => (
            <div key={user.id} className="glass rounded-2xl p-4 border border-slate-700/10 flex items-center gap-4">
              <img
                src={user.avatarUrl || avatarFallback(user.displayName ?? user.username)}
                alt={user.displayName ?? user.username}
                className="w-12 h-12 rounded-full object-cover border border-slate-700/40"
                onError={e => { (e.target as HTMLImageElement).src = avatarFallback(user.displayName ?? user.username); }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-white truncate">{user.displayName ?? user.username}</span>
                  {user.isVerified && <Star size={12} className="text-cyan-400 fill-cyan-400 flex-shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 font-mono">@{user.username}</p>
                {user.bio && <p className="text-xs text-slate-400 mt-0.5 truncate">{user.bio}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500 font-mono mb-1.5">
                  {(user._count?.followers ?? 0).toLocaleString()} followers
                </p>
                {isAuthenticated && (
                  <button
                    onClick={() => handleToggleFollow(user)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${followingSet.has(user.id)
                      ? "bg-slate-800 text-slate-400 border border-slate-700"
                      : "text-white border border-cyan-500/30"}`}
                    style={!followingSet.has(user.id) ? { background: "linear-gradient(135deg, #22d3ee, #6366f1)" } : {}}>
                    {followingSet.has(user.id) ? <><UserCheck size={11} /> Following</> : "Follow"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Topics */}
      {activeTab === "topics" && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Hash size={18} className="text-amber-400" /> Trending Topics
          </h2>
          <div className="glass rounded-2xl border border-slate-700/10 overflow-hidden">
            {TRENDING_TOPICS.map((topic, i) => (
              <div key={topic.tag}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors cursor-pointer border-b border-slate-700/10 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-600 w-4">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-sm text-white">{topic.tag}</p>
                    <p className="text-xs text-slate-500">{topic.posts} posts</p>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-400">{topic.trend}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discover banner */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10"
        style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.05), rgba(99,102,241,0.08))" }}>
        <div className="flex items-center gap-3">
          <Globe size={20} className="text-cyan-400" />
          <div>
            <p className="text-sm font-bold text-white">Join the SocialFi Community</p>
            <p className="text-xs text-slate-400 mt-0.5">Connect with Web3 enthusiasts, earn tokens, and shape the future of social media.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
