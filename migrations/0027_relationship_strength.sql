-- migrations/0027_relationship_strength.sql
ALTER TABLE mutual_connections ADD COLUMN strength INTEGER NOT NULL DEFAULT 1;
