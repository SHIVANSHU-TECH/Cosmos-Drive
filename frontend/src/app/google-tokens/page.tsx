'use client';

import { useAuth } from '@/components/AuthProvider';
import GoogleTokenManager from '@/components/GoogleTokenManager';

export default function GoogleTokensPage() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <main className="min-h-screen p-2 sm:p-4 md:p-8 bg-background-light dark:bg-background-dark">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Google Token Management</h1>
          <button
            onClick={logout}
            className="px-3 py-1 sm:px-4 sm:py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm sm:text-base"
          >
            Logout
          </button>
        </div>
        
        <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
          <p>Add your Google OAuth tokens to access private Google Drive folders through the Cosmos Drive API.</p>
        </div>
        
        <GoogleTokenManager />
      </div>
    </main>
  );
}