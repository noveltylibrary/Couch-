import { useState, useEffect } from 'react';
import { ArrowLeft, Star, ExternalLink, Instagram, Calendar, Globe, Tag } from 'lucide-react';
import type { Review } from '@/types/review';
import { fetchReviewBySlug } from '@/lib/reviews';
import { formatDate } from '@/lib/format';
import { RatingBadge } from '@/components/RatingBadge';

interface ReviewPageProps {
  slug: string;
  navigate: (path: string) => void;
}

export function ReviewPage({ slug, navigate }: ReviewPageProps) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchReviewBySlug(slug)
      .then((data) => {
        setReview(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-24 container-prose">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-6 w-24 rounded mb-8" style={{ background: 'var(--color-paper)' }} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="aspect-[4/5] rounded-2xl" style={{ background: 'var(--color-paper)' }} />
            <div className="md:col-span-2 space-y-4">
              <div className="h-8 w-3/4 rounded" style={{ background: 'var(--color-paper)' }} />
              <div className="h-4 w-1/2 rounded" style={{ background: 'var(--color-paper)' }} />
              <div className="h-32 w-full rounded" style={{ background: 'var(--color-paper)' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="pt-32 container-prose text-center">
        <p className="text-lg mb-4" style={{ color: 'var(--color-text-muted)' }}>
          {error ? 'Something went wrong.' : 'Review not found.'}
        </p>
        <button onClick={() => navigate('/reviews')} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" /> Back to Reviews
        </button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 animate-fade-in">
      <div className="container-prose">
        <button
          onClick={() => navigate('/reviews')}
          className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Reviews
        </button>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {/* Cover */}
          <div className="md:col-span-2 animate-fade-up">
            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/5]" style={{ background: 'var(--color-paper)' }}>
              {review.cover_image_url ? (
                <img src={review.cover_image_url} alt={review.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center gradient-teal">
                  <span className="font-serif text-3xl text-white/30 px-4 text-center">{review.title}</span>
                </div>
              )}
            </div>

            {review.buy_link && (
              <a href={review.buy_link} target="_blank" rel="noopener noreferrer" className="btn-primary w-full mt-4">
                <ExternalLink className="w-4 h-4" /> Buy this Book
              </a>
            )}
          </div>

          {/* Content */}
          <div className="md:col-span-3 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="tag">{review.genre}</span>
              {review.traits?.split(',').map((trait) => (
                <span key={trait.trim()} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(13, 148, 136, 0.06)', color: 'var(--color-text-muted)' }}>
                  {trait.trim()}
                </span>
              ))}
            </div>

            <h1 className="font-serif text-4xl md:text-5xl font-semibold leading-tight tracking-tight mb-3 text-balance" style={{ color: 'var(--color-text)' }}>
              {review.title}
            </h1>
            <p className="text-lg mb-6" style={{ color: 'var(--color-text-muted)' }}>by {review.author}</p>

            {/* Ratings */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <RatingBadge rating={review.rw_rating} max={10} variant="rw" />
              {review.goodreads_rating && (
                <RatingBadge rating={review.goodreads_rating} max={5} variant="goodreads" />
              )}
              {review.amazon_rating && (
                <RatingBadge rating={review.amazon_rating} max={5} variant="amazon" />
              )}
              {review.rating_integer && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold gradient-teal text-white">
                  <Star className="w-3 h-3 fill-white" />{review.rating_integer}/10
                </span>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {formatDate(review.published_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> {review.language}
              </span>
              {review.translated_from && (
                <span className="flex items-center gap-1.5">
                  Translated from {review.translated_from}
                </span>
              )}
              {review.series_name && (
                <span className="flex items-center gap-1.5">
                  {review.series_name}{review.series_number ? ` #${review.series_number}` : ''}
                </span>
              )}
              {review.reviewer_handle && (
                <span className="flex items-center gap-1.5">
                  <Instagram className="w-4 h-4" />
                  <span style={{ color: 'var(--color-cyan-dark)' }}>{review.reviewer_handle}</span>
                </span>
              )}
            </div>

            {/* Review text */}
            <div className="prose-content">
              {review.review_text.split('\n\n').map((para, i) => (
                <p key={i} className="leading-[1.8] mb-5 text-[15px] md:text-base" style={{ color: 'var(--color-text)' }}>
                  {para}
                </p>
              ))}
            </div>

            {/* Labels */}
            {review.labels.length > 0 && (
              <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {review.labels.map((label) => (
                    <span key={label} className="tag">{label}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="mt-8 p-4 rounded-xl" style={{ background: 'var(--color-paper)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                The R/W Rating reflects the specific reviewer's opinion and doesn't represent a cumulative assessment. A book's impression varies from reader to reader. For a broader perspective, refer to the Goodreads rating.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
