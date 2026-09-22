export interface Review {
  id: string;
  slug: string;
  title: string;
  author: string;
  genre: string;
  traits: string | null;
  language: string;
  review_text: string;
  rw_rating: number;
  goodreads_rating: number | null;
  reviewer_handle: string | null;
  cover_image_url: string | null;
  cover_storage_path: string | null;
  buy_link: string | null;
  labels: string[];
  published_at: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'approved' | 'declined';
  admin_notes: string | null;
  series_name: string | null;
  series_number: number | null;
  translated_from: string | null;
  amazon_rating: number | null;
  review_date: string | null;
  heard_from: string | null;
  rating_integer: number | null;
  undertaking_accepted: boolean;
  user_id: string | null;
}

export interface Profile {
  id: string;
  instagram_id: string | null;
  name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewDraft {
  id: string;
  user_id: string;
  draft_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'declined';
