import { BookOpen, Menu, X, Shield, Moon, Sun, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useTheme } from '@/lib/theme';

interface HeaderProps {
  navigate: (path: string) => void;
  currentRoute: string;
  user: SupabaseUser | null;
  isAdmin: boolean;
}

export function Header({ navigate, currentRoute, user, isAdmin }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { label: 'Home', path: '/', route: 'home' },
    { label: 'Reviews', path: '/reviews', route: 'reviews' },
    { label: 'Submit', path: '/submit', route: 'submit' },
    { label: 'About', path: '/about', route: 'about' },
  ];

  const handleNav = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'backdrop-blur-md shadow-sm py-3'
          : 'bg-transparent py-5'
      }`}
      style={{
        backgroundColor: scrolled ? 'var(--color-bg)' : 'transparent',
        opacity: scrolled ? 0.95 : 1,
      }}
    >
      <div className="container-prose flex items-center justify-between">
        <button onClick={() => handleNav('/')} className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <BookOpen className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div className="text-left">
            <h1 className="font-serif text-xl font-semibold leading-none tracking-tight" style={{ color: 'var(--color-text)' }}>
              Novelty Library
            </h1>
            <p className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Book Reviews
            </p>
          </div>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
              style={{
                color: currentRoute === item.route ? 'var(--color-text)' : 'var(--color-text-muted)',
                backgroundColor: currentRoute === item.route ? 'rgba(13, 148, 136, 0.08)' : 'transparent',
              }}
            >
              {item.label}
            </button>
          ))}
          {user && (
            <button
              onClick={() => handleNav('/profile')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                color: currentRoute === 'profile' ? 'var(--color-text)' : 'var(--color-text-muted)',
                backgroundColor: currentRoute === 'profile' ? 'rgba(13, 148, 136, 0.08)' : 'transparent',
              }}
            >
              <User className="w-3.5 h-3.5" /> Profile
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => handleNav('/admin')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                color: currentRoute.startsWith('admin') ? 'white' : 'var(--color-teal-dark)',
                backgroundColor: currentRoute.startsWith('admin') ? 'var(--color-teal-dark)' : 'rgba(13, 148, 136, 0.08)',
              }}
            >
              <Shield className="w-3.5 h-3.5" /> Admin
            </button>
          )}
          {!user && (
            <button
              onClick={() => handleNav('/auth')}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{ color: 'var(--color-cyan-dark)' }}
            >
              Sign In
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </nav>

        <div className="flex md:hidden items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button className="p-2 rounded-lg" onClick={() => setMenuOpen(!menuOpen)} style={{ color: 'var(--color-text)' }}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden container-prose mt-3 animate-fade-in">
          <nav className="flex flex-col gap-1 surface-card p-3 shadow-lg">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className="px-4 py-3 rounded-xl text-sm font-medium text-left transition-colors"
                style={{
                  color: currentRoute === item.route ? 'var(--color-text)' : 'var(--color-text-muted)',
                  backgroundColor: currentRoute === item.route ? 'rgba(13, 148, 136, 0.08)' : 'transparent',
                }}
              >
                {item.label}
              </button>
            ))}
            {user && (
              <button onClick={() => handleNav('/profile')} className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-left" style={{ color: 'var(--color-text-muted)' }}>
                <User className="w-3.5 h-3.5" /> Profile
              </button>
            )}
            {isAdmin && (
              <button onClick={() => handleNav('/admin')} className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-left" style={{ color: 'var(--color-teal-dark)' }}>
                <Shield className="w-3.5 h-3.5" /> Admin Panel
              </button>
            )}
            {!user && (
              <button onClick={() => handleNav('/auth')} className="px-4 py-3 rounded-xl text-sm font-medium text-left" style={{ color: 'var(--color-cyan-dark)' }}>
                Sign In
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
