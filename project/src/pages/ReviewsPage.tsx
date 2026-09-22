import { useState, useEffect, useMemo } from 'react';
import { Search, BookOpen, ExternalLink, RefreshCw, Globe } from 'lucide-react';
import type { Review } from '@/types/review';
import { fetchReviews } from '@/lib/reviews';
import { ReviewCard } from '@/components/ReviewCard';

interface ReviewsPageProps {
  navigate: (path: string) => void;
}

interface BlogPost {
  title: string;
  url: string;
  published: string;
  thumbnail: string | null;
  summary: string;
  id: string;
}

export function ReviewsPage({ navigate }: ReviewsPageProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [view, setView] = useState<'community' | 'blog'>('community');
  const [refreshing, setRefreshing] = useState(false);

  const loadBlog = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-posts`);
      const data = await res.json();
      setBlogPosts(data.posts || []);
    } catch {
      setBlogPosts([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetchReviews().catch(() => [] as Review[]),
      loadBlog(),
    ]).then(([reviewData]) => {
      setReviews(reviewData);
      setLoading(false);
    });
  }, []);

  const genres = useMemo(() => {
    const set = new Set(reviews.map((r) => r.genre));
    return Array.from(set).sort();
  }, [reviews]);

  const filtered = useMemo(() => {
    let result = reviews;
    if (selectedGenre) result = result.filter((r) => r.genre === selectedGenre);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.author.toLowerCase().includes(q) ||
          r.genre.toLowerCase().includes(q)
      );
    }
    return result;
  }, [reviews, search, selectedGenre]);

  const filteredBlog = useMemo(() => {
    if (!search.trim()) return blogPosts;
    const q = search.toLowerCase();
    return blogPosts.filter((p) => p.title.toLowerCase().includes(q));
  }, [blogPosts, search]);

  return (
    <div className="pt-24 pb-20 container-prose animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-semibold" style={{ color: 'var(--color-text)' }}>Reviews</h1>
        {view === 'blog' && (
          <button
            onClick={loadBlog}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium btn-ghost"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('community')}
          className="px-4 py-2 rounded-full text-sm font-medium transition-all"
          style={{
            background: view === 'community' ? 'var(--color-teal-dark)' : 'var(--color-surface)',
            color: view === 'community' ? 'white' : 'var(--color-text-muted)',
            border: view === 'community' ? 'none' : '1px solid var(--color-border)',
          }}
        >
          Community Reviews
        </button>
        <button
          onClick={() => setView('blog')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
          style={{
            background: view === 'blog' ? 'var(--color-teal-dark)' : 'var(--color-surface)',
            color: view === 'blog' ? 'white' : 'var(--color-text-muted)',
            border: view === 'blog' ? 'none' : '1px solid var(--color-border)',
          }}
        >
          <Globe className="w-3.5 h-3.5" /> Blog Posts ({blogPosts.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reviews..."
          className="input-field pl-10"
        />
      </div>

      {/* Genre filter (community only) */}
      {view === 'community' && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedGenre(null)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: !selectedGenre ? 'var(--color-text)' : 'var(--color-surface)',
              color: !selectedGenre ? 'var(--color-bg)' : 'var(--color-text-muted)',
              border: !selectedGenre ? 'none' : '1px solid var(--color-border)',
            }}
          >
            All
          </button>
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre === selectedGenre ? null : genre)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: selectedGenre === genre ? 'var(--color-text)' : 'var(--color-surface)',
                color: selectedGenre === genre ? 'var(--color-bg)' : 'var(--color-text-muted)',
                border: selectedGenre === genre ? 'none' : '1px solid var(--color-border)',
              }}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* Community reviews grid */}
      {view === 'community' && (
        <>
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden surface-card animate-pulse">
                  <div className="aspect-square" style={{ background: 'var(--color-paper)' }} />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-20 rounded" style={{ background: 'var(--color-paper)' }} />
                    <div className="h-5 w-full rounded" style={{ background: 'var(--color-paper)' }} />
                    <div className="h-12 w-full rounded" style={{ background: 'var(--color-paper)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20">
              <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No reviews found.</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((review, i) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  index={i}
                  onClick={() => navigate(`/review/${review.slug}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Blog posts grid */}
      {view === 'blog' && (
        <>
          {blogPosts.length === 0 && !refreshing && (
            <div className="text-center py-20">
              <Globe className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No blog posts found.</p>
            </div>
          )}

          {blogPosts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBlog.map((post, i) => (
                <a
                  key={post.id}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-review group flex flex-col animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="relative aspect-square overflow-hidden" style={{ background: 'var(--color-paper)' }}>
                    {post.thumbnail ? (
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center gradient-teal">
                        <span className="font-serif text-xl text-white/40 px-4 text-center">{post.title}</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <ExternalLink className="w-4 h-4 text-white/60" />
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-[11px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                      {post.published.slice(0, 10)}
                    </p>
                    <h3 className="font-serif text-base font-semibold leading-snug mb-2 line-clamp-3" style={{ color: 'var(--color-text)' }}>
                      {post.title}
                    </h3>
                    <p className="text-sm leading-relaxed line-clamp-2 flex-1" style={{ color: 'var(--color-text-muted)' }}>
                      {post.summary}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
