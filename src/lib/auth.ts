import NextAuth from 'next-auth';
import type { User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@/types/auth';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';

interface ExtendedUser extends User {
  role: Role;
}

import { findUserByEmail } from '@/lib/db';

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

        console.log('Authorize attempt for email:', credentials.email);
        const user = await findUserByEmail(credentials.email);
        
        if (!user) {
          console.log('User not found in database:', credentials.email);
          return null;
        }

        console.log('User found:', user.email, 'Role:', user.role);
        console.log('Verifying password...');

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          console.log('Invalid password for user:', credentials.email);
          return null;
        }

        console.log('Login successful for user:', credentials.email);
        return {
          id: user.id || '',
          email: user.email || '',
          name: user.name || '',
          role: (user.role as Role) || Role.USER,
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
