import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Check, X, Edit3, Trash2, Star, Save,
  Clock, CheckCircle2, XCircle, Search, AlertCircle, Send, Table2, UserCog
} from 'lucide-react';
import type { Review, ReviewStatus } from '@/types/review';
import {
  fetchAllReviewsForAdmin, updateReviewStatus, updateReview, deleteReview
} from '@/lib/reviews';
import { useAuth } from '@/lib/auth';
import { formatShortDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';

interface AdminReviewsPageProps {
  navigate: (path: string) => void;
}

type Tab = 'pending' | 'approved' | 'declined' | 'all' | 'admins';

export function AdminReviewsPage({ navigate }: AdminReviewsPageProps) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Review>>({});
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!isAdmin) return;
    loadReviews();
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, authLoading]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await fetchAllReviewsForAdmin();
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    const { data } = await supabase.from('admin_emails').select('email').order('created_at', { ascending: false });
    setAdminEmails((data ?? []).map((r: { email: string }) => r.email));
  };

  const filtered = useMemo(() => {
    let result = reviews;
    if (tab === 'pending') result = result.filter((r) => r.status === 'pending');
    else if (tab === 'approved') result = result.filter((r) => r.status === 'approved');
    else if (tab === 'declined') result = result.filter((r) => r.status === 'declined');
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
  }, [reviews, tab, search]);

  const counts = useMemo(() => ({
    pending: reviews.filter((r) => r.status === 'pending').length,
    approved: reviews.filter((r) => r.status === 'approved').length,
    declined: reviews.filter((r) => r.status === 'declined').length,
    all: reviews.length,
  }), [reviews]);

  const handleStatusChange = async (id: string, status: ReviewStatus) => {
    try {
      await updateReviewStatus(id, status);
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review permanently? This cannot be undone.')) return;
    try {
      await deleteReview(id);
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review');
    }
  };

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setEditForm({
      title: review.title,
      author: review.author,
      genre: review.genre,
      traits: review.traits || '',
      language: review.language,
      review_text: review.review_text,
      rw_rating: review.rw_rating,
      goodreads_rating: review.goodreads_rating || 0,
      amazon_rating: review.amazon_rating || 0,
      reviewer_handle: review.reviewer_handle || '',
      cover_image_url: review.cover_image_url || '',
      buy_link: review.buy_link || '',
      labels: review.labels,
      published_at: review.published_at,
      status: review.status,
      admin_notes: review.admin_notes || '',
      series_name: review.series_name || '',
      series_number: review.series_number || 0,
      translated_from: review.translated_from || '',
      heard_from: review.heard_from || '',
      rating_integer: review.rating_integer || 0,
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await updateReview(id, editForm);
      setEditingId(null);
      await loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    try {
      setAdminMsg(null);
      const { error } = await supabase.from('admin_emails').insert({ email: newAdminEmail.trim() });
      if (error) throw error;
      setNewAdminEmail('');
      await loadAdmins();
      setAdminMsg(`Added ${newAdminEmail.trim()} as admin`);
    } catch (err) {
      setAdminMsg(err instanceof Error ? err.message : 'Failed to add admin');
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!confirm(`Remove ${email} from admins?`)) return;
    try {
      setAdminMsg(null);
      const { error } = await supabase.from('admin_emails').delete().eq('email', email);
      if (error) throw error;
      await loadAdmins();
      setAdminMsg(`Removed ${email} from admins`);
    } catch (err) {
      setAdminMsg(err instanceof Error ? err.message : 'Failed to remove admin');
    }
  };

  const handlePublish = async (review: Review) => {
    try {
      const { data: existing } = await supabase
        .from('master_list')
        .select('review_no')
        .order('review_no', { ascending: false })
        .limit(1);

      let nextNo = 1;
      if (existing && existing.length > 0) {
        const lastNo = parseInt(existing[0].review_no, 10);
        if (!isNaN(lastNo)) nextNo = lastNo + 1;
      }

      const newRow = {
        review_no: String(nextNo),
        name: review.reviewer_handle || '',
        email: '',
        contact_required: '',
        instagram: review.reviewer_handle || '',
        website: '',
        book_title: review.title,
        author: review.author,
        genre: review.genre,
        series: review.series_name || '',
        book_number: review.series_number ? String(review.series_number) : '',
        language: review.language,
        translated_in: review.translated_from || '',
        reviewers_rating: String(review.rw_rating),
        goodreads_rating: review.goodreads_rating ? String(review.goodreads_rating) : '',
        amazon_rating: review.amazon_rating ? String(review.amazon_rating) : '',
        traits: review.traits || '',
        book_cover: review.cover_image_url || '',
        review: review.review_text,
        amazon_link: review.buy_link || '',
        review_date: review.published_at || '',
        heard_from: review.heard_from || '',
        status: 'Published',
        blogger_draft: '',
      };

      const { error: insertError } = await supabase.from('master_list').insert(newRow);
      if (insertError) throw insertError;

      setPublishedIds((prev) => new Set(prev).add(review.id));
      setPublishMsg(`Review No. ${nextNo} created in Master List for "${review.title}"`);
      setTimeout(() => setPublishMsg(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish to master list');
    }
  };

  if (authLoading) {
    return (
      <div className="pt-32 container-prose text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-32 container-prose text-center">
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>You need to sign in to access the admin panel.</p>
        <button onClick={() => navigate('/auth')} className="btn-primary">Sign In</button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="pt-32 container-prose text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(239, 68, 68, 0.3)' }} />
        <h1 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Access Denied</h1>
        <button onClick={() => navigate('/')} className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Back to Home</button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Clock; count: number }[] = [
    { key: 'pending', label: 'Pending', icon: Clock, count: counts.pending },
    { key: 'approved', label: 'Approved', icon: CheckCircle2, count: counts.approved },
    { key: 'declined', label: 'Declined', icon: XCircle, count: counts.declined },
    { key: 'all', label: 'All', icon: Search, count: counts.all },
    { key: 'admins', label: 'Admins', icon: UserCog, count: adminEmails.length },
  ];

  return (
    <div className="pt-24 pb-20 container-prose animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <button onClick={() => navigate('/admin')} className="inline-flex items-center gap-1.5 text-sm mb-3 transition-colors" style={{ color: 'var(--color-text-muted)' }}>
            <ArrowLeft className="w-4 h-4" /> Admin Dashboard
          </button>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--color-teal-dark)' }} />
            <h1 className="font-serif text-3xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>Accept Reviews</h1>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Review user submissions. Approve to add them to the master list, then publish to make them live.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-xl mb-6" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto" style={{ color: '#ef4444' }}><X className="w-4 h-4" /></button>
        </div>
      )}

      {publishMsg && (
        <div className="flex items-start gap-2 p-4 rounded-xl mb-6" style={{ background: 'rgba(20, 184, 166, 0.08)', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-teal-dark)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-teal-dark)' }}>{publishMsg}</p>
          <button onClick={() => setPublishMsg(null)} className="ml-auto" style={{ color: 'var(--color-teal-dark)' }}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? 'var(--color-teal-dark)' : 'var(--color-surface)',
              color: tab === t.key ? 'white' : 'var(--color-text-muted)',
              border: tab === t.key ? 'none' : '1px solid var(--color-border)',
            }}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: tab === t.key ? 'rgba(255,255,255,0.2)' : 'rgba(13, 148, 136, 0.08)' }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === 'admins' && (
        <div className="max-w-xl space-y-4">
          <div className="surface-card p-6">
            <h3 className="font-serif text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Manage Admin Emails</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Only these email addresses have access to the admin panel.
            </p>
            <div className="flex gap-2 mb-4">
              <input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="newadmin@example.com" className="input-field" />
              <button onClick={handleAddAdmin} className="btn-primary text-sm whitespace-nowrap">
                <UserCog className="w-4 h-4" /> Add
              </button>
            </div>
            {adminMsg && <p className="text-sm mb-3" style={{ color: 'var(--color-cyan-dark)' }}>{adminMsg}</p>}
            <div className="space-y-2">
              {adminEmails.map((email) => (
                <div key={email} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--color-paper)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4" style={{ color: 'var(--color-cyan-dark)' }} />
                    <span className="text-sm" style={{ color: 'var(--color-text)' }}>{email}</span>
                    {email === user.email && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--color-cyan-dark)' }}>You</span>
                    )}
                  </div>
                  <button onClick={() => handleRemoveAdmin(email)} className="transition-colors" style={{ color: 'rgba(239, 68, 68, 0.6)' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab !== 'admins' && (
        <>
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, author, or genre..." className="input-field pl-10" />
          </div>

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--color-paper)' }} />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No {tab !== 'all' ? tab : ''} reviews found.</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((review) => (
                <div key={review.id} className="surface-card overflow-hidden">
                  {editingId === review.id ? (
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Edit Review</h3>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(review.id)} className="btn-primary text-xs px-4 py-2">
                            <Save className="w-3.5 h-3.5" /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="btn-ghost text-xs px-4 py-2">Cancel</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: 'title', label: 'Title' },
                          { key: 'author', label: 'Author' },
                          { key: 'genre', label: 'Genre' },
                          { key: 'language', label: 'Language' },
                          { key: 'reviewer_handle', label: 'Instagram handle' },
                          { key: 'cover_image_url', label: 'Cover image URL' },
                          { key: 'series_name', label: 'Series name' },
                          { key: 'translated_from', label: 'Translated from' },
                          { key: 'heard_from', label: 'Heard from' },
                        ].map((f) => (
                          <input
                            key={f.key}
                            type="text"
                            value={(editForm as Record<string, unknown>)[f.key] as string || ''}
                            onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                            placeholder={f.label}
                            className="input-field"
                          />
                        ))}
                        <input type="number" step="0.1" max="10" value={editForm.rw_rating || 0} onChange={(e) => setEditForm({ ...editForm, rw_rating: Number(e.target.value) })} placeholder="R/W Rating" className="input-field" />
                        <input type="number" step="0.01" max="5" value={editForm.goodreads_rating || 0} onChange={(e) => setEditForm({ ...editForm, goodreads_rating: Number(e.target.value) })} placeholder="Goodreads" className="input-field" />
                        <input type="number" step="0.01" max="5" value={editForm.amazon_rating || 0} onChange={(e) => setEditForm({ ...editForm, amazon_rating: Number(e.target.value) })} placeholder="Amazon" className="input-field" />
                        <input type="number" max="10" value={editForm.rating_integer || 0} onChange={(e) => setEditForm({ ...editForm, rating_integer: Number(e.target.value) })} placeholder="Rating (1-10)" className="input-field" />
                        <input type="date" value={editForm.published_at || ''} onChange={(e) => setEditForm({ ...editForm, published_at: e.target.value })} className="input-field" />
                        <select value={editForm.status || 'pending'} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ReviewStatus })} className="input-field">
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="declined">Declined</option>
                        </select>
                      </div>
                      <textarea rows={5} value={editForm.review_text || ''} onChange={(e) => setEditForm({ ...editForm, review_text: e.target.value })} placeholder="Review text" className="input-field resize-y" />
                      <textarea rows={2} value={editForm.admin_notes || ''} onChange={(e) => setEditForm({ ...editForm, admin_notes: e.target.value })} placeholder="Admin notes (internal)" className="input-field resize-y" />
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-4 p-5">
                      <div className="flex-shrink-0">
                        {review.cover_image_url ? (
                          <img src={review.cover_image_url} alt={review.title} className="w-20 rounded-lg object-cover" style={{ height: '104px' }} />
                        ) : (
                          <div className="w-20 rounded-lg flex items-center justify-center" style={{ height: '104px', background: 'var(--color-paper)' }}>
                            <span className="text-xs text-center px-2" style={{ color: 'var(--color-text-muted)' }}>{review.title.slice(0, 20)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-serif text-lg font-semibold leading-snug" style={{ color: 'var(--color-text)' }}>{review.title}</h3>
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>by {review.author}</p>
                          </div>
                          <StatusBadge status={review.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mb-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" style={{ color: 'var(--color-cyan-dark)' }} />
                            {review.rw_rating.toFixed(1)}/10
                          </span>
                          <span>{review.genre}</span>
                          <span>{formatShortDate(review.published_at)}</span>
                          {review.reviewer_handle && <span style={{ color: 'var(--color-cyan-dark)' }}>{review.reviewer_handle}</span>}
                        </div>
                        <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--color-text)' }}>{review.review_text}</p>
                        {review.traits && (
                          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                            <span className="font-semibold">Traits:</span> {review.traits}
                          </p>
                        )}
                        {review.admin_notes && (
                          <p className="text-xs italic rounded-lg px-3 py-1.5 mb-3" style={{ background: 'rgba(245, 158, 11, 0.08)', color: 'var(--color-text-muted)' }}>
                            Notes: {review.admin_notes}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {review.status !== 'approved' && (
                            <button onClick={() => handleStatusChange(review.id, 'approved')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: 'rgba(20, 184, 166, 0.1)', color: 'var(--color-teal-dark)' }}>
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}
                          {review.status !== 'declined' && (
                            <button onClick={() => handleStatusChange(review.id, 'declined')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                              <X className="w-3.5 h-3.5" /> Decline
                            </button>
                          )}
                          {review.status !== 'pending' && (
                            <button onClick={() => handleStatusChange(review.id, 'pending')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                              <Clock className="w-3.5 h-3.5" /> Mark Pending
                            </button>
                          )}
                          {review.status === 'approved' && (
                            <button
                              onClick={() => handlePublish(review)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{
                                background: publishedIds.has(review.id) ? 'rgba(20, 184, 166, 0.15)' : 'var(--color-teal-dark)',
                                color: 'white',
                              }}
                            >
                              <Send className="w-3.5 h-3.5" /> {publishedIds.has(review.id) ? 'Sent to Master List' : 'Publish to Master List'}
                            </button>
                          )}
                          <button onClick={() => startEdit(review)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: 'rgba(13, 148, 136, 0.06)', color: 'var(--color-text-muted)' }}>
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button onClick={() => handleDelete(review.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ background: 'rgba(239, 68, 68, 0.06)', color: 'rgba(239, 68, 68, 0.6)' }}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const config = {
    pending: { icon: Clock, label: 'Pending', bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
    approved: { icon: CheckCircle2, label: 'Approved', bg: 'rgba(20, 184, 166, 0.1)', text: 'var(--color-teal-dark)' },
    declined: { icon: XCircle, label: 'Declined', bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
  };
  const c = config[status];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      <c.icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}
