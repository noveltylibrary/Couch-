import { Shield, ClipboardList, FolderOpen, CheckCircle2, ArrowLeft, LogOut, UserCog } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface AdminHubPageProps {
  navigate: (path: string) => void;
}

export function AdminHubPage({ navigate }: AdminHubPageProps) {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();

  if (authLoading) {
    return (
      <div className="pt-32 container-prose text-center">
        <div className="w-10 h-10 rounded-full mx-auto mb-4 animate-spin border-2 border-transparent" style={{ borderTopColor: 'var(--color-teal-dark)', borderBottomColor: 'var(--color-teal-dark)' }} />
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
        <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(239, 68, 68, 0.3)' }} />
        <h1 className="font-serif text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Access Denied</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Your account doesn't have admin access. Only emails registered as admins can access this panel.
        </p>
        <button onClick={() => navigate('/')} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>
    );
  }

  const cards = [
    {
      title: 'Master NL BR List',
      desc: 'View and manage the complete book review master list synced from the Google Sheet.',
      icon: ClipboardList,
      path: '/admin/master-list',
      gradient: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
    },
    {
      title: 'Posters Folder',
      desc: 'Access the Google Drive folder containing all review poster images.',
      icon: FolderOpen,
      path: '/admin/posters',
      gradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
    },
    {
      title: 'Accept Reviews',
      desc: 'Review and approve user-submitted book reviews. Approved reviews are added to the master list.',
      icon: CheckCircle2,
      path: '/admin/reviews',
      gradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    },
  ];

  return (
    <div className="pt-24 pb-20 container-prose animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5" style={{ color: 'var(--color-teal-dark)' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-teal-dark)' }}>Admin Dashboard</span>
          </div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>Welcome back</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>Signed in as {user.email}</p>
        </div>
        <button onClick={async () => { await signOut(); navigate('/'); }} className="btn-ghost text-sm">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className="group text-left p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl animate-fade-up"
            style={{
              animationDelay: `${i * 100}ms`,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="w-14 h-14 rounded-2xl mb-5 flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: card.gradient }}>
              <card.icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-serif text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{card.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{card.desc}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium transition-all group-hover:gap-2.5" style={{ color: 'var(--color-teal-dark)' }}>
              Open <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-10">
        <button onClick={() => navigate('/')} className="btn-ghost text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>
    </div>
  );
}
