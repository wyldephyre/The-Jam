-- WyldePhyre Viewer Hub Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Viewers table
CREATE TABLE viewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT,
  total_minutes INTEGER DEFAULT 0,
  is_regular BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request type enum
CREATE TYPE request_type AS ENUM ('song', 'message');

-- Request status enum
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

-- Requests table
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_id UUID REFERENCES viewers(id) ON DELETE CASCADE,
  type request_type NOT NULL,
  content TEXT NOT NULL,
  spotify_uri TEXT,
  artist TEXT,
  status request_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_viewers_is_regular ON viewers(is_regular);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_viewer_id ON requests(viewer_id);
CREATE INDEX idx_requests_created_at ON requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Policies for viewers table (service role bypasses RLS)
CREATE POLICY "Allow all for service role" ON viewers
  FOR ALL USING (true);

-- Policies for requests table
CREATE POLICY "Allow all for service role" ON requests
  FOR ALL USING (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE viewers;
ALTER PUBLICATION supabase_realtime ADD TABLE requests;

