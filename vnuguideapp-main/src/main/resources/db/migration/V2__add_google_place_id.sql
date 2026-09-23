-- Add Google Place ID and image URL to places table
ALTER TABLE places ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255) UNIQUE;
ALTER TABLE places ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Create index for faster lookup by google_place_id
CREATE INDEX IF NOT EXISTS idx_places_google_place_id ON places(google_place_id);
