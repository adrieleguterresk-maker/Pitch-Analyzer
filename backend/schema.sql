-- Sales Pitch Analyzer - Database Schema
-- Run with: psql -U <user> -d <database> -f schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Pitches enviados
CREATE TABLE IF NOT EXISTS pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  total_pages INTEGER,
  raw_text TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error'))
);

-- Análises geradas
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES pitches(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  structure_map JSONB,
  strengths JSONB,
  weaknesses JSONB,
  typo_errors JSONB,
  sequence_errors JSONB,
  deliverables_analysis JSONB,
  scores JSONB,
  overall_score DECIMAL(4,1),
  action_plan JSONB,
  missing_blocks JSONB
);

-- Entregáveis identificados
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  page_number INTEGER,
  name VARCHAR(255),
  has_individual_value BOOLEAN DEFAULT false,
  perceived_value VARCHAR(100),
  is_blank BOOLEAN DEFAULT false,
  stacking_order INTEGER
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pitches_status ON pitches(status);
CREATE INDEX IF NOT EXISTS idx_analyses_pitch_id ON analyses(pitch_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_analysis_id ON deliverables(analysis_id);
