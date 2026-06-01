-- Run this in Supabase SQL Editor

-- Remove the trigger approach (was causing the error)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Allow users to insert their own profile row after signup
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
