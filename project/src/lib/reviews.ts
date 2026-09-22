import { supabase } from '@/lib/supabase';
import type { Review, ReviewStatus, Profile } from '@/types/review';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function uniqueSlug(title: string): string {
  const base = slugify(title);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export async function fetchReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('status', 'approved')
    .order('published_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function fetchReviewBySlug(slug: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as Review | null;
}

export async function fetchGenres(): Promise<string[]> {
  const reviews = await fetchReviews();
  const genres = new Set(reviews.map((r) => r.genre));
  return Array.from(genres).sort();
}

export interface OpenLibraryResult {
  title: string;
  author: string;
  coverUrl: string | null;
  isbn: string | null;
  publishYear: number | null;
  subjects: string[];
}

export async function searchOpenLibrary(query: string): Promise<OpenLibraryResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Open Library search failed');
  const json = await res.json();
  const docs = (json.docs ?? []) as Array<{
    title: string;
    author_name?: string[];
    cover_i?: number;
    isbn?: string[];
    first_publish_year?: number;
    subject?: string[];
  }>;
  return docs.map((d) => ({
    title: d.title || '',
    author: d.author_name?.[0] || '',
    coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    isbn: d.isbn?.[0] || null,
    publishYear: d.first_publish_year || null,
    subjects: (d.subject || []).slice(0, 5),
  }));
}

export async function uploadCoverImage(file: File, userId: string): Promise<{ path: string; publicUrl: string }> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('covers').upload(fileName, file, { contentType: file.type });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('covers').getPublicUrl(fileName);
  return { path: fileName, publicUrl: urlData.publicUrl };
}

export async function submitReview(input: {
  title: string;
  author: string;
  genre: string;
  traits?: string;
  language: string;
  review_text: string;
  rw_rating: number;
  goodreads_rating?: number;
  amazon_rating?: number;
  reviewer_handle?: string;
  cover_image_url?: string;
  cover_storage_path?: string;
  buy_link?: string;
  labels?: string[];
  series_name?: string;
  series_number?: number;
  translated_from?: string;
  review_date?: string;
  heard_from?: string;
  rating_integer?: number;
  undertaking_accepted?: boolean;
}): Promise<Review> {
  const slug = uniqueSlug(input.title);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id || null;

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      slug,
      title: input.title,
      author: input.author,
      genre: input.genre,
      traits: input.traits || null,
      language: input.language || 'English',
      review_text: input.review_text,
      rw_rating: input.rw_rating,
      goodreads_rating: input.goodreads_rating || null,
      amazon_rating: input.amazon_rating || null,
      reviewer_handle: input.reviewer_handle || null,
      cover_image_url: input.cover_image_url || null,
      cover_storage_path: input.cover_storage_path || null,
      buy_link: input.buy_link || null,
      labels: input.labels || [],
      published_at: new Date().toISOString().slice(0, 10),
      status: 'pending',
      series_name: input.series_name || null,
      series_number: input.series_number || null,
      translated_from: input.translated_from || null,
      review_date: input.review_date || null,
      heard_from: input.heard_from || null,
      rating_integer: input.rating_integer || null,
      undertaking_accepted: input.undertaking_accepted || false,
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Review;
}

export async function fetchAllReviewsForAdmin(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function updateReviewStatus(id: string, status: ReviewStatus, adminNotes?: string): Promise<void> {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (adminNotes !== undefined) update.admin_notes = adminNotes;
  const { error } = await supabase.from('reviews').update(update).eq('id', id);
  if (error) throw error;
}

export async function updateReview(
  id: string,
  fields: Partial<Review>
): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) throw error;
}

export async function saveDraft(draftData: Record<string, unknown>): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Must be signed in to save drafts');

  const { data: existing } = await supabase
    .from('review_drafts')
    .select('id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('review_drafts')
      .update({ draft_data: draftData, updated_at: new Date().toISOString() })
      .eq('id', (existing as { id: string }).id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('review_drafts')
      .insert({ draft_data: draftData, user_id: userData.user.id });
    if (error) throw error;
  }
}

export async function loadDraft(): Promise<Record<string, unknown> | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('review_drafts')
    .select('draft_data')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error) return null;
  return (data as { draft_data: Record<string, unknown> } | null)?.draft_data ?? null;
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();
  if (error) return null;
  return data as Profile | null;
}

export async function updateProfile(uid: string, fields: Partial<Profile>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', uid);
  if (error) throw error;
}
