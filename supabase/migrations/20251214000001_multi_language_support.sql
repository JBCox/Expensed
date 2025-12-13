-- =============================================
-- Multi-Language Support Migration
-- =============================================
-- Adds internationalization (i18n) support:
-- 1. User language preferences table
-- 2. Supported languages reference table
-- 3. RLS policies for security
-- =============================================

-- ===========================================
-- 1. Supported Languages Reference Table
-- ===========================================
-- Reference table of all supported languages
-- Adding a new language = INSERT one row here
CREATE TABLE IF NOT EXISTS supported_languages (
    code VARCHAR(5) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    native_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial supported languages
INSERT INTO supported_languages (code, name, native_name, display_order) VALUES
    ('en', 'English', 'English', 1),
    ('es', 'Spanish', 'Español', 2),
    ('fr', 'French', 'Français', 3),
    ('de', 'German', 'Deutsch', 4)
ON CONFLICT (code) DO NOTHING;

-- RLS for supported_languages (read-only for authenticated users)
ALTER TABLE supported_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read supported languages"
    ON supported_languages FOR SELECT
    TO authenticated
    USING (is_active = true);

-- ===========================================
-- 2. User Language Preferences Table
-- ===========================================
-- Stores individual user language preferences
-- One row per user (1:1 relationship)
CREATE TABLE IF NOT EXISTS user_language_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'en' REFERENCES supported_languages(code),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_language_preferences_user_id_key UNIQUE (user_id)
);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_language_preferences_user_id
    ON user_language_preferences(user_id);

-- RLS policies for user_language_preferences
ALTER TABLE user_language_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only view their own language preferences
CREATE POLICY "Users can view own language preferences"
    ON user_language_preferences FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can create their own language preferences
CREATE POLICY "Users can create own language preferences"
    ON user_language_preferences FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own language preferences
CREATE POLICY "Users can update own language preferences"
    ON user_language_preferences FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own language preferences
CREATE POLICY "Users can delete own language preferences"
    ON user_language_preferences FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ===========================================
-- 3. Updated_at Trigger
-- ===========================================
-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_language_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_language_preferences_updated_at ON user_language_preferences;
CREATE TRIGGER user_language_preferences_updated_at
    BEFORE UPDATE ON user_language_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_language_preferences_updated_at();

-- ===========================================
-- 4. Helper Function to Get User Language
-- ===========================================
-- Returns user's preferred language with fallback chain:
-- 1. User preference
-- 2. Organization default (from org settings)
-- 3. 'en' (English)
CREATE OR REPLACE FUNCTION get_user_language(p_user_id UUID DEFAULT auth.uid())
RETURNS VARCHAR(5)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_language VARCHAR(5);
    v_org_id UUID;
BEGIN
    -- 1. Try user preference first
    SELECT preferred_language INTO v_language
    FROM user_language_preferences
    WHERE user_id = p_user_id;

    IF v_language IS NOT NULL THEN
        RETURN v_language;
    END IF;

    -- 2. Try organization default
    SELECT om.organization_id INTO v_org_id
    FROM organization_members om
    WHERE om.user_id = p_user_id
    AND om.is_active = true
    LIMIT 1;

    IF v_org_id IS NOT NULL THEN
        SELECT (o.settings->>'default_language')::VARCHAR(5) INTO v_language
        FROM organizations o
        WHERE o.id = v_org_id;

        IF v_language IS NOT NULL THEN
            RETURN v_language;
        END IF;
    END IF;

    -- 3. Fallback to English
    RETURN 'en';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_language TO authenticated;

-- ===========================================
-- Comments for documentation
-- ===========================================
COMMENT ON TABLE supported_languages IS 'Reference table of all supported UI languages. Add new languages by inserting rows here.';
COMMENT ON TABLE user_language_preferences IS 'Stores individual user language preferences. One row per user.';
COMMENT ON FUNCTION get_user_language IS 'Returns user language with fallback: user pref -> org default -> English';
