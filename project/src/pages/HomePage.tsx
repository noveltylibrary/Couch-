import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, TrendingUp, PenTool, Sparkles, Users, Star,
  ArrowRight, BarChart3, FileText, Award, Calendar
} from 'lucide-react';
import type { Review } from '@/types/review';
import { fetchReviews } from '@/lib/reviews';

interface HomePageProps {
  navigate: (path: string) => void;
}

interface BlogData {
  posts: Array<{ title: string; url: string; published: string; thumbnail: string | null; id: string }>;
  total: number;
  favicon: string;
}

export function HomePage({ navigate }: HomePageProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [blogData, setBlogData] = useState<BlogData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchReviews().catch(() => [] as Review[]),
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-posts`)
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([reviewData, blog]) => {
      setReviews(reviewData);
      setBlogData(blog);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const avgRating = reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rw_rating, 0) / reviews.length).toFixed(1)
      : '0';
    const genres = new Set(reviews.map((r) => r.genre));
    const topRated = [...reviews].sort((a, b) => b.rw_rating - a.rw_rating).slice(0, 5);
    const recent = [...reviews].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()).slice(0, 5);
    return { avgRating, genreCount: genres.size, topRated, recent, totalReviews: reviews.length };
  }, [reviews]);

  const blogTotal = blogData?.total || 0;
  const grandTotal = stats.totalReviews + blogTotal;

  return (
    <div className="pt-24 pb-20 container-prose animate-fade-in">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: 'rgba(13, 148, 136, 0.1)' }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-teal-dark)' }} />
          <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--color-teal-dark)' }}>
            Two-minute book takes that mess with your head
          </span>
        </div>
        <h1 className="font-serif text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight text-balance mb-6" style={{ color: 'var(--color-text)' }}>
          What book broke your brain this month?
        </h1>
        <p className="text-lg leading-relaxed max-w-2xl mx-auto mb-8" style={{ color: 'var(--color-text-muted)' }}>
          Novelty Library is a community of readers reviewing the books that left a mark. No fluff, no essays — just honest takes on fiction, non-fiction, mystery, romance, and everything in between.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => navigate('/submit')} className="btn-primary">
            <PenTool className="w-4 h-4" /> Submit a Review
          </button>
          <button onClick={() => navigate('/reviews')} className="btn-ghost">
            Browse Reviews
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5" style={{ color: 'var(--color-teal-dark)' }} />
          <h2 className="font-serif text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>Analytics</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={FileText} label="Total Reviews" value={grandTotal} delay={0} />
          <StatCard icon={BookOpen} label="Blog Posts" value={blogTotal} delay={50} />
          <StatCard icon={TrendingUp} label="Avg Rating" value={stats.avgRating} delay={100} />
          <StatCard icon={Sparkles} label="Genres" value={stats.genreCount} delay={150} />
        </div>

        {/* Top rated + recent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="surface-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5" style={{ color: 'var(--color-cyan-dark)' }} />
              <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Top Rated</h3>
            </div>
            <div className="space-y-3">
              {stats.topRated.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/review/${r.slug}`)}
                  className="flex items-center gap-3 w-full text-left p-2 rounded-xl transition-colors hover:bg-[rgba(13,148,136,0.05)]"
                >
                  <span className="font-serif text-2xl font-bold w-8" style={{ color: 'var(--color-teal-dark)' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{r.title}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{r.author}</p>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold gradient-teal text-white">
                    <Star className="w-3 h-3 fill-white" />{r.rw_rating.toFixed(1)}
                  </div>
                </button>
              ))}
              {stats.topRated.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No reviews yet.</p>
              )}
            </div>
          </div>

          <div className="surface-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5" style={{ color: 'var(--color-teal-dark)' }} />
              <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Recently Published</h3>
            </div>
            <div className="space-y-3">
              {stats.recent.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/review/${r.slug}`)}
                  className="flex items-center gap-3 w-full text-left p-2 rounded-xl transition-colors hover:bg-[rgba(13,148,136,0.05)]"
                >
                  {r.cover_image_url ? (
                    <img src={r.cover_image_url} alt={r.title} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg gradient-teal flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{r.title}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{r.genre} · {r.published_at}</p>
                  </div>
                </button>
              ))}
              {stats.recent.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No reviews yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NavCard icon={BookOpen} title="Reviews" desc="Browse all book reviews from the community" onClick={() => navigate('/reviews')} />
        <NavCard icon={PenTool} title="Submit" desc="Share your own book review" onClick={() => navigate('/submit')} />
        <NavCard icon={Users} title="About" desc="Learn about Novelty Library" onClick={() => navigate('/about')} />
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, delay }: { icon: typeof BookOpen; label: string; value: string | number; delay: number }) {
  return (
    <div className="surface-card p-5 text-center animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(13, 148, 136, 0.1)' }}>
        <Icon className="w-5 h-5" style={{ color: 'var(--color-teal-dark)' }} />
      </div>
      <p className="font-serif text-3xl font-semibold" style={{ color: 'var(--color-text)' }}>{value}</p>
      <p className="text-xs uppercase tracking-widest mt-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
    </div>
  );
}

function NavCard({ icon: Icon, title, desc, onClick }: { icon: typeof BookOpen; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="surface-card p-6 text-left transition-all hover:shadow-lg group">
      <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center gradient-teal">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-serif text-lg font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{title}</h3>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
      <div className="mt-4 flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--color-teal-dark)' }}>
        Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}
