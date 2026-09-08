-- ============================================================================
-- DHARANISETU DATABASE MIGRATION
-- Step 2A.1: Precise Uniqueness, Nullability & Data Integrity Rules
-- ============================================================================
-- This migration strengthens the existing schema with precise constraints.
-- Run this AFTER 001_initial_schema.sql and 002_seed_data.sql
-- ============================================================================

-- ============================================================================
-- 1. STATES
-- ============================================================================
-- Already correct: name NOT NULL, code NOT NULL UNIQUE
-- Add CHECK: code must not be blank/whitespace
ALTER TABLE states
    ADD CONSTRAINT chk_states_code_not_blank
    CHECK (trim(code) <> '');

-- ============================================================================
-- 2. DISTRICTS
-- ============================================================================
-- Fix foreign key: RESTRICT instead of CASCADE
ALTER TABLE districts
    DROP CONSTRAINT IF EXISTS districts_state_id_fkey;

ALTER TABLE districts
    ADD CONSTRAINT districts_state_id_fkey
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE RESTRICT;

-- Add CHECK: name must not be blank
ALTER TABLE districts
    ADD CONSTRAINT chk_districts_name_not_blank
    CHECK (trim(name) <> '');

-- Add CHECK: code must not be blank
ALTER TABLE districts
    ADD CONSTRAINT chk_districts_code_not_blank
    CHECK (trim(code) <> '');

-- Normalized name uniqueness within state (case-insensitive, trimmed)
CREATE UNIQUE INDEX IF NOT EXISTS uq_districts_state_name_normalized
    ON districts (state_id, lower(trim(name)));

-- ============================================================================
-- 3. MANDALS
-- ============================================================================
-- Fix foreign key: RESTRICT instead of CASCADE
ALTER TABLE mandals
    DROP CONSTRAINT IF EXISTS mandals_district_id_fkey;

ALTER TABLE mandals
    ADD CONSTRAINT mandals_district_id_fkey
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE RESTRICT;

-- Add CHECK: name must not be blank
ALTER TABLE mandals
    ADD CONSTRAINT chk_mandals_name_not_blank
    CHECK (trim(name) <> '');

-- Add CHECK: code must not be blank
ALTER TABLE mandals
    ADD CONSTRAINT chk_mandals_code_not_blank
    CHECK (trim(code) <> '');

-- Normalized name uniqueness within district
CREATE UNIQUE INDEX IF NOT EXISTS uq_mandals_district_name_normalized
    ON mandals (district_id, lower(trim(name)));

-- ============================================================================
-- 4. VILLAGES
-- ============================================================================
-- Fix foreign key: RESTRICT instead of CASCADE
ALTER TABLE villages
    DROP CONSTRAINT IF EXISTS villages_mandal_id_fkey;

ALTER TABLE villages
    ADD CONSTRAINT villages_mandal_id_fkey
    FOREIGN KEY (mandal_id) REFERENCES mandals(id) ON DELETE RESTRICT;

-- Add CHECK: name must not be blank
ALTER TABLE villages
    ADD CONSTRAINT chk_villages_name_not_blank
    CHECK (trim(name) <> '');

-- Add CHECK: code must not be blank
ALTER TABLE villages
    ADD CONSTRAINT chk_villages_code_not_blank
    CHECK (trim(code) <> '');

-- Normalized name uniqueness within mandal
CREATE UNIQUE INDEX IF NOT EXISTS uq_villages_mandal_name_normalized
    ON villages (mandal_id, lower(trim(name)));

-- ============================================================================
-- 5. DATA SOURCES
-- ============================================================================
-- name, department, source_type already NOT NULL
-- Add NOT NULL for data_status and reliability_status
ALTER TABLE data_sources
    ALTER COLUMN data_status SET NOT NULL;

ALTER TABLE data_sources
    ALTER COLUMN reliability_status SET NOT NULL;

-- Add CHECK: name must not be blank
ALTER TABLE data_sources
    ADD CONSTRAINT chk_data_sources_name_not_blank
    CHECK (trim(name) <> '');

-- Add CHECK: department must not be blank
ALTER TABLE data_sources
    ADD CONSTRAINT chk_data_sources_department_not_blank
    CHECK (trim(department) <> '');

-- Safe uniqueness: (name, department, source_system) with NULL handling
-- PostgreSQL treats NULLs as distinct in UNIQUE constraints, so this is safe
CREATE UNIQUE INDEX IF NOT EXISTS uq_data_sources_name_dept_system
    ON data_sources (name, department, source_system);

-- ============================================================================
-- 6. PARCELS (Central Entity)
-- ============================================================================
-- Fix foreign keys: RESTRICT for hierarchy
ALTER TABLE parcels
    DROP CONSTRAINT IF EXISTS parcels_state_id_fkey,
    DROP CONSTRAINT IF EXISTS parcels_district_id_fkey,
    DROP CONSTRAINT IF EXISTS parcels_mandal_id_fkey,
    DROP CONSTRAINT IF EXISTS parcels_village_id_fkey;

ALTER TABLE parcels
    ADD CONSTRAINT parcels_state_id_fkey
        FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE RESTRICT,
    ADD CONSTRAINT parcels_district_id_fkey
        FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE RESTRICT,
    ADD CONSTRAINT parcels_mandal_id_fkey
        FOREIGN KEY (mandal_id) REFERENCES mandals(id) ON DELETE RESTRICT,
    ADD CONSTRAINT parcels_village_id_fkey
        FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE RESTRICT;

-- NOT NULL additions
ALTER TABLE parcels
    ALTER COLUMN area SET NOT NULL;

ALTER TABLE parcels
    ALTER COLUMN area_unit SET NOT NULL;

ALTER TABLE parcels
    ALTER COLUMN data_status SET NOT NULL;

ALTER TABLE parcels
    ALTER COLUMN verification_status SET NOT NULL;

-- Remove overly broad UNIQUE on ulpin (replaced with partial index below)
ALTER TABLE parcels
    DROP CONSTRAINT IF EXISTS parcels_ulpin_key;

-- Partial unique index: ULPIN must be unique only when not null
CREATE UNIQUE INDEX IF NOT EXISTS uq_parcels_ulpin_non_null
    ON parcels (ulpin)
    WHERE ulpin IS NOT NULL;

-- Partial unique index: source record identity (prevent duplicate imports)
CREATE UNIQUE INDEX IF NOT EXISTS uq_parcels_source_record
    ON parcels (source_id, source_record_id)
    WHERE source_id IS NOT NULL AND source_record_id IS NOT NULL;

-- CHECK: area must be positive
ALTER TABLE parcels
    ADD CONSTRAINT chk_parcels_area_positive
    CHECK (area > 0);

-- CHECK: geometry type must be Polygon or MultiPolygon (PostGIS)
ALTER TABLE parcels
    ADD CONSTRAINT chk_parcels_geometry_type
    CHECK (
        ST_GeometryType(geometry) = 'ST_Polygon'
        OR ST_GeometryType(geometry) = 'ST_MultiPolygon'
    );

-- CHECK: geometry SRID must be 4326
ALTER TABLE parcels
    ADD CONSTRAINT chk_parcels_geometry_srid
    CHECK (ST_SRID(geometry) = 4326);

-- CHECK: data_status values
ALTER TABLE parcels
    DROP CONSTRAINT IF EXISTS parcels_data_status_check;

ALTER TABLE parcels
    ADD CONSTRAINT parcels_data_status_check
    CHECK (data_status IN ('verified', 'pending_verification', 'unverified', 'disputed'));

-- CHECK: verification_status values
ALTER TABLE parcels
    ADD CONSTRAINT parcels_verification_status_check
    CHECK (verification_status IN ('verified', 'pending_verification', 'unverified', 'disputed'));

-- CHECK: survey_number must not be blank when present
ALTER TABLE parcels
    ADD CONSTRAINT chk_parcels_survey_number_not_blank
    CHECK (survey_number IS NULL OR trim(survey_number) <> '');

-- ============================================================================
-- 7. RIGHTS RECORDS
-- ============================================================================
-- NOT NULL additions
ALTER TABLE rights_records
    ALTER COLUMN rights_holder_name SET NOT NULL;

ALTER TABLE rights_records
    ALTER COLUMN rights_holder_type SET NOT NULL;

ALTER TABLE rights_records
    ALTER COLUMN verification_status SET NOT NULL;

-- CHECK: rights_holder_name must not be blank
ALTER TABLE rights_records
    ADD CONSTRAINT chk_rights_holder_name_not_blank
    CHECK (trim(rights_holder_name) <> '');

-- CHECK: rights_holder_type values
ALTER TABLE rights_records
    DROP CONSTRAINT IF EXISTS rights_records_rights_holder_type_check;

ALTER TABLE rights_records
    ADD CONSTRAINT rights_records_rights_holder_type_check
    CHECK (rights_holder_type IN ('individual', 'joint', 'government', 'corporate', 'trust', 'other'));

-- CHECK: verification_status values
ALTER TABLE rights_records
    DROP CONSTRAINT IF EXISTS rights_records_verification_status_check;

ALTER TABLE rights_records
    ADD CONSTRAINT rights_records_verification_status_check
    CHECK (verification_status IN ('verified', 'pending_verification', 'unverified', 'disputed'));

-- Partial unique: source record identity
CREATE UNIQUE INDEX IF NOT EXISTS uq_rights_source_record
    ON rights_records (source_id, source_record_id)
    WHERE source_id IS NOT NULL AND source_record_id IS NOT NULL;

-- ============================================================================
-- 8. REGISTRATION RECORDS
-- ============================================================================
-- NOT NULL additions
ALTER TABLE registration_records
    ALTER COLUMN registration_date SET NOT NULL;

ALTER TABLE registration_records
    ALTER COLUMN transaction_status SET NOT NULL;

ALTER TABLE registration_records
    ALTER COLUMN verification_status SET NOT NULL;

-- CHECK: transaction_status values
ALTER TABLE registration_records
    DROP CONSTRAINT IF EXISTS registration_records_transaction_status_check;

ALTER TABLE registration_records
    ADD CONSTRAINT registration_records_transaction_status_check
    CHECK (transaction_status IN ('completed', 'pending', 'cancelled', 'disputed'));

-- CHECK: verification_status values
ALTER TABLE registration_records
    DROP CONSTRAINT IF EXISTS registration_records_verification_status_check;

ALTER TABLE registration_records
    ADD CONSTRAINT registration_records_verification_status_check
    CHECK (verification_status IN ('verified', 'pending_verification', 'unverified', 'disputed'));

-- CHECK: document_number must not be blank
ALTER TABLE registration_records
    ADD CONSTRAINT chk_registration_doc_number_not_blank
    CHECK (trim(document_number) <> '');

-- CHECK: financial amounts non-negative
ALTER TABLE registration_records
    ADD CONSTRAINT chk_registration_consideration_non_negative
    CHECK (consideration_amount IS NULL OR consideration_amount >= 0);

ALTER TABLE registration_records
    ADD CONSTRAINT chk_registration_stamp_duty_non_negative
    CHECK (stamp_duty IS NULL OR stamp_duty >= 0);

-- CHECK: execution_date not after registration_date when both present
ALTER TABLE registration_records
    ADD CONSTRAINT chk_registration_execution_before_registration
    CHECK (
        execution_date IS NULL
        OR registration_date IS NULL
        OR execution_date <= registration_date
    );

-- Partial unique: source record identity
CREATE UNIQUE INDEX IF NOT EXISTS uq_registration_source_record
    ON registration_records (source_id, source_record_id)
    WHERE source_id IS NOT NULL AND source_record_id IS NOT NULL;

-- ============================================================================
-- 9. ENCUMBRANCES
-- ============================================================================
-- NOT NULL additions
ALTER TABLE encumbrances
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE encumbrances
    ALTER COLUMN verification_status SET NOT NULL;

-- CHECK: status values
ALTER TABLE encumbrances
    DROP CONSTRAINT IF EXISTS encumbrances_status_check;

ALTER TABLE encumbrances
    ADD CONSTRAINT encumbrances_status_check
    CHECK (status IN ('active', 'released', 'disputed'));

-- CHECK: verification_status values
ALTER TABLE encumbrances
    DROP CONSTRAINT IF EXISTS encumbrances_verification_status_check;

ALTER TABLE encumbrances
    ADD CONSTRAINT encumbrances_verification_status_check
    CHECK (verification_status IN ('verified', 'pending_verification', 'unverified', 'disputed'));

-- CHECK: release_date not before start_date when both present
ALTER TABLE encumbrances
    ADD CONSTRAINT chk_encumbrances_date_order
    CHECK (
        start_date IS NULL
        OR release_date IS NULL
        OR release_date >= start_date
    );

-- Partial unique: source record identity
CREATE UNIQUE INDEX IF NOT EXISTS uq_encumbrances_source_record
    ON encumbrances (source_id, source_record_id)
    WHERE source_id IS NOT NULL AND source_record_id IS NOT NULL;

-- ============================================================================
-- 10. PLANNING RECORDS
-- ============================================================================
-- planning_records: zoning is currently NOT NULL in schema, keep as is
-- Add source_record_id column if not present (spec requires it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'planning_records' AND column_name = 'source_record_id'
    ) THEN
        ALTER TABLE planning_records ADD COLUMN source_record_id VARCHAR(100);
    END IF;
END $$;

-- Partial unique: source record identity
CREATE UNIQUE INDEX IF NOT EXISTS uq_planning_source_record
    ON planning_records (source_id, source_record_id)
    WHERE source_id IS NOT NULL AND source_record_id IS NOT NULL;

-- CHECK: review_date not before effective_date when both present
ALTER TABLE planning_records
    ADD CONSTRAINT chk_planning_date_order
    CHECK (
        effective_date IS NULL
        OR review_date IS NULL
        OR review_date >= effective_date
    );

-- ============================================================================
-- 11. BUILDING PERMISSIONS
-- ============================================================================
-- NOT NULL addition
ALTER TABLE building_permissions
    ALTER COLUMN approval_status SET NOT NULL;

-- CHECK: approval_status values
ALTER TABLE building_permissions
    DROP CONSTRAINT IF EXISTS building_permissions_approval_status_check;

ALTER TABLE building_permissions
    ADD CONSTRAINT building_permissions_approval_status_check
    CHECK (approval_status IN ('approved', 'pending', 'rejected', 'expired', 'revoked'));

-- CHECK: permission_number must not be blank
ALTER TABLE building_permissions
    ADD CONSTRAINT chk_building_permission_number_not_blank
    CHECK (trim(permission_number) <> '');

-- CHECK: permitted_floors positive when present
ALTER TABLE building_permissions
    ADD CONSTRAINT chk_building_floors_positive
    CHECK (permitted_floors IS NULL OR permitted_floors > 0);

-- CHECK: permitted_height positive when present
ALTER TABLE building_permissions
    ADD CONSTRAINT chk_building_height_positive
    CHECK (permitted_height IS NULL OR permitted_height > 0);

-- CHECK: built_up_area non-negative when present
ALTER TABLE building_permissions
    ADD CONSTRAINT chk_building_area_non_negative
    CHECK (built_up_area IS NULL OR built_up_area >= 0);

-- Partial unique: source record identity
CREATE UNIQUE INDEX IF NOT EXISTS uq_building_source_record
    ON building_permissions (source_id, source_record_id)
    WHERE source_id IS NOT NULL AND source_record_id IS NOT NULL;

-- ============================================================================
-- 12. PROPERTY TAX RECORDS
-- ============================================================================
-- Add source_record_id column if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'property_tax_records' AND column_name = 'source_record_id'
    ) THEN
        ALTER TABLE property_tax_records ADD COLUMN source_record_id VARCHAR(100);
    END IF;
END $$;

-- CHECK: financial amounts non-negative
ALTER TABLE property_tax_records
    ADD CONSTRAINT chk_tax_assessed_value_non_negative
    CHECK (assessed_value IS NULL OR assessed_value >= 0);

ALTER TABLE property_tax_records
    ADD CONSTRAINT chk_tax_amount_non_negative
    CHECK (tax_amount IS NULL OR tax_amount >= 0);

ALTER TABLE property_tax_records
    ADD CONSTRAINT chk_tax_paid_amount_non_negative
    CHECK (paid_amount IS NULL OR paid_amount >= 0);

ALTER TABLE property_tax_records
    ADD CONSTRAINT chk_tax_outstanding_non_negative
    CHECK (outstanding_amount IS NULL OR outstanding_amount >= 0);

-- CHECK: assessment_year format (4 digits or YYYY-YY)
ALTER TABLE property_tax_records
    ADD CONSTRAINT chk_tax_assessment_year_format
    CHECK (assessment_year ~ '^[0-9]{4}(-[0-9]{2,4})?$');

-- Partial unique: source record identity
CREATE UNIQUE INDEX IF NOT EXISTS uq_tax_source_record
    ON property_tax_records (source_id, source_record_id)
    WHERE source_id IS NOT NULL AND source_record_id IS NOT NULL;

-- ============================================================================
-- 13. UTILITY RECORDS
-- ============================================================================
-- Add source_record_id column if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'utility_records' AND column_name = 'source_record_id'
    ) THEN
        ALTER TABLE utility_records ADD COLUMN source_record_id VARCHAR(100);
    END IF;
END $$;

-- Partial unique: source record identity
CREATE UNIQUE INDEX IF NOT EXISTS uq_utility_source_record
    ON utility_records (source_id, source_record_id)
    WHERE source_id IS NOT NULL AND source_record_id IS NOT NULL;

-- ============================================================================
-- 14. RESTRICTIONS
-- ============================================================================
-- Add status column (missing from original schema, required by spec)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restrictions' AND column_name = 'status'
    ) THEN
        ALTER TABLE restrictions ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;
END $$;

-- Set NOT NULL after adding column with defaults
UPDATE restrictions SET status = 'active' WHERE status IS NULL;
ALTER TABLE restrictions
    ALTER COLUMN status SET NOT NULL;

-- CHECK: status values
ALTER TABLE restrictions
    ADD CONSTRAINT chk_restrictions_status_values
    CHECK (status IN ('active', 'expired', 'revoked', 'disputed'));

-- CHECK: expiry_date not before effective_date when both present
ALTER TABLE restrictions
    ADD CONSTRAINT chk_restrictions_date_order
    CHECK (
        effective_date IS NULL
        OR expiry_date IS NULL
        OR expiry_date >= effective_date
    );

-- CHECK: restriction_type must not be blank
ALTER TABLE restrictions
    ADD CONSTRAINT chk_restrictions_type_not_blank
    CHECK (trim(restriction_type) <> '');

-- CHECK: description must not be blank
ALTER TABLE restrictions
    ADD CONSTRAINT chk_restrictions_description_not_blank
    CHECK (trim(description) <> '');

-- CHECK: authority must not be blank
ALTER TABLE restrictions
    ADD CONSTRAINT chk_restrictions_authority_not_blank
    CHECK (trim(authority) <> '');

-- Partial unique: source record identity
CREATE UNIQUE INDEX IF NOT EXISTS uq_restrictions_source_record
    ON restrictions (source_id, source_record_id)
    WHERE source_id IS NOT NULL AND source_record_id IS NOT NULL;

-- ============================================================================
-- 15. PARCEL DOCUMENTS
-- ============================================================================
-- Add source_record_id column if not present (required for unique index below)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'parcel_documents' AND column_name = 'source_record_id'
    ) THEN
        ALTER TABLE parcel_documents ADD COLUMN source_record_id VARCHAR(100);
    END IF;
END $$;

-- CHECK: document_type must not be blank
ALTER TABLE parcel_documents
    ADD CONSTRAINT chk_document_type_not_blank
    CHECK (trim(document_type) <> '');

-- CHECK: file_size non-negative when present
ALTER TABLE parcel_documents
    ADD CONSTRAINT chk_document_file_size_non_negative
    CHECK (file_size IS NULL OR file_size >= 0);

-- Partial unique: source record identity
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_source_record
    ON parcel_documents (source_id, source_record_id)
    WHERE source_id IS NOT NULL AND source_record_id IS NOT NULL;

-- ============================================================================
-- 16. PARCEL HISTORY
-- ============================================================================
-- Add source_record_id column if not present (required for unique index below)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'parcel_history' AND column_name = 'source_record_id'
    ) THEN
        ALTER TABLE parcel_history ADD COLUMN source_record_id VARCHAR(100);
    END IF;
END $$;

-- NOT NULL addition
ALTER TABLE parcel_history
    ALTER COLUMN event_date SET NOT NULL;

-- CHECK: event_type must not be blank
ALTER TABLE parcel_history
    ADD CONSTRAINT chk_history_event_type_not_blank
    CHECK (trim(event_type) <> '');

-- CHECK: description must not be blank
ALTER TABLE parcel_history
    ADD CONSTRAINT chk_history_description_not_blank
    CHECK (trim(description) <> '');

-- Partial unique: source record identity
CREATE UNIQUE INDEX IF NOT EXISTS uq_history_source_record
    ON parcel_history (source_id, source_record_id)
    WHERE source_id IS NOT NULL AND source_record_id IS NOT NULL;

-- ============================================================================
-- 17. UPDATE TYPE DEFINITIONS (database.ts alignment notes)
-- ============================================================================
-- The following TypeScript types in src/types/database.ts should be updated
-- to match the new NOT NULL rules. This is a schema-only migration.
-- Application code changes are NOT part of this step.
--
-- Fields changed to NOT NULL (must remove | null from TS types):
--   parcels: area, area_unit, data_status, verification_status
--   rights_records: rights_holder_name, rights_holder_type, verification_status
--   registration_records: registration_date, transaction_status, verification_status
--   encumbrances: status, verification_status
--   building_permissions: approval_status
--   restrictions: status (new column)
--   parcel_history: event_date
--
-- New columns added:
--   planning_records: source_record_id
--   property_tax_records: source_record_id
--   utility_records: source_record_id
--   restrictions: status
-- ============================================================================

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
