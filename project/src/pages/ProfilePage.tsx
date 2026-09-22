import { useState, useEffect } from 'react';
import { User, Instagram, Mail, Save, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { updateProfile } from '@/lib/reviews';

interface ProfilePageProps {
  navigate: (path: string) => void;
}

export function ProfilePage({ navigate }: ProfilePageProps) {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [instagramId, setInstagramId] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setInstagramId(profile.instagram_id || '');
      setName(profile.name || '');
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="pt-32 container-prose text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-32 container-prose text-center max-w-md mx-auto">
        <User className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
        <h1 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Sign In Required</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>You need to sign in to view your profile.</p>
        <button onClick={() => navigate('/auth')} className="btn-primary">Sign In</button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instagramId.trim() || !name.trim()) {
      setError('Instagram ID and Name are required to submit reviews.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, { instagram_id: instagramId.trim(), name: name.trim() });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-24 pb-20 container-prose animate-fade-in">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-teal flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Your Profile</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Complete your profile to submit reviews. Instagram ID and Name are required.
          </p>
        </div>

        <form onSubmit={handleSave} className="surface-card p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="email"
                value={user.email || ''}
                disabled
                className="input-field pl-10 opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Instagram ID *
            </label>
            <div className="relative">
              <Instagram className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                required
                value={instagramId}
                onChange={(e) => setInstagramId(e.target.value)}
                placeholder="@yourhandle"
                className="input-field pl-10"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(20, 184, 166, 0.1)' }}>
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-teal-dark)' }} />
              <p className="text-sm" style={{ color: 'var(--color-teal-dark)' }}>Profile saved successfully!</p>
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
            {saving ? 'Saving...' : (<><Save className="w-4 h-4" /> Save Profile</>)}
          </button>
        </form>

        <p className="text-xs text-center mt-4" style={{ color: 'var(--color-text-muted)' }}>
          You must complete this profile before submitting a review.
        </p>
      </div>
    </div>
  );
}
