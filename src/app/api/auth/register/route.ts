import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// Mock user database - in a real app, you'd use a proper database
interface User {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

const users: User[] = [
  {
    id: 1,
    email: 'admin@example.com',
    password: '$2a$10$8KjOZM0lQZQjQZQjQZQjQO8KjOZM0lQZQjQZQjQO8KjOZM0lQZQjQZQjQO',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },
  {
    id: 2,
    email: 'user@example.com',
    password: '$2a$10$8KjOZM0lQZQjQZQjQZQjQO8KjOZM0lQZQjQZQjQO8KjOZM0lQZQjQZQjQO',
    firstName: 'Regular',
    lastName: 'User',
    role: 'user'
  }
];

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json();

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: users.length + 1,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'user'
    };

    // Add to mock database
    (users as User[]).push(newUser);

    // Return success (without password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;
    
    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: userWithoutPassword
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
