import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Send, CheckCircle, Star, PenTool, Search, Upload,
  Save, FolderOpen, Lock, Eye, Edit3, Download, AlertCircle, X,
  Clock, BookOpen, Sparkles
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  submitReview, searchOpenLibrary, uploadCoverImage,
  saveDraft, loadDraft, type OpenLibraryResult
} from '@/lib/reviews';
import type { Review } from '@/types/review';

interface SubmitPageProps {
  navigate: (path: string) => void;
}

const GENRES = [
  'Self-Help', 'Fiction', 'Non-Fiction', 'Mystery', 'Thriller', 'Romance',
  'Drama', 'Poetry', 'Biography', 'Anthology', 'Sports', 'Contemporary Fiction',
  'Psychological Thriller', 'Historical Fiction', 'Other',
];

interface FormState {
  title: string;
  author: string;
  genre: string;
  traits: string;
  language: string;
  review_text: string;
  rw_rating: number;
  goodreads_rating: string;
  amazon_rating: string;
  cover_image_url: string;
  cover_storage_path: string;
  buy_link: string;
  series_name: string;
  series_number: string;
  translated_from: string;
  review_date: string;
  heard_from: string;
  rating_integer: number;
  undertaking_accepted: boolean;
}

const EMPTY_FORM: FormState = {
  title: '', author: '', genre: 'Fiction', traits: '', language: '', review_text: '',
  rw_rating: 7, goodreads_rating: '', amazon_rating: '', cover_image_url: '',
  cover_storage_path: '', buy_link: '', series_name: '', series_number: '',
  translated_from: '', review_date: '', heard_from: '', rating_integer: 7,
  undertaking_accepted: false,
};

export function SubmitPage({ navigate }: SubmitPageProps) {
  const { user, profile, loading: authLoading } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);

  // Open Library search
  const [olQuery, setOlQuery] = useState('');
  const [olResults, setOlResults] = useState<OpenLibraryResult[]>([]);
  const [olSearching, setOlSearching] = useState(false);

  // Cover upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Post-submit edit window
  const [submittedReview, setSubmittedReview] = useState<Review | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [editTimeLeft, setEditTimeLeft] = useState(300); // 5 minutes in seconds
  const [editExpired, setEditExpired] = useState(false);

  const update = (field: keyof FormState, value: string | number | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  // Edit countdown timer
  useEffect(() => {
    if (!submittedReview || editExpired) return;
    if (editTimeLeft <= 0) {
      setEditExpired(true);
      setEditMode(false);
      return;
    }
    const timer = setTimeout(() => setEditTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [submittedReview, editTimeLeft, editExpired]);

  // Check if page was refreshed after submit
  useEffect(() => {
    if (submittedReview && performance.navigation) {
      // On refresh, lock editing
      setEditMode(false);
    }
  }, [submittedReview]);

  const handleOpenLibrarySearch = useCallback(async () => {
    if (!olQuery.trim()) return;
    setOlSearching(true);
    try {
      const results = await searchOpenLibrary(olQuery.trim());
      setOlResults(results);
    } catch {
      setOlResults([]);
    } finally {
      setOlSearching(false);
    }
  }, [olQuery]);

  const fillFromOpenLibrary = (result: OpenLibraryResult) => {
    update('title', result.title);
    update('author', result.author);
    if (result.coverUrl) {
      update('cover_image_url', result.coverUrl);
      setCoverPreview(result.coverUrl);
    }
    if (result.subjects.length > 0) update('traits', result.subjects.join(', '));
    setOlResults([]);
    setOlQuery('');
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setError(null);
      const { path, publicUrl } = await uploadCoverImage(file, user.id);
      update('cover_storage_path', path);
      update('cover_image_url', publicUrl);
      setCoverPreview(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    }
  };

  const handleSaveDraft = async () => {
    if (!user) {
      setError('Sign in to save drafts.');
      return;
    }
    try {
      await saveDraft(form as unknown as Record<string, unknown>);
      setDraftMsg('Draft saved!');
      setTimeout(() => setDraftMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    }
  };

  const handleLoadDraft = async () => {
    if (!user) {
      setError('Sign in to load drafts.');
      return;
    }
    try {
      const draft = await loadDraft();
      if (draft) {
        setForm({ ...EMPTY_FORM, ...(draft as unknown as Partial<FormState>) });
        if ((draft as { cover_image_url?: string }).cover_image_url) {
          setCoverPreview((draft as { cover_image_url?: string }).cover_image_url!);
        }
        setDraftMsg('Draft loaded!');
        setTimeout(() => setDraftMsg(null), 3000);
      } else {
        setDraftMsg('No saved draft found.');
        setTimeout(() => setDraftMsg(null), 3000);
      }
    } catch {
      setDraftMsg('Failed to load draft.');
      setTimeout(() => setDraftMsg(null), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must sign in to submit a review.');
      navigate('/auth');
      return;
    }

    if (!profile?.instagram_id || !profile?.name) {
      setError('Complete your profile (Instagram ID and Name) before submitting.');
      navigate('/profile');
      return;
    }

    if (!form.language.trim()) {
      setError('Language is required.');
      return;
    }

    if (!form.undertaking_accepted) {
      setError('You must accept the undertaking to submit.');
      return;
    }

    if (form.goodreads_rating && Number(form.goodreads_rating) > 5) {
      setError('Goodreads rating must be 5 or less.');
      return;
    }

    if (form.amazon_rating && Number(form.amazon_rating) > 5) {
      setError('Amazon rating must be 5 or less.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const review = await submitReview({
        title: form.title.trim(),
        author: form.author.trim(),
        genre: form.genre,
        traits: form.traits.trim() || undefined,
        language: form.language.trim(),
        review_text: form.review_text.trim(),
        rw_rating: form.rw_rating,
        goodreads_rating: form.goodreads_rating ? Number(form.goodreads_rating) : undefined,
        amazon_rating: form.amazon_rating ? Number(form.amazon_rating) : undefined,
        reviewer_handle: profile.instagram_id || undefined,
        cover_image_url: form.cover_image_url.trim() || undefined,
        cover_storage_path: form.cover_storage_path.trim() || undefined,
        buy_link: form.buy_link.trim() || undefined,
        series_name: form.series_name.trim() || undefined,
        series_number: form.series_number ? Number(form.series_number) : undefined,
        translated_from: form.translated_from.trim() || undefined,
        review_date: form.review_date || undefined,
        heard_from: form.heard_from.trim() || undefined,
        rating_integer: form.rating_integer,
        undertaking_accepted: form.undertaking_accepted,
      });
      setSubmittedReview(review);
      setEditTimeLeft(300);
      setSuccess(true);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Failed to submit review';
      const friendly = raw.includes('duplicate key value')
        ? 'A review with this title already exists. Try adding a subtitle or slight variation.'
        : raw;
      setError(friendly);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!submittedReview || editExpired) return;
    try {
      setSubmitting(true);
      const { error: updateError } = await supabase
        .from('reviews')
        .update({
          title: form.title,
          author: form.author,
          genre: form.genre,
          traits: form.traits || null,
          language: form.language,
          review_text: form.review_text,
          rw_rating: form.rw_rating,
          goodreads_rating: form.goodreads_rating ? Number(form.goodreads_rating) : null,
          amazon_rating: form.amazon_rating ? Number(form.amazon_rating) : null,
          series_name: form.series_name || null,
          series_number: form.series_number ? Number(form.series_number) : null,
          translated_from: form.translated_from || null,
          review_date: form.review_date || null,
          heard_from: form.heard_from || null,
          rating_integer: form.rating_integer,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submittedReview.id);
      if (updateError) throw updateError;
      setEditMode(false);
      setDraftMsg('Review updated!');
      setTimeout(() => setDraftMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update review');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadIGPoster = async () => {
    if (!submittedReview) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ig-poster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: submittedReview.title,
          author: submittedReview.author,
          reviewer: profile?.instagram_id || profile?.name || '',
          rating: submittedReview.rw_rating,
        }),
      });
      const data = await res.json();
      if (data.svg) {
        const blob = new Blob([data.svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ig-poster-${submittedReview.slug}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError('Failed to generate IG poster.');
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Success screen with edit/preview/download
  if (success && submittedReview) {
    return (
      <div className="pt-32 pb-20 container-prose">
        <div className="max-w-2xl mx-auto animate-scale-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(20, 184, 166, 0.15)' }}>
              <CheckCircle className="w-10 h-10" style={{ color: 'var(--color-teal-dark)' }} />
            </div>
            <h1 className="font-serif text-3xl font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Review Submitted!</h1>
            <p className="mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Your review has been submitted for moderation. An admin will review it before it appears on the site.
            </p>

            {/* Edit countdown */}
            {!editExpired && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                <Clock className="w-4 h-4" style={{ color: '#d97706' }} />
                <span className="text-sm font-medium" style={{ color: '#d97706' }}>
                  Edit window: {formatTime(editTimeLeft)}
                </span>
              </div>
            )}
            {editExpired && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
                <Lock className="w-4 h-4" style={{ color: '#ef4444' }} />
                <span className="text-sm font-medium" style={{ color: '#ef4444' }}>Edit window expired</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {!editExpired && !editMode && !previewMode && (
              <button onClick={() => setEditMode(true)} className="btn-primary">
                <Edit3 className="w-4 h-4" /> Edit Review
              </button>
            )}
            <button onClick={() => setPreviewMode(!previewMode)} className="btn-ghost">
              <Eye className="w-4 h-4" /> {previewMode ? 'Hide Preview' : 'Preview'}
            </button>
            <button onClick={downloadIGPoster} className="btn-ghost">
              <Download className="w-4 h-4" /> Download IG Poster
            </button>
            <button onClick={() => navigate('/')} className="btn-ghost">
              Back to Home
            </button>
          </div>

          {/* Preview mode */}
          {previewMode && (
            <div className="surface-card p-6 space-y-4 animate-fade-in">
              <h3 className="font-serif text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Preview (Read Only)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {coverPreview && (
                  <div className="md:col-span-1">
                    <img src={coverPreview} alt={form.title} className="w-full rounded-xl object-cover" />
                  </div>
                )}
                <div className={coverPreview ? 'md:col-span-2' : 'md:col-span-3'}>
                  <PreviewField label="Title" value={form.title} />
                  <PreviewField label="Author" value={form.author} />
                  <PreviewField label="Genre" value={form.genre} />
                  <PreviewField label="Language" value={form.language} />
                  <PreviewField label="Rating" value={`${form.rating_integer}/10`} />
                  <PreviewField label="Goodreads" value={form.goodreads_rating || 'N/A'} />
                  <PreviewField label="Amazon" value={form.amazon_rating || 'N/A'} />
                  {form.series_name && <PreviewField label="Series" value={`${form.series_name}${form.series_number ? ` #${form.series_number}` : ''}`} />}
                  {form.translated_from && <PreviewField label="Translated From" value={form.translated_from} />}
                  {form.review_date && <PreviewField label="Review Date" value={form.review_date} />}
                  {form.heard_from && <PreviewField label="Heard From" value={form.heard_from} />}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Review</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{form.review_text}</p>
              </div>
            </div>
          )}

          {/* Edit mode */}
          {editMode && !editExpired && (
            <div className="surface-card p-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Edit Your Review</h3>
                <span className="text-sm" style={{ color: '#d97706' }}>{formatTime(editTimeLeft)} left</span>
              </div>
              <SubmitFormFields
                form={form}
                update={update}
                coverPreview={coverPreview}
                fileInputRef={fileInputRef}
                onCoverUpload={handleCoverUpload}
              />
              <div className="flex gap-3">
                <button onClick={handleEditSubmit} disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Saving...' : (<><Save className="w-4 h-4" /> Save Changes</>)}
                </button>
                <button onClick={() => setEditMode(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {draftMsg && (
            <p className="text-center text-sm" style={{ color: 'var(--color-teal-dark)' }}>{draftMsg}</p>
          )}
          {error && (
            <div className="flex items-start gap-2 p-4 rounded-xl mt-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="pt-32 container-prose text-center">
        <div className="w-10 h-10 rounded-full mx-auto mb-4 animate-spin border-2 border-transparent" style={{ borderTopColor: 'var(--color-teal-dark)', borderBottomColor: 'var(--color-teal-dark)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
      </div>
    );
  }

  // Auth gate
  if (!user) {
    return (
      <div className="pt-32 container-prose text-center max-w-md mx-auto">
        <PenTool className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
        <h1 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Sign In Required</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>You need an account to submit a review.</p>
        <button onClick={() => navigate('/auth')} className="btn-primary">Sign In / Sign Up</button>
      </div>
    );
  }

  // Profile gate — if profile hasn't loaded yet, show loading; if loaded but incomplete, show gate
  if (user && !profile) {
    return (
      <div className="pt-32 container-prose text-center">
        <div className="w-10 h-10 rounded-full mx-auto mb-4 animate-spin border-2 border-transparent" style={{ borderTopColor: 'var(--color-teal-dark)', borderBottomColor: 'var(--color-teal-dark)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading your profile...</p>
      </div>
    );
  }

  if (user && profile && (!profile.instagram_id || !profile.name)) {
    return (
      <div className="pt-32 container-prose text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(245, 158, 11, 0.4)' }} />
        <h1 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Complete Your Profile</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          You need to add your Instagram ID and Name before submitting a review.
        </p>
        <button onClick={() => navigate('/profile')} className="btn-primary">Go to Profile</button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 container-prose animate-fade-in">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5" style={{ background: 'rgba(13, 148, 136, 0.1)' }}>
            <PenTool className="w-3.5 h-3.5" style={{ color: 'var(--color-teal-dark)' }} />
            <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--color-teal-dark)' }}>Community Submission</span>
          </div>
          <h1 className="font-serif text-4xl font-semibold mb-3 tracking-tight" style={{ color: 'var(--color-text)' }}>Submit a Book Review</h1>
          <p className="leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Got a book that hit different? Search for it, fill in the details, and submit.
          </p>
        </div>

        {/* Open Library Search */}
        <div className="surface-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4" style={{ color: 'var(--color-teal-dark)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Quick Search & Auto-Fill</h3>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Search Open Library to auto-fill book details and cover image.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={olQuery}
              onChange={(e) => setOlQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleOpenLibrarySearch())}
              placeholder="Search by title or author..."
              className="input-field"
            />
            <button onClick={handleOpenLibrarySearch} disabled={olSearching} className="btn-ghost whitespace-nowrap">
              {olSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {olResults.length > 0 && (
            <div className="mt-3 space-y-2 animate-fade-in">
              {olResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => fillFromOpenLibrary(r)}
                  className="flex items-center gap-3 w-full text-left p-3 rounded-xl transition-colors hover:bg-[rgba(13,148,136,0.05)]"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  {r.coverUrl ? (
                    <img src={r.coverUrl} alt={r.title} className="w-10 h-14 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-14 rounded gradient-teal flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{r.title}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{r.author}{r.publishYear ? ` · ${r.publishYear}` : ''}</p>
                  </div>
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--color-teal-dark)' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Draft controls */}
        <div className="flex gap-2 mb-6">
          <button onClick={handleSaveDraft} className="btn-ghost text-sm flex-1">
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button onClick={handleLoadDraft} className="btn-ghost text-sm flex-1">
            <FolderOpen className="w-4 h-4" /> Load Draft
          </button>
        </div>

        {draftMsg && (
          <p className="text-center text-sm mb-4" style={{ color: 'var(--color-teal-dark)' }}>{draftMsg}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <SubmitFormFields
            form={form}
            update={update}
            coverPreview={coverPreview}
            fileInputRef={fileInputRef}
            onCoverUpload={handleCoverUpload}
          />

          {/* Rating buttons 1-10 */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Your Rating (1-10, no decimals) *
            </label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update('rating_integer', n)}
                  className="w-10 h-10 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: form.rating_integer === n ? 'var(--color-teal-dark)' : 'var(--color-surface)',
                    color: form.rating_integer === n ? 'white' : 'var(--color-text-muted)',
                    border: form.rating_integer === n ? 'none' : '1px solid var(--color-border)',
                    transform: form.rating_integer === n ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Heard from */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Where did you hear about Novelty Library? *
            </label>
            <input
              type="text"
              required
              value={form.heard_from}
              onChange={(e) => update('heard_from', e.target.value)}
              placeholder="Instagram, friend, Google, etc."
              className="input-field"
            />
          </div>

          {/* Undertaking */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={form.undertaking_accepted}
                onChange={(e) => update('undertaking_accepted', e.target.checked)}
                className="mt-1 w-5 h-5 rounded accent-teal-600"
              />
              <span className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
                I confirm this review is my original opinion. I understand the R/W Rating reflects my personal view, not a cumulative assessment. I accept the undertaking.
              </span>
            </label>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
              <button onClick={() => setError(null)} className="ml-auto" style={{ color: '#ef4444' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Submitting...' : (<><Send className="w-4 h-4" /> Submit Review</>)}
          </button>
        </form>
      </div>
    </div>
  );
}

function SubmitFormFields({
  form, update, coverPreview, fileInputRef, onCoverUpload,
}: {
  form: FormState;
  update: (field: keyof FormState, value: string | number | boolean) => void;
  coverPreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Cover upload + preview */}
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          {coverPreview ? (
            <img src={coverPreview} alt="Cover preview" className="w-24 h-32 rounded-xl object-cover" />
          ) : (
            <div className="w-24 h-32 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-paper)' }}>
              <BookOpen className="w-8 h-8" style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onCoverUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost text-sm"
          >
            <Upload className="w-4 h-4" /> Upload Cover Image
          </button>
          <input
            type="url"
            value={form.cover_image_url}
            onChange={(e) => update('cover_image_url', e.target.value)}
            placeholder="Or paste image URL"
            className="input-field text-xs"
          />
        </div>
      </div>

      {/* Title + Author */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Book Title *</label>
          <input required type="text" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Book title" className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Author *</label>
          <input required type="text" value={form.author} onChange={(e) => update('author', e.target.value)} placeholder="Author name" className="input-field" />
        </div>
      </div>

      {/* Genre + Language (compulsory) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Genre *</label>
          <select value={form.genre} onChange={(e) => update('genre', e.target.value)} className="input-field">
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Language *</label>
          <input required type="text" value={form.language} onChange={(e) => update('language', e.target.value)} placeholder="English" className="input-field" />
        </div>
      </div>

      {/* Series name + number (optional) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Series Name (optional)</label>
          <input type="text" value={form.series_name} onChange={(e) => update('series_name', e.target.value)} placeholder="e.g. Harry Potter" className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Series Number (optional)</label>
          <input type="number" min="1" value={form.series_number} onChange={(e) => update('series_number', e.target.value)} placeholder="e.g. 1" className="input-field" />
        </div>
      </div>

      {/* Translated from (optional) */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Translated From (optional)</label>
        <input type="text" value={form.translated_from} onChange={(e) => update('translated_from', e.target.value)} placeholder="Original language, e.g. Spanish" className="input-field" />
      </div>

      {/* Traits */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Traits (comma-separated)</label>
        <input type="text" value={form.traits} onChange={(e) => update('traits', e.target.value)} placeholder="Themes, topics" className="input-field" />
      </div>

      {/* Review text */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Your Review *</label>
        <textarea required rows={6} value={form.review_text} onChange={(e) => update('review_text', e.target.value)} placeholder="Share your honest take..." className="input-field resize-y leading-relaxed" />
      </div>

      {/* Ratings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>R/W Rating (out of 10) *</label>
          <div className="flex items-center gap-3">
            <input type="range" min="0" max="10" step="0.1" value={form.rw_rating} onChange={(e) => update('rw_rating', Number(e.target.value))} className="flex-1 accent-teal-600" />
            <div className="flex items-center gap-1 px-3 py-2 rounded-lg gradient-teal text-white font-bold text-sm min-w-[60px] justify-center">
              <Star className="w-3.5 h-3.5 fill-white" />{form.rw_rating.toFixed(1)}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Goodreads (max 5)</label>
          <input type="number" min="0" max="5" step="0.01" value={form.goodreads_rating} onChange={(e) => update('goodreads_rating', e.target.value)} placeholder="4.1" className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Amazon (max 5, optional)</label>
          <input type="number" min="0" max="5" step="0.01" value={form.amazon_rating} onChange={(e) => update('amazon_rating', e.target.value)} placeholder="4.5" className="input-field" />
        </div>
      </div>

      {/* Review date + buy link */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Review Date (optional)</label>
          <input type="date" value={form.review_date} onChange={(e) => update('review_date', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Buy Link (optional)</label>
          <input type="url" value={form.buy_link} onChange={(e) => update('buy_link', e.target.value)} placeholder="https://..." className="input-field" />
        </div>
      </div>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}: </span>
      <span className="text-sm" style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}
