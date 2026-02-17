import NextAuth from 'next-auth';
import type { User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthUser, Role } from '@/types/auth';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';

interface ExtendedUser extends User {
  role: Role;
}

// Mock user database - in production, replace with actual database
const mockUsers: AuthUser[] = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: Role.ADMIN,
  },
  {
    id: '2',
    email: 'user@example.com',
    name: 'Regular User',
    role: Role.USER,
  },
];

// Mock password storage - in production, store hashed passwords
const mockPasswords: Record<string, string> = {
  'admin@example.com': '$2b$10$ea07Y0oA9ptEjHUYoRJMBefUUTgTiKqnHN8nlOOyYUFY4MhBooJDW', // secret
  'user@example.com': '$2b$10$ea07Y0oA9ptEjHUYoRJMBefUUTgTiKqnHN8nlOOyYUFY4MhBooJDW', // secret
};

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = mockUsers.find(u => u.email === credentials.email);
        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          mockPasswords[credentials.email]
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: ExtendedUser }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
  },
};

export const handler = NextAuth(authOptions);

export function generateToken(payload: { id: string; email: string; role: Role }): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

export function verifyToken(token: string): { id: string; email: string; role: Role } | null {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  try {
    return jwt.verify(token, secret) as { id: string; email: string; role: Role };
  } catch {
    return null;
  }
}
