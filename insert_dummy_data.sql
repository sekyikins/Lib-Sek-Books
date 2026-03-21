-- Dummy Data Insert Script for Lib-Sek Books
-- Run this in your Supabase SQL Editor AFTER running supabase_setup.sql

-- 1. Insert Authors
INSERT INTO public.authors (id, name, bio)
VALUES 
  ('86f8a65d-2e50-4d51-8973-8686d63426e2', 'James Clear', 'Author of Atomic Habits'),
  ('b7346f04-0329-4e0e-9764-1da2a58b217a', 'Robert T. Kiyosaki', 'Author of Rich Dad Poor Dad'),
  ('de9c4d9b-8919-4bde-8409-42b7a9721345', 'Tim Marshall', 'Writer and expert in geopolitics'),
  ('f701c9ab-482a-4f51-8723-8686d63426e9', 'Library Mindset', 'Author of The Art of Laziness');

-- 2. Insert Genres
INSERT INTO public.genres (id, name)
VALUES 
  ('12345678-1234-1234-1234-123456789012', 'Productivity'),
  ('23456789-2345-2345-2345-234567890123', 'Finance'),
  ('34567890-3456-3456-3456-345678901234', 'Geopolitics'),
  ('45678901-4567-4567-4567-456789012345', 'Self-Help'),
  ('56789012-5678-5678-5678-567890123456', 'Non-Fiction');

-- 3. Insert Books
INSERT INTO public.books (id, title, isbn, description, cover_url, published_date, available, total_copies, borrowed_copies)
VALUES 
  ('OL1', 'The Art of Laziness', '1234567890', 'A practical guide to overcoming procrastination.', 'https://img.freepik.com/free-vector/book-cover-template-design_23-2148498251.jpg', '2022', true, 5, 0),
  ('OL2', 'Atomic Habits', '0735211299', 'An easy and proven way to build good habits and break bad ones.', 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1655988385i/61215351.jpg', '2018', true, 10, 0),
  ('OL3', 'Rich Dad Poor Dad', '1612680194', 'What the rich teach their kids about money that the poor and middle class do not!', 'https://images-na.ssl-images-amazon.com/images/I/81bsw6fnUiL.jpg', '1997', true, 7, 0),
  ('OL4', 'Prisoner of Geography', '1783962437', 'Ten maps that explain everything about the world.', 'https://images-na.ssl-images-amazon.com/images/I/91p1h4pM-1L.jpg', '2015', true, 3, 0);

-- 4. Link Books to Authors
INSERT INTO public.book_authors (book_id, author_id)
VALUES 
  ('OL1', 'f701c9ab-482a-4f51-8723-8686d63426e9'), -- Art of Laziness -> Library Mindset
  ('OL2', '86f8a65d-2e50-4d51-8973-8686d63426e2'), -- Atomic Habits -> James Clear
  ('OL3', 'b7346f04-0329-4e0e-9764-1da2a58b217a'), -- Rich Dad Poor Dad -> Robert Kiyosaki
  ('OL4', 'de9c4d9b-8919-4bde-8409-42b7a9721345'); -- Prisoner of Geography -> Tim Marshall

-- 5. Link Books to Genres
INSERT INTO public.book_genres (book_id, genre_id)
VALUES 
  ('OL1', '12345678-1234-1234-1234-123456789012'), -- Art of Laziness -> Productivity
  ('OL2', '12345678-1234-1234-1234-123456789012'), -- Atomic Habits -> Productivity
  ('OL3', '23456789-2345-2345-2345-234567890123'), -- Rich Dad Poor Dad -> Finance
  ('OL4', '34567890-3456-3456-3456-345678901234'); -- Prisoner of Geography -> Geopolitics

-- 6. Insert Default Admin (Password: 'secret' - bcrypt hashed)
INSERT INTO public.users (email, name, password_hash, role)
VALUES ('admin@example.com', 'Admin User', '$2b$10$ea07Y0oA9ptEjHUYoRJMBefUUTgTiKqnHN8nlOOyYUFY4MhBooJDW', 'ADMIN');
