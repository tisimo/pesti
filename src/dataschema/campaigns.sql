-- Campaigns Table for Start a Cause Feature
-- Run this SQL to create the required table in your PostgreSQL database

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    title VARCHAR(120) NOT NULL,
    story TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) DEFAULT '',
    goal_amount NUMERIC(12, 2) NOT NULL CHECK (goal_amount > 0),
    duration_days INTEGER,
    media_url TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    media_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    video_url TEXT,
    accept_usdc BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    budget_items JSONB DEFAULT '[]'::jsonb,
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    amount_raised NUMERIC(12, 2) NOT NULL DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaigns_account_id ON campaigns(account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns(category);
CREATE INDEX IF NOT EXISTS idx_campaigns_published_at ON campaigns(published_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
