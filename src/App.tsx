import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import NewCommentBox from "./components/NewCommentBox";
import CommentCard, { type Comment } from "./components/CommentCard";
import './App.css'

// Toast type
interface Toast {
  id: string;
  message: string;
  action?: () => void;
}

const getInitialComments = (): Comment[] => {
  const saved = localStorage.getItem("talkloop-comments");
  if (saved) return JSON.parse(saved);
  return [];
};

const getInitialPin = () => {
  const saved = localStorage.getItem("talkloop-pinned");
  return saved || null;
};

const App: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>(getInitialComments);
  const [sort, setSort] = useState<'recent' | 'liked'>("recent");
  const [pinnedId, setPinnedId] = useState<string | null>(getInitialPin());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toasts, setToasts] = useState<Toast[]>([]);
  // const [deletedComment, setDeletedComment] = useState<Comment | null>(null); // Remove this line
  const [confettiId, setConfettiId] = useState<string | null>(null);
  const [likedOnce, setLikedOnce] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    localStorage.setItem("talkloop-comments", JSON.stringify(comments));
  }, [comments]);

  useEffect(() => {
    if (pinnedId) localStorage.setItem("talkloop-pinned", pinnedId);
    else localStorage.removeItem("talkloop-pinned");
  }, [pinnedId]);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  // Edit comment
  const handleEdit = (id: string, newText: string) => {
    setComments(comments =>
      comments.map(c =>
        c.id === id
          ? { ...c, text: newText }
          : { ...c, replies: c.replies.map(r => r.id === id ? { ...r, text: newText } : r) }
      )
    );
  };

  // Delete comment with toast/undo
  const handleDelete = (id: string) => {
    let deleted: Comment | null = null;
    setComments(comments => {
      const filtered = comments.filter(c => {
        if (c.id === id) { deleted = c; return false; }
        return true;
      });
      if (!deleted) {
        // Try to find in replies
        return comments.map(c => ({
          ...c,
          replies: c.replies.filter(r => {
            if (r.id === id) { deleted = { ...r, replies: [] }; return false; }
            return true;
          })
        }));
      }
      return filtered;
    });
    if (deleted) {
      // setDeletedComment(deleted); // Remove this line
      const toastId = Date.now().toString();
      setToasts(t => [...t, {
        id: toastId,
        message: "Comment deleted. Undo?",
        action: () => {
          setComments(comments => [deleted!, ...comments]);
          // setDeletedComment(null); // Remove this line
          setToasts(toasts => toasts.filter(toast => toast.id !== toastId));
        }
      }]);
      setTimeout(() => {
        setToasts(toasts => toasts.filter(toast => toast.id !== toastId));
        // setDeletedComment(null); // Remove this line
      }, 5000);
    }
  };

  // Like with confetti on first like
  const handleLike = (id: string) => {
    setComments(comments =>
      comments.map(c =>
        c.id === id
          ? { ...c, likes: c.likes + 1 }
          : { ...c, replies: c.replies.map(r => r.id === id ? { ...r, likes: r.likes + 1 } : r) }
      )
    );
    if (!likedOnce[id]) {
      setConfettiId(id);
      setLikedOnce(l => ({ ...l, [id]: true }));
      setTimeout(() => setConfettiId(null), 1200);
    }
  };

  // Edit reply
  // const handleEditReply = (id: string, newText: string) => handleEdit(id, newText);
  // Delete reply
  // const handleDeleteReply = (id: string) => handleDelete(id);

  const handleReply = (id: string, text: string) => {
    setComments(comments =>
      comments.map(c =>
        c.id === id
          ? { ...c, replies: [...c.replies, { id: Date.now().toString(), user: "User", text, likes: 0, createdAt: Date.now() }] }
          : c
      )
    );
  };

  const handlePin = (id: string) => {
    setPinnedId(prev => prev === id ? null : id);
  };

  const sortedComments = [...comments].sort((a, b) =>
    sort === "recent" ? b.createdAt - a.createdAt : b.likes - a.likes
  );
  const pinnedComment = sortedComments.find(c => c.id === pinnedId);
  const restComments = sortedComments.filter(c => c.id !== pinnedId);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 transition-colors flex flex-col">
      <Header />
      {!isOnline && (
        <div className="w-full bg-yellow-200 text-yellow-900 text-center py-2 font-semibold animate-pulse" role="status">You are offline. Changes will be saved locally.</div>
      )}
      <main className="flex-1 flex flex-col w-full pt-6 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center mb-2 w-full">
          <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">Comments</span>
          <select
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 py-1"
            value={sort}
            onChange={e => setSort(e.target.value as 'recent' | 'liked')}
            aria-label="Sort comments"
          >
            <option value="recent">Most Recent</option>
            <option value="liked">Most Liked</option>
          </select>
        </div>
        <div className="w-full">
          <NewCommentBox onPost={text => setComments([
            {
              id: Date.now().toString(),
              user: "User",
              text,
              likes: 0,
              createdAt: Date.now(),
              replies: [],
            },
            ...comments,
          ])} />
        </div>
        <section className="w-full flex-1 overflow-y-auto" aria-label="Comment feed" style={{minHeight: '200px', maxHeight: '70vh'}}>
          {pinnedComment !== undefined && pinnedComment !== null && (
            <CommentCard
              key={pinnedComment.id}
              comment={pinnedComment}
              onLike={handleLike}
              onReply={handleReply}
              onPin={handlePin}
              isPinned={true}
              onEdit={handleEdit}
              onDelete={handleDelete}
              showConfetti={confettiId === pinnedComment.id}
            />
          )}
          {restComments.length === 0 && !pinnedComment ? (
            <div className="text-center text-gray-400 py-8">No comments yet. Be the first!</div>
          ) : (
            restComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onLike={handleLike}
                onReply={handleReply}
                onPin={handlePin}
                isPinned={false}
                onEdit={handleEdit}
                onDelete={handleDelete}
                showConfetti={confettiId === comment.id}
              />
            ))
          )}
        </section>
        {/* Toast notification */}
        {toasts.map(toast => (
          <div key={toast.id} className="toast">
            {toast.message}
            {toast.action && <button onClick={toast.action}>Undo</button>}
          </div>
        ))}
      </main>
    </div>
  );
};

export default App;
