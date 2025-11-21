-- First, let's see what versions are already in the migration table
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;

-- Now let's insert ONLY the missing versions
-- Note: Each version can only appear ONCE in the table,
-- but multiple migration files can share the same version

-- Insert version 20251115 (covers all 6 files with this version)
INSERT INTO supabase_migrations.schema_migrations (version)
SELECT '20251115'
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations
  WHERE version = '20251115'
);

-- Insert version 20251116 (covers all 5 files with this version)
INSERT INTO supabase_migrations.schema_migrations (version)
SELECT '20251116'
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations
  WHERE version = '20251116'
);

-- Verify what we have now
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
