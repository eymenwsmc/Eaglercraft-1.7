-- Eaglercraft Relay List - Supabase Database Schema

-- Create servers table
CREATE TABLE IF NOT EXISTS servers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(200) NOT NULL,
    join_code VARCHAR(5) NOT NULL,
    relay VARCHAR(255) NOT NULL,
    players INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'online',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_verified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_server UNIQUE(join_code, relay),
    CONSTRAINT valid_join_code CHECK (join_code ~ '^[a-z0-9]{5}$'),
    CONSTRAINT valid_status CHECK (status IN ('online', 'offline', 'verifying'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_servers_relay ON servers(relay);
CREATE INDEX IF NOT EXISTS idx_servers_added_at ON servers(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_servers_players ON servers(players DESC);
CREATE INDEX IF NOT EXISTS idx_servers_last_verified ON servers(last_verified);

-- Enable Row Level Security (RLS)
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read servers
CREATE POLICY "Anyone can view servers"
    ON servers
    FOR SELECT
    USING (true);

-- Policy: Anyone can insert servers (with rate limiting handled by app)
CREATE POLICY "Anyone can add servers"
    ON servers
    FOR INSERT
    WITH CHECK (true);

-- Policy: Only allow updates to specific fields
CREATE POLICY "Anyone can update server status"
    ON servers
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Policy: Auto-delete offline servers after 10 minutes
CREATE POLICY "Auto-delete offline servers"
    ON servers
    FOR DELETE
    USING (
        status = 'offline' 
        AND last_verified < NOW() - INTERVAL '10 minutes'
    );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_servers_updated_at
    BEFORE UPDATE ON servers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old offline servers (run periodically)
CREATE OR REPLACE FUNCTION cleanup_offline_servers()
RETURNS void AS $$
BEGIN
    DELETE FROM servers
    WHERE status = 'offline'
    AND last_verified < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create a view for active servers only
CREATE OR REPLACE VIEW active_servers AS
SELECT *
FROM servers
WHERE status = 'online'
ORDER BY players DESC, added_at DESC;

-- Grant permissions
GRANT ALL ON servers TO anon, authenticated;
GRANT ALL ON active_servers TO anon, authenticated;
