'use client';

import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const { user, userRole, isAdmin, isUser, hasRolePermission, isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication to prevent content flash
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center">
        <div className="text-lg text-blue-600">Loading...</div>
        <div className="border-b-3 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Dashboard
            </h1>
            
            <div className="mb-6">
              {isAuthenticated ? (
                <>
                  <p className="text-lg text-gray-600">
                    Welcome, {user?.name}!
                  </p>
                  <p className="text-sm text-gray-500">
                    Your role: <span className="font-semibold">{userRole}</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg text-gray-600">
                    Welcome, Guest!
                  </p>
                  <p className="text-sm text-gray-500">
                    You are viewing this page as a guest. <a href="/auth/signin" className="text-blue-600 hover:underline">Sign in</a> for full access.
                  </p>
                </>
              )}
            </div>

            {/* Library Navigation */}
            <div className="mb-6 flex flex-wrap gap-3">
              <a
                href="/library"
                className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-green-600 text-sm font-medium rounded-md text-white bg-green-500 hover:bg-green-600 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-green-600"
              >
                📚 Browse Library
              </a>
              {isAuthenticated && hasRolePermission('read', 'borrow-history') && (
                <a
                  href="/borrow-history"
                  className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-blue-600 text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-green-600"
                >
                  📖 Borrow History
                </a>
              )}
              {isAuthenticated && hasRolePermission('manage', 'inventory') && (
                <a
                  href="/book-management"
                  className="inline-flex items-center px-4 py-2 shadow-lg border-2 border-purple-600 text-sm font-medium rounded-md text-white bg-purple-500 hover:bg-purple-600 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-purple-600"
                >
                  📝 Manage Books
                </a>
              )}
            </div>

            {/* Guest Content - Always Visible */}
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">📚 Library Catalog</h2>
                <p className="text-gray-600">Browse our collection of books available for reading.</p>
              </div>

              {/* Authenticated User Content */}
              {isAuthenticated && isUser && (
                <div className="bg-blue-50 p-4 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-2">📖 Member Features</h2>
                  <p className="text-gray-600">As a library member, you can:</p>
                  {hasRolePermission('borrow', 'books') && (
                    <p className="text-sm text-blue-600 mt-2">✓ Borrow available books</p>
                  )}
                  {hasRolePermission('return', 'books') && (
                    <p className="text-sm text-blue-600 mt-2">✓ Return borrowed books</p>
                  )}
                  {hasRolePermission('read', 'borrow-history') && (
                    <p className="text-sm text-blue-600 mt-2">✓ View your borrowing history</p>
                  )}
                </div>
              )}

              {/* Admin Only Content */}
              {isAuthenticated && isAdmin && (
                <div className="bg-red-50 p-4 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-2">🔧 Librarian Tools</h2>
                  <p className="text-gray-600">As a librarian, you have full system access:</p>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-red-600">✓ Manage book inventory</p>
                    <p className="text-sm text-red-600">✓ Add, edit, and delete books</p>
                    <p className="text-sm text-red-600">✓ Manage borrowing records</p>
                    <p className="text-sm text-red-600">✓ Apply and clear fines</p>
                    <p className="text-sm text-red-600">✓ User management</p>
                  </div>
                </div>
              )}

              {/* Guest Only Message */}
              {!isAuthenticated && (
                <div className="bg-green-50 p-4 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-2">Guest Access</h2>
                  <p className="text-gray-600">You&apos;re currently viewing as a guest. Sign in to access more features like:</p>
                  <ul className="mt-2 text-sm text-green-600 space-y-1">
                    <li>• Borrowing books from our collection</li>
                    <li>• Viewing your borrowing history</li>
                    <li>• Managing your account</li>
                    <li>• Receiving personalized recommendations</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-8 space-x-4">
              {isAuthenticated && isAdmin && (
                <a
                  href="/admin"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 hover:cursor-pointer"
                >
                  Admin Panel
                </a>
              )}
              {isAuthenticated ? (
                <button
                  onClick={() => window.location.href = '/api/auth/signout'}
                  className="inline-flex items-center px-4 py-2 border border-gray-500 text-sm shadow-lg font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 hover:cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Sign Out
                </button>
              ) : (
                <a
                  href="/auth/signin"
                  className="inline-flex items-center px-4 py-2 border border-indigo-700 shadow-lg text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 hover:cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700"
                >
                  Sign In
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
