import { BookOpen, Users, PenTool, Sparkles, Heart, ArrowRight } from 'lucide-react';

interface AboutPageProps {
  navigate: (path: string) => void;
}

export function AboutPage({ navigate }: AboutPageProps) {
  return (
    <div className="pt-24 pb-20 container-prose animate-fade-in">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: 'rgba(13, 148, 136, 0.1)' }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-teal-dark)' }} />
            <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--color-teal-dark)' }}>Our Story</span>
          </div>
          <h1 className="font-serif text-5xl font-semibold leading-tight tracking-tight mb-6 text-balance" style={{ color: 'var(--color-text)' }}>
            Books that mess with your head, reviewed honestly.
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Novelty Library began as a simple question: "What book broke your brain this month?" We're tired of typing "Books to read" and "Best book recommendations" into Google, so we built a home for honest, community-driven book reviews.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            { icon: BookOpen, title: 'Honest Takes', desc: 'Every review is a real reader\'s opinion. No paid promotions, no inflated ratings — just genuine reactions to books that left a mark.', delay: '0ms' },
            { icon: Users, title: 'Community Driven', desc: 'Anyone can submit a review. We tag you on Instagram and turn your take into a Novelty Review for the world to discover.', delay: '100ms' },
            { icon: Heart, title: 'Every Genre', desc: 'Fiction, non-fiction, mystery, romance, thrillers, classics — we cover it all. If it\'s a book, it belongs in the library.', delay: '200ms' },
          ].map((v) => (
            <div key={v.title} className="surface-card p-6 animate-fade-up" style={{ animationDelay: v.delay }}>
              <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: 'rgba(13, 148, 136, 0.1)' }}>
                <v.icon className="w-6 h-6" style={{ color: 'var(--color-teal-dark)' }} />
              </div>
              <h3 className="font-serif text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{v.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="mb-16">
          <h2 className="font-serif text-3xl font-semibold mb-8 text-center" style={{ color: 'var(--color-text)' }}>How It Works</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Read a book', desc: 'Pick up something that catches your eye. Fiction, non-fiction, poetry — anything goes.' },
              { step: '2', title: 'Write your take', desc: 'Submit your review through our form. No essays needed — just your honest, two-minute take.' },
              { step: '3', title: 'Get featured', desc: 'We publish your review to the library and tag you on Instagram. Your take helps other readers discover their next great read.' },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-4 p-5 surface-card">
                <div className="flex-shrink-0 w-8 h-8 rounded-full gradient-teal text-white flex items-center justify-center text-sm font-bold">
                  {s.step}
                </div>
                <div>
                  <h4 className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>{s.title}</h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center p-10 rounded-3xl gradient-teal text-white">
          <PenTool className="w-8 h-8 text-white/70 mx-auto mb-4" />
          <h2 className="font-serif text-3xl font-semibold mb-3">Got a book that hit different?</h2>
          <p className="text-white/70 leading-relaxed mb-6 max-w-md mx-auto">
            Drop it here. No spam, just vibes — follow for more two-minute book takes that'll mess with your head.
          </p>
          <button onClick={() => navigate('/submit')} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm tracking-wide bg-white/15 hover:bg-white/25 transition-all duration-300">
            Submit Your Review <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
