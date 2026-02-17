'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Redirect authenticated users away from sign-in page
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col gap-5 items-center justify-center">
        <div className="text-lg text-blue-600">Loading...</div>
        <div className="border-b-3 border-blue-500 rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  // Don't render sign-in form if user is already authenticated
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegisterMode) {
        // Handle registration logic
        // For now, we'll simulate registration and then sign in
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
          }),
        });

        if (response.ok) {
          // After successful registration, sign in
          const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
          });

          if (result?.error) {
            setError('Registration successful but sign in failed');
          } else {
            router.push('/dashboard');
          }
        } else {
          const data = await response.json();
          setError(data.error || 'Registration failed');
        }
      } else {
        // Handle sign in logic
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError('Invalid credentials');
        } else {
          router.push('/dashboard');
        }
      }
    } catch {
      setError(isRegisterMode ? 'Registration failed' : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 justify-center bg-blue-100">
      <div className='hidden md:inline md:border-r-2 border-blue-300 relative'>
        <video
          src="/books.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover z-0"
        />
        
        <Image src="/android-chrome-192x192.png" alt="Logo" width={100} height={100} className="absolute left-1/2 top-1/3 transform -translate-x-1/2 -translate-y-1/2 object-cover" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-6xl font-bold text-blue-400">Lib-Sek Books</h1>
          <p className="text-blue-400 text-2xl">Welcome to Lib-Sek Books</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center w-full">
        <div className="w-[90%] md:w-[70%] flex items-center">
          
          <form className="w-full space-y-6" onSubmit={handleSubmit}>
            <h2 className="p-4 text-center text-3xl font-extrabold text-gray-900">
              {isRegisterMode ? 'Create your account' : 'Sign in to your account'}
            </h2>
            <div className='flex flex-col gap-2'>
              {isRegisterMode && (
                <>
                  <div className='flex gap-2'>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required={isRegisterMode}
                    className="appearance-none relative block w-full px-3 py-2 bg-white border-2 border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setError('');
                    }}
                  />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required={isRegisterMode}
                    className="appearance-none relative block w-full px-3 py-2 bg-white border-2 border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setError('');
                    }}
                  />
                  </div>
                </>
              )}
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-2 bg-white border-2 border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
              />
              <div className='flex gap-2'>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 bg-white border-2 border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
              />
              {isRegisterMode && (
                <>
                  <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 bg-white border-2 border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
              />
                </>
              )}
              </div>

              {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-[82%] mx-auto shadow-2xl flex justify-center py-2 px-4 border-2 border-blue-700 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className='flex h-4 w-4 rounded-full border-t-2 border-blue-300 animate-spin'></div>
                    <div>{isRegisterMode ? 'Creating Account' : 'Signing in'}</div>
                  </div>
                ) : (
                  <div>{isRegisterMode ? 'Register' : 'Sign in'}</div>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex-1 h-px bg-blue-500"></div>
              <span className="px-4 text-sm text-blue-500">
                {isRegisterMode ? 'Already Have An Account?' : "Don't Have An Account Yet?"}
              </span>
              <div className="flex-1 h-px bg-blue-500"></div>
            </div>

            <div className="mt-4 flex gap-4 items-center justify-center">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="group relative w-[40%] flex justify-center shadow-lg py-2 px-4 border-2 border-gray-500 text-sm font-medium rounded-md text-gray-900 bg-gray-200 hover:bg-gray-300 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Visit as Guest
              </button>
              <button
                type="button"
                onClick={toggleMode}
                className="group relative w-[40%] flex justify-center shadow-lg py-2 px-4 border-2 border-green-500 text-sm font-medium rounded-md text-gray-900 bg-green-200 hover:bg-green-300 hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {isRegisterMode ? 'Sign in' : 'Register'}
              </button>
            </div>

          </form>
        </div>
            <div className="absolute bottom-5 left-5 md:left-1/2 transform translate-x-5 w-fit text-sm text-gray-600">
              <p>Demo accounts:</p>
              <p>Admin: admin@example.com / secret</p>
              <p>User: user@example.com / secret</p>
            </div>
      </div>
    </div>
  );
}
