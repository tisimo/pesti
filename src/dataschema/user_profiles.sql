-- User Profiles Table for Profile Completion Feature
-- Run this SQL to create the required table in your PostgreSQL database

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    bio TEXT DEFAULT '',
    country VARCHAR(10) DEFAULT '',
    city VARCHAR(100) DEFAULT '',
    causes JSONB DEFAULT '[]'::jsonb,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('donor', 'creator', 'both')),
    avatar_url TEXT,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'not_required' CHECK (verification_status IN ('pending', 'verified', 'not_required')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_id ON user_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_verification_status ON user_profiles(verification_status);

