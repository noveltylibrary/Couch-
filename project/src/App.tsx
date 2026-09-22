import { useRouter } from '@/lib/router';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HomePage } from '@/pages/HomePage';
import { ReviewsPage } from '@/pages/ReviewsPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { SubmitPage } from '@/pages/SubmitPage';
import { AboutPage } from '@/pages/AboutPage';
import { AuthPage } from '@/pages/AuthPage';
import { AdminHubPage } from '@/pages/AdminHubPage';
import { AdminReviewsPage } from '@/pages/AdminReviewsPage';
import { AdminMasterListPage } from '@/pages/AdminMasterListPage';
import { AdminPostersPage } from '@/pages/AdminPostersPage';
import { ProfilePage } from '@/pages/ProfilePage';

function AppContent() {
  const { route, navigate } = useRouter();
  const { user, isAdmin } = useAuth();

  const currentRouteName = route.name;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Header navigate={navigate} currentRoute={currentRouteName} user={user} isAdmin={isAdmin} />
      <main className="flex-1">
        {route.name === 'home' && <HomePage navigate={navigate} />}
        {route.name === 'reviews' && <ReviewsPage navigate={navigate} />}
        {route.name === 'review' && <ReviewPage slug={route.slug} navigate={navigate} />}
        {route.name === 'submit' && <SubmitPage navigate={navigate} />}
        {route.name === 'about' && <AboutPage navigate={navigate} />}
        {route.name === 'auth' && <AuthPage navigate={navigate} />}
        {route.name === 'admin' && <AdminHubPage navigate={navigate} />}
        {route.name === 'admin-reviews' && <AdminReviewsPage navigate={navigate} />}
        {route.name === 'admin-master-list' && <AdminMasterListPage navigate={navigate} />}
        {route.name === 'admin-posters' && <AdminPostersPage navigate={navigate} />}
        {route.name === 'profile' && <ProfilePage navigate={navigate} />}
        {route.name === 'genre' && <ReviewsPage navigate={navigate} />}
      </main>
      <Footer navigate={navigate} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
