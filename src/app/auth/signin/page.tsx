'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiBookOpen, FiUser, FiMail, FiLock } from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      <div className="min-h-full flex flex-col gap-5 items-center justify-center">
        <div className="text-lg text-blue-600">Loading...</div>
        <div className="border-4 border-blue-500 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
      </div>
    );
  }

  // Don't render sign-in form if user is already authenticated
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegisterMode && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

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
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
  };

  return (
    <div className="relative min-h-full w-full flex items-center justify-center p-4 md:p-8 overflow-hidden">
      {/* Fullscreen Video Background */}
      <div className="fixed inset-0 z-0">
        <video
          src="/books.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        />
        {/* Subtle overlay to improve text contrast while keeping video clear */}
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-brightness-75 md:backdrop-brightness-100" />
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-[450px] animate-in fade-in zoom-in-95 duration-500">
        <div className="glass-card p-6 md:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-4 shadow-xl border border-primary/20 animate-bounce-slow">
              <FiBookOpen className="text-3xl" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground text-center">
              Lib-Sek <span className="text-primary">Books</span>
            </h1>
            <p className="text-secondary-foreground text-xs md:text-sm font-medium mt-1 uppercase tracking-widest text-center">
              {isRegisterMode ? 'Join our community' : 'Welcome back'}
            </p>
          </div>

          <form className="space-y-4 md:space-y-5" onSubmit={handleSubmit}>
            {isRegisterMode && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  required
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  leftIcon={<FiUser />}
                />
                <Input
                  label="Last Name"
                  required
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  leftIcon={<FiUser />}
                />
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<FiMail />}
            />

            <Input
              label="Password"
              type="password"
              required
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<FiLock />}
            />

            {isRegisterMode && (
              <Input
                label="Confirm Password"
                type="password"
                required
                placeholder="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<FiLock />}
              />
            )}

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[10px] md:text-xs font-bold animate-shake">
                {error}
              </div>
            )}

            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-4 text-sm font-bold shadow-xl shadow-primary/20 transition-all"
            >
              {isRegisterMode ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black">
              <span className="bg-transparent px-2 text-secondary-foreground/60">Or continue as</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="py-2.5 text-xs font-bold glass"
            >
              Guest User
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={toggleMode}
              className="py-2.5 text-xs font-bold"
            >
              {isRegisterMode ? 'Sign In' : 'Register'}
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-border/30">
            <div className="flex flex-col gap-1 text-[10px] font-medium text-secondary-foreground/70">
              <p className="flex justify-between items-center">
                <span>Admin Demo</span>
                <span className="font-mono text-primary/80">admin@example.com / secret</span>
              </p>
              <p className="flex justify-between items-center">
                <span>User Demo</span>
                <span className="font-mono text-primary/80">user@example.com / secret</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
