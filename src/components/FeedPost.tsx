import { useState } from "react";
import { Heart, MessageCircle, Share2, ExternalLink, Trash2, CheckCircle, Zap, RefreshCw, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { type ApiPost, type ApiComment } from "../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FeedPostProps {
  post: ApiPost;
  onClaimReward: (postId: string, type: 'VIEW' | 'ENGAGEMENT', amount: string) => void;
  onLike: (postId: string) => Promise<void>;
  onComment: (postId: string, text: string) => Promise<void>;
  onClaimAdReward: (postId: string, type: 'VIEW' | 'ENGAGEMENT') => Promise<{ type: string; amount: string; postId: string }>;
  onDelete: (postId: string) => Promise<void>;
  onGetComments: (postId: string, cursor?: string) => Promise<{ comments: ApiComment[]; nextCursor: string | null; hasMore: boolean }>;
}

export function FeedPost({ post, onClaimReward, onLike, onComment, onClaimAdReward, onDelete, onGetComments }: FeedPostProps) {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLang();
  const [liked, setLiked] = useState((post.userInteractions ?? []).includes('LIKE'));
  const [likeCount, setLikeCount] = useState(post.likesCount ?? 0);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentCount, setCommentCount] = useState(post.commentsCount ?? 0);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [commentsCursor, setCommentsCursor] = useState<string | null>(null);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const isOwner = isAuthenticated && user?.id === post.author.id;

  const handleLike = async () => {
    if (!isAuthenticated) { toast.error(t.feed.signInInteract); return; }
    setLiked(p => !p);
    setLikeCount(p => liked ? p - 1 : p + 1);
    await onLike(post.id);
  };

  const handleOpenComments = async () => {
    setCommentOpen(true);
    if (comments.length === 0) {
      setCommentsLoading(true);
      const res = await onGetComments(post.id);
      setComments(res.comments);
      setCommentsCursor(res.nextCursor);
      setCommentsHasMore(res.hasMore);
      setCommentsLoading(false);
    }
  };

  const handleLoadMoreComments = async () => {
    if (!commentsCursor || commentsLoadingMore) return;
    setCommentsLoadingMore(true);
    const res = await onGetComments(post.id, commentsCursor);
    setComments(prev => [...prev, ...res.comments]);
    setCommentsCursor(res.nextCursor);
    setCommentsHasMore(res.hasMore);
    setCommentsLoadingMore(false);
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    await onComment(post.id, commentText);
    const newComment: ApiComment = {
      id: `temp-${Date.now()}`,
      text: commentText,
      createdAt: new Date().toISOString(),
      author: {
        id: user?.id ?? '',
        username: user?.username ?? '',
        displayName: user?.displayName,
        avatarUrl: user?.avatarUrl,
        isVerified: user?.isVerified ?? false,
      },
    };
    setComments(prev => [newComment, ...prev]);
    setCommentCount(p => p + 1);
    setCommentText('');
  };

  const handleDelete = async () => {
    if (!confirm(t.feed.deletePrompt)) return;
    await onDelete(post.id);
  };

  const handleEarn = async () => {
    if (!isAuthenticated) { toast.error(t.feed.signInEarn); return; }
    try {
      const reward = await onClaimAdReward(post.id, 'VIEW');
      onClaimReward(post.id, 'VIEW', reward.amount);
    } catch { /* handled inside hook */ }
  };

  const avatarUrl = post.author.avatarUrl ?? `https://api.dicebear.com/9.x/avataaars/svg?seed=${post.author.username}`;

  return (
    <>
      <article className={`rounded-2xl p-5 feed-item border ${
        post.isSponsored
          ? 'border-indigo-500/25 bg-gradient-to-br from-slate-900/90 to-slate-800/80'
          : 'glass border-slate-700/10'
      }`}>
        {post.isSponsored && (
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-indigo-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" style={{boxShadow:'0 0 4px #818cf8'}} />
            <span className="text-xs font-medium text-indigo-400 font-mono tracking-wider">{t.feed.sponsored}</span>
          </div>
        )}
        <div className="flex items-start gap-3">
          <img src={avatarUrl} alt={post.author.username} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-slate-700/40" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-slate-100">{post.author.displayName ?? post.author.username}</span>
              {post.author.isVerified && <CheckCircle size={13} className="text-cyan-400" />}
              <span className="text-xs text-slate-600 font-mono">@{post.author.username}</span>
              <span className="text-xs text-slate-700 font-mono ml-auto">{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">{post.content}</p>
          </div>
        </div>

        {/* Media preview */}
        {post.mediaUrl && (
          <div className="mt-3 rounded-xl overflow-hidden border border-slate-700/20 max-h-96 bg-slate-800/30">
            {post.mediaUrl.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
              <video
                src={post.mediaUrl}
                controls
                className="w-full max-h-96 object-contain"
                preload="metadata"
              />
            ) : (
              <img
                src={post.mediaUrl}
                alt="Post media"
                className="w-full max-h-96 object-cover"
                loading="lazy"
              />
            )}
          </div>
        )}

        {/* Earn button for sponsored posts */}
        {post.isSponsored && (
          <button
            onClick={handleEarn}
            disabled={post.rewardClaimed}
            className="mt-4 w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={post.rewardClaimed ? {
              background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#34d399', cursor:'default'
            } : {
              background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'1px solid rgba(99,102,241,0.4)', color:'#fff',
              boxShadow:'0 4px 15px rgba(99,102,241,0.3)'
            }}>
            {post.rewardClaimed
              ? <><CheckCircle size={15}/> {t.feed.rewardClaimed} 🪙</>
              : <><Zap size={15}/> {t.feed.watchEarn} {post.rewardPerView ? `${parseFloat(post.rewardPerView).toFixed(3)} ${t.feed.tokens}` : ''} 🪙</>}
          </button>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-700/10">
          <button onClick={handleLike}
            className="flex items-center gap-1.5 text-slate-400 hover:text-pink-400 transition-colors">
            <Heart size={16} className={liked ? 'text-pink-400 fill-pink-400' : ''} />
            <span className="text-xs font-mono">{likeCount}</span>
          </button>
          <button onClick={handleOpenComments}
            className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors">
            <MessageCircle size={16} />
            <span className="text-xs font-mono">{commentCount}</span>
          </button>
          <button onClick={() => { navigator.clipboard.writeText(`https://smfi.app/post/${post.id}`); toast.success(t.feed.linkCopied); }}
            className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
            <Share2 size={16} />
            <span className="text-xs font-mono">{post.sharesCount}</span>
          </button>
          {post.adCampaign?.targetUrl && (
            <a href={post.adCampaign.targetUrl} target="_blank" rel="noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
              <ExternalLink size={12} />{t.feed.learnMore}
            </a>
          )}
          {isOwner && !post.isSponsored && (
            <button onClick={handleDelete}
              className="ml-auto flex items-center gap-1 text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </article>

      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.feed.commentsTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">{commentCount} {commentCount !== 1 ? t.feed.comments : t.feed.comment}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 max-h-[50vh] overflow-y-auto pr-1">
            {commentsLoading ? (
              <div className="flex items-center justify-center py-6 text-slate-500">
                <RefreshCw size={16} className="animate-spin mr-2" /> {t.feed.loadingComments}
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-6">{t.feed.noComments}</p>
            ) : (
              <>
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <img
                      src={c.author.avatarUrl ?? `https://api.dicebear.com/9.x/avataaars/svg?seed=${c.author.username}`}
                      alt={c.author.username}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-slate-700/40"
                    />
                    <div className="flex-1 min-w-0 bg-slate-800/50 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-slate-200">{c.author.displayName ?? c.author.username}</span>
                        {c.author.isVerified && <CheckCircle size={11} className="text-cyan-400" />}
                        <span className="text-xs text-slate-600 ml-auto font-mono">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}
                {commentsHasMore && (
                  <button
                    onClick={handleLoadMoreComments}
                    disabled={commentsLoadingMore}
                    className="w-full py-2 text-xs text-slate-500 hover:text-cyan-400 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {commentsLoadingMore
                      ? <><RefreshCw size={12} className="animate-spin" /> {t.feed.loadingComments}</>
                      : <><ChevronUp size={12} className="rotate-180" /> {t.feed.loadMoreComments}</>}
                  </button>
                )}
              </>
            )}
          </div>
          {isAuthenticated && (
            <div className="flex gap-2 pt-3 border-t border-slate-700/30">
              <Textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder={t.feed.writeComment} className="bg-slate-800 border-slate-700 text-white min-h-[60px] resize-none flex-1 text-sm" />
              <div className="flex flex-col gap-2">
                <Button onClick={handleComment} disabled={!commentText.trim()} className="bg-cyan-500 hover:bg-cyan-600 h-full">{t.feed.postBtn}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
