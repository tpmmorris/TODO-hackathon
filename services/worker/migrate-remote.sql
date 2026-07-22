-- One-time migration for the first deployed GPNow D1 schema.
-- Run this only against databases created from the initial scaffold schema.
ALTER TABLE practices ADD COLUMN postcode TEXT;
ALTER TABLE practices ADD COLUMN type TEXT NOT NULL DEFAULT 'GP';
ALTER TABLE practices ADD COLUMN accepts_out_of_area INTEGER NOT NULL DEFAULT 0;
