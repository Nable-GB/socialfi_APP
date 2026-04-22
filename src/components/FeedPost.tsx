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
  const createdDate = new Date(post.createdAt).toLocaleDateString();
  const actionButtonClassName = "inline-flex items-center gap-1.5 rounded-full border border-slate-800/80 bg-slate-950/55 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-900/80";

  return (
    <>
      <article className={`rounded-[1.45rem] p-4 shadow-[0_18px_44px_rgba(2,6,23,0.18)] feed-item border sm:p-5 ${
        post.isSponsored
          ? 'border-indigo-500/25 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))]'
          : 'border-slate-800/70 bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(10,15,28,0.92))]'
      }`}>
        {post.isSponsored && (
          <div className="mb-3 flex items-center gap-2 border-b border-indigo-500/20 pb-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" style={{boxShadow:'0 0 4px #818cf8'}} />
            <span className="text-xs font-medium text-indigo-400 font-mono tracking-wider">{t.feed.sponsored}</span>
          </div>
        )}
        <div className="flex items-start gap-3.5">
          <img src={avatarUrl} alt={post.author.username} className="h-10 w-10 rounded-full object-cover flex-shrink-0 border border-slate-700/40 shadow-[0_8px_20px_rgba(15,23,42,0.28)]" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-slate-100">{post.author.displayName ?? post.author.username}</span>
              {post.author.isVerified && <CheckCircle size={13} className="text-cyan-400" />}
              <span className="text-xs text-slate-500 font-mono">@{post.author.username}</span>
              <span className="ml-auto rounded-full border border-slate-800/80 bg-slate-950/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{createdDate}</span>
            </div>
            <p className="mt-2.5 text-[15px] leading-7 text-slate-300 whitespace-pre-wrap">{post.content}</p>
          </div>
        </div>

        {/* Media preview */}
        {post.mediaUrl && (
          <div className="mt-4 overflow-hidden rounded-[1.15rem] border border-slate-800/80 bg-slate-900/40 max-h-96">
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
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[1rem] py-3 text-sm font-bold transition-all"
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
        <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-slate-800/80 pt-3.5">
          <button onClick={handleLike}
            className={`${actionButtonClassName} hover:text-pink-400`}>
            <Heart size={16} className={liked ? 'text-pink-400 fill-pink-400' : ''} />
            <span className="text-xs font-mono">{likeCount}</span>
          </button>
          <button onClick={handleOpenComments}
            className={`${actionButtonClassName} hover:text-cyan-400`}>
            <MessageCircle size={16} />
            <span className="text-xs font-mono">{commentCount}</span>
          </button>
          <button onClick={() => { navigator.clipboard.writeText(`https://smfi.app/post/${post.id}`); toast.success(t.feed.linkCopied); }}
            className={`${actionButtonClassName} hover:text-indigo-400`}>
            <Share2 size={16} />
            <span className="text-xs font-mono">{post.sharesCount}</span>
          </button>
          {post.adCampaign?.targetUrl && (
            <a href={post.adCampaign.targetUrl} target="_blank" rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/15 hover:text-indigo-200">
              <ExternalLink size={12} />{t.feed.learnMore}
            </a>
          )}
          {isOwner && !post.isSponsored && (
            <button onClick={handleDelete}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-800/80 bg-slate-950/55 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300">
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
