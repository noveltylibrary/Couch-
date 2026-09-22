import { useEffect, useState, useCallback } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'reviews' }
  | { name: 'review'; slug: string }
  | { name: 'submit' }
  | { name: 'about' }
  | { name: 'auth' }
  | { name: 'admin' }
  | { name: 'admin-reviews' }
  | { name: 'admin-master-list' }
  | { name: 'admin-posters' }
  | { name: 'profile' }
  | { name: 'genre'; genre: string };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash || hash === '') return { name: 'home' };
  const parts = hash.split('/');
  if (parts[0] === 'review' && parts[1]) return { name: 'review', slug: decodeURIComponent(parts[1]) };
  if (parts[0] === 'submit') return { name: 'submit' };
  if (parts[0] === 'about') return { name: 'about' };
  if (parts[0] === 'auth') return { name: 'auth' };
  if (parts[0] === 'admin') {
    if (parts[1] === 'reviews') return { name: 'admin-reviews' };
    if (parts[1] === 'master-list') return { name: 'admin-master-list' };
    if (parts[1] === 'posters') return { name: 'admin-posters' };
    return { name: 'admin' };
  }
  if (parts[0] === 'profile') return { name: 'profile' };
  if (parts[0] === 'reviews') return { name: 'reviews' };
  if (parts[0] === 'genre' && parts[1]) return { name: 'genre', genre: decodeURIComponent(parts[1]) };
  return { name: 'home' };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  return { route, navigate };
}
