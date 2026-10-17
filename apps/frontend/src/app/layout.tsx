import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/common/Toast';
import { ThemeProvider } from '@/components/common/ThemeProvider';
import { Navbar } from '@/components/common/Navbar';

export const metadata: Metadata = {
  title: 'Trippy - Trip Planning & Roulette App',
  description:
    'Plan trips, discover places, attach files, calculate distances, and run weighted roulettes with RBAC protection.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        {/* Anti-FOUC theme detector */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('trippy_theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#F7F5F0] text-[#111111] dark:bg-[#0E1013] dark:text-[#F7F5F0] antialiased selection:bg-[#E63329] selection:text-white transition-colors duration-150">
        <ThemeProvider>
          <ToastProvider>
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {children}
            </main>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
