-- 005_parcel_matching_verification.sql
-- Parcel matching, verification workflow, and data conflicts

-- ============================================================
-- PARCEL MATCHES
-- ============================================================

CREATE TABLE IF NOT EXISTS parcel_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  target_parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('EXACT_MATCH','HIGH_CONFIDENCE','POSSIBLE_MATCH','UNMATCHED','CONFLICT')),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  match_criteria JSONB DEFAULT '[]'::jsonb,
  conflicting_fields JSONB DEFAULT '[]'::jsonb,
  reviewed_by UUID REFERENCES auth.users(id),
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending','approved','rejected')),
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE parcel_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Government users can manage parcel_matches" ON parcel_matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('administrator','revenue_officer')
      AND is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_parcel_matches_source ON parcel_matches(source_parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_matches_target ON parcel_matches(target_parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_matches_type ON parcel_matches(match_type);

-- ============================================================
-- DATA CONFLICTS
-- ============================================================

CREATE TABLE IF NOT EXISTS data_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('ownership','area','land_use','registration','geometry')),
  description TEXT NOT NULL,
  source_a_name TEXT,
  source_b_name TEXT,
  value_a JSONB,
  value_b JSONB,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','escalated')),
  resolved_by UUID REFERENCES auth.users(id),
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE data_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Government users can manage data_conflicts" ON data_conflicts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('administrator','revenue_officer','registration_officer','planning_officer')
      AND is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_data_conflicts_parcel ON data_conflicts(parcel_id);
CREATE INDEX IF NOT EXISTS idx_data_conflicts_status ON data_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_data_conflicts_type ON data_conflicts(conflict_type);

-- ============================================================
-- VERIFICATION NOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS verification_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  verifier_id UUID REFERENCES auth.users(id),
  verifier_email TEXT,
  verifier_role TEXT,
  action TEXT NOT NULL CHECK (action IN ('verified','rejected','needs_review','escalated','note_added')),
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE verification_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Government users can manage verification_notes" ON verification_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role != 'citizen'
      AND is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_verification_notes_parcel ON verification_notes(parcel_id);
CREATE INDEX IF NOT EXISTS idx_verification_notes_created ON verification_notes(created_at DESC);

-- ============================================================
-- PARCEL CONFIDENCE SCORES
-- ============================================================

ALTER TABLE parcels ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.5
  CHECK (confidence_score >= 0 AND confidence_score <= 1);

ALTER TABLE parcels ADD COLUMN IF NOT EXISTS match_status TEXT DEFAULT 'unmatched'
  CHECK (match_status IN ('matched','unmatched','conflicting','duplicate'));

ALTER TABLE parcels ADD COLUMN IF NOT EXISTS internal_parcel_id TEXT;

CREATE INDEX IF NOT EXISTS idx_parcels_internal_id ON parcels(internal_parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcels_confidence ON parcels(confidence_score);
CREATE INDEX IF NOT EXISTS idx_parcels_match_status ON parcels(match_status);

-- ============================================================
-- DATA SOURCE HEALTH
-- ============================================================

ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS total_records INTEGER DEFAULT 0;
ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS verified_records INTEGER DEFAULT 0;
ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS pending_records INTEGER DEFAULT 0;
ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS failed_records INTEGER DEFAULT 0;
ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS last_import_at TIMESTAMPTZ;

-- ============================================================
-- SEED SAMPLE AP OPEN DATA SOURCE
-- ============================================================

INSERT INTO data_sources (name, department, source_type, source_url, source_system, data_status, reliability_status, is_active)
VALUES (
  'AP Village Boundaries (Open Data)',
  'Survey & Land Records',
  'OPEN_DATA',
  'https://data.gov.in',
  'AP Revenue Department',
  'available',
  'reliable',
  true
) ON CONFLICT DO NOTHING;

INSERT INTO data_sources (name, department, source_type, source_url, source_system, data_status, reliability_status, is_active)
VALUES (
  'AP Cadastral Survey Data',
  'Survey & Land Records',
  'OPEN_DATA',
  'https://ap.gov.in',
  'AP Survey Department',
  'available',
  'reliable',
  true
) ON CONFLICT DO NOTHING;
