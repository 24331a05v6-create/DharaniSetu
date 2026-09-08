-- ============================================================================
-- DHARANISETU DATABASE MIGRATION
-- Step 2A: Supabase PostgreSQL + PostGIS Foundation
-- ============================================================================
-- This migration creates the complete database schema for DharaniSetu.
-- Run this migration in your Supabase SQL Editor or via Supabase CLI.
-- ============================================================================

-- Enable PostGIS extension (required for spatial data)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. STATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    capital VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE states IS 'Indian states - top level of administrative hierarchy';

-- ============================================================================
-- 2. DISTRICTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_id UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(state_id, code)
);

COMMENT ON TABLE districts IS 'Districts within states';

CREATE INDEX idx_districts_state_id ON districts(state_id);

-- ============================================================================
-- 3. MANDALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS mandals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    mandal_type VARCHAR(50) DEFAULT 'mandal',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(district_id, code)
);

COMMENT ON TABLE mandals IS 'Mandals/Taluks within districts';

CREATE INDEX idx_mandals_district_id ON mandals(district_id);

-- ============================================================================
-- 4. VILLAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS villages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mandal_id UUID NOT NULL REFERENCES mandals(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    ward VARCHAR(50),
    local_body VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mandal_id, code)
);

COMMENT ON TABLE villages IS 'Villages/Wards within mandals';

CREATE INDEX idx_villages_mandal_id ON villages(mandal_id);

-- ============================================================================
-- 5. DATA SOURCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL,
    source_type VARCHAR(30) NOT NULL CHECK (source_type IN (
        'REAL_OFFICIAL', 'OPEN_DATA', 'EXTERNAL_OPEN_DATA', 'DEMONSTRATION', 'MOCK_API'
    )),
    source_url TEXT,
    source_system VARCHAR(100),
    data_status VARCHAR(50) DEFAULT 'active',
    reliability_status VARCHAR(50) DEFAULT 'unverified',
    last_synchronized_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE data_sources IS 'Tracks origin and reliability of all data in the system';

-- ============================================================================
-- 6. PARCELS (Central Entity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ulpin VARCHAR(50) UNIQUE,
    parcel_reference VARCHAR(100),
    survey_number VARCHAR(50) NOT NULL,
    subdivision_number VARCHAR(20),
    state_id UUID NOT NULL REFERENCES states(id),
    district_id UUID NOT NULL REFERENCES districts(id),
    mandal_id UUID NOT NULL REFERENCES mandals(id),
    village_id UUID NOT NULL REFERENCES villages(id),
    ward VARCHAR(50),
    local_body VARCHAR(100),
    area DECIMAL(15, 4),
    area_unit VARCHAR(20) DEFAULT 'sq.m',
    land_classification VARCHAR(50),
    land_use VARCHAR(50) DEFAULT 'other',
    geometry GEOMETRY(GEOMETRY, 4326) NOT NULL,
    centroid GEOMETRY(POINT, 4326),
    source_id UUID REFERENCES data_sources(id),
    source_record_id VARCHAR(100),
    data_status VARCHAR(30) DEFAULT 'unverified' CHECK (data_status IN (
        'verified', 'pending_verification', 'unverified', 'disputed'
    )),
    verification_status VARCHAR(30) DEFAULT 'pending_verification',
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE parcels IS 'Central entity - every land parcel in the system';
COMMENT ON COLUMN parcels.ulpin IS 'Unique Land Parcel Identification Number - national identifier';
COMMENT ON COLUMN parcels.geometry IS 'PostGIS geometry in WGS84 (EPSG:4326)';
COMMENT ON COLUMN parcels.centroid IS 'Auto-computed centroid of parcel geometry';

-- Spatial indexes for parcels
CREATE INDEX idx_parcels_geometry ON parcels USING GIST(geometry);
CREATE INDEX idx_parcels_centroid ON parcels USING GIST(centroid);
CREATE INDEX idx_parcels_state_id ON parcels(state_id);
CREATE INDEX idx_parcels_district_id ON parcels(district_id);
CREATE INDEX idx_parcels_mandal_id ON parcels(mandal_id);
CREATE INDEX idx_parcels_village_id ON parcels(village_id);
CREATE INDEX idx_parcels_ulpin ON parcels(ulpin);
CREATE INDEX idx_parcels_survey_number ON parcels(survey_number);
CREATE INDEX idx_parcels_land_use ON parcels(land_use);

-- ============================================================================
-- 7. RIGHTS RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS rights_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    rights_holder_name VARCHAR(200),
    rights_holder_type VARCHAR(30) DEFAULT 'individual' CHECK (rights_holder_type IN (
        'individual', 'joint', 'government', 'corporate', 'trust', 'other'
    )),
    right_type VARCHAR(30) NOT NULL CHECK (right_type IN (
        'ownership', 'leasehold', 'mortgagee', 'licensee', 'easement', 'other'
    )),
    share VARCHAR(50),
    extent VARCHAR(100),
    possession_status VARCHAR(30) DEFAULT 'in_possession' CHECK (possession_status IN (
        'in_possession', 'not_in_possession', 'disputed'
    )),
    record_number VARCHAR(100),
    record_date DATE,
    mutation_reference VARCHAR(100),
    source_id UUID REFERENCES data_sources(id),
    source_record_id VARCHAR(100),
    verification_status VARCHAR(30) DEFAULT 'pending_verification',
    is_demonstration BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE rights_records IS 'Ownership and rights information for parcels';

CREATE INDEX idx_rights_records_parcel_id ON rights_records(parcel_id);
CREATE INDEX idx_rights_records_right_type ON rights_records(right_type);

-- ============================================================================
-- 8. REGISTRATION RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS registration_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    document_number VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
        'sale', 'gift', 'partition', 'mortgage', 'lease', 'surrender', 'other'
    )),
    registration_date DATE,
    execution_date DATE,
    transaction_status VARCHAR(30) DEFAULT 'completed' CHECK (transaction_status IN (
        'completed', 'pending', 'cancelled', 'disputed'
    )),
    consideration_amount DECIMAL(15, 2),
    stamp_duty DECIMAL(15, 2),
    source_id UUID REFERENCES data_sources(id),
    source_record_id VARCHAR(100),
    verification_status VARCHAR(30) DEFAULT 'pending_verification',
    is_demonstration BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE registration_records IS 'Registration and transaction history for parcels';

CREATE INDEX idx_registration_records_parcel_id ON registration_records(parcel_id);
CREATE INDEX idx_registration_records_document_number ON registration_records(document_number);
CREATE INDEX idx_registration_records_registration_date ON registration_records(registration_date);

-- ============================================================================
-- 9. ENCUMBRANCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS encumbrances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    encumbrance_type VARCHAR(30) NOT NULL CHECK (encumbrance_type IN (
        'mortgage', 'lien', 'attachment', 'court_order', 'charge', 'other'
    )),
    reference_number VARCHAR(100),
    start_date DATE,
    release_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active', 'released', 'disputed'
    )),
    description TEXT,
    source_id UUID REFERENCES data_sources(id),
    source_record_id VARCHAR(100),
    verification_status VARCHAR(30) DEFAULT 'pending_verification',
    is_demonstration BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE encumbrances IS 'Encumbrances, mortgages, and charges on parcels';

CREATE INDEX idx_encumbrances_parcel_id ON encumbrances(parcel_id);
CREATE INDEX idx_encumbrances_status ON encumbrances(status);

-- ============================================================================
-- 10. PLANNING RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS planning_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    zoning VARCHAR(50) NOT NULL,
    master_plan_zone VARCHAR(100),
    permitted_land_use VARCHAR(100),
    development_restrictions TEXT,
    road_reservation BOOLEAN DEFAULT false,
    building_restrictions TEXT,
    planning_authority VARCHAR(100),
    effective_date DATE,
    review_date DATE,
    source_id UUID REFERENCES data_sources(id),
    source_record_id VARCHAR(100),
    is_demonstration BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE planning_records IS 'Town planning and zoning information for parcels';

CREATE INDEX idx_planning_records_parcel_id ON planning_records(parcel_id);
CREATE INDEX idx_planning_records_zoning ON planning_records(zoning);

-- ============================================================================
-- 11. BUILDING PERMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS building_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    permission_number VARCHAR(100) NOT NULL,
    approval_status VARCHAR(30) DEFAULT 'pending' CHECK (approval_status IN (
        'approved', 'pending', 'rejected', 'expired', 'revoked'
    )),
    approval_date DATE,
    building_use VARCHAR(100),
    permitted_floors INTEGER,
    permitted_height DECIMAL(8, 2),
    height_unit VARCHAR(10) DEFAULT 'm',
    built_up_area DECIMAL(12, 2),
    area_unit VARCHAR(20) DEFAULT 'sq.m',
    authority VARCHAR(100),
    source_id UUID REFERENCES data_sources(id),
    source_record_id VARCHAR(100),
    is_demonstration BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE building_permissions IS 'Building permissions and approvals for parcels';

CREATE INDEX idx_building_permissions_parcel_id ON building_permissions(parcel_id);

-- ============================================================================
-- 12. PROPERTY TAX RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS property_tax_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    assessment_number VARCHAR(100),
    assessment_year VARCHAR(10) NOT NULL,
    assessed_value DECIMAL(15, 2),
    tax_amount DECIMAL(15, 2),
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    outstanding_amount DECIMAL(15, 2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'current', 'arrears', 'exempted', 'under_assessment', 'pending'
    )),
    last_paid_date DATE,
    source_id UUID REFERENCES data_sources(id),
    source_record_id VARCHAR(100),
    is_demonstration BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE property_tax_records IS 'Property tax assessment and payment records';

CREATE INDEX idx_property_tax_records_parcel_id ON property_tax_records(parcel_id);
CREATE INDEX idx_property_tax_records_assessment_year ON property_tax_records(assessment_year);

-- ============================================================================
-- 13. UTILITY RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS utility_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    electricity BOOLEAN DEFAULT false,
    water BOOLEAN DEFAULT false,
    drainage BOOLEAN DEFAULT false,
    sewerage BOOLEAN DEFAULT false,
    gas BOOLEAN DEFAULT false,
    road_access BOOLEAN DEFAULT false,
    telecom_fiber BOOLEAN DEFAULT false,
    provider VARCHAR(100),
    connection_id VARCHAR(100),
    source_id UUID REFERENCES data_sources(id),
    is_demonstration BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE utility_records IS 'Utility availability and connection status for parcels';

CREATE INDEX idx_utility_records_parcel_id ON utility_records(parcel_id);

-- ============================================================================
-- 14. RESTRICTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS restrictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    restriction_type VARCHAR(50) NOT NULL CHECK (restriction_type IN (
        'flood_zone', 'environmental', 'acquisition', 'protected_area',
        'coastal', 'development', 'heritage', 'court_order', 'other'
    )),
    description TEXT NOT NULL,
    authority VARCHAR(200) NOT NULL,
    effective_date DATE,
    expiry_date DATE,
    review_date DATE,
    affected_area VARCHAR(100),
    geometry GEOMETRY(GEOMETRY, 4326),
    source_id UUID REFERENCES data_sources(id),
    source_record_id VARCHAR(100),
    is_demonstration BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE restrictions IS 'Legal and regulatory restrictions on parcels';

CREATE INDEX idx_restrictions_parcel_id ON restrictions(parcel_id);
CREATE INDEX idx_restrictions_restriction_type ON restrictions(restriction_type);
CREATE INDEX idx_restrictions_geometry ON restrictions USING GIST(geometry);

-- ============================================================================
-- 15. PARCEL DOCUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS parcel_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_reference VARCHAR(200),
    document_number VARCHAR(100),
    storage_path TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    issuing_authority VARCHAR(200),
    issue_date DATE,
    source_id UUID REFERENCES data_sources(id),
    verification_status VARCHAR(30) DEFAULT 'pending_verification',
    is_demonstration BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE parcel_documents IS 'Document metadata for parcels - actual files stored in Supabase Storage';

CREATE INDEX idx_parcel_documents_parcel_id ON parcel_documents(parcel_id);
CREATE INDEX idx_parcel_documents_document_type ON parcel_documents(document_type);

-- ============================================================================
-- 16. PARCEL HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS parcel_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE,
    description TEXT NOT NULL,
    reference VARCHAR(200),
    source_id UUID REFERENCES data_sources(id),
    is_demonstration BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE parcel_history IS 'Chronological event history for parcels';

CREATE INDEX idx_parcel_history_parcel_id ON parcel_history(parcel_id);
CREATE INDEX idx_parcel_history_event_date ON parcel_history(event_date);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_states_updated_at BEFORE UPDATE ON states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON districts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mandals_updated_at BEFORE UPDATE ON mandals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_villages_updated_at BEFORE UPDATE ON villages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcels_updated_at BEFORE UPDATE ON parcels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rights_records_updated_at BEFORE UPDATE ON rights_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registration_records_updated_at BEFORE UPDATE ON registration_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encumbrances_updated_at BEFORE UPDATE ON encumbrances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planning_records_updated_at BEFORE UPDATE ON planning_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_building_permissions_updated_at BEFORE UPDATE ON building_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_tax_records_updated_at BEFORE UPDATE ON property_tax_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_utility_records_updated_at BEFORE UPDATE ON utility_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restrictions_updated_at BEFORE UPDATE ON restrictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parcel_documents_updated_at BEFORE UPDATE ON parcel_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Auto-compute parcel centroid
-- ============================================================================
CREATE OR REPLACE FUNCTION update_parcel_centroid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.geometry IS NOT NULL THEN
        NEW.centroid = ST_Centroid(NEW.geometry);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_parcel_centroid
    BEFORE INSERT OR UPDATE OF geometry ON parcels
    FOR EACH ROW EXECUTE FUNCTION update_parcel_centroid();

-- ============================================================================
-- FUNCTION: Generate ULPIN (placeholder - will be customized per state)
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_ulpin(
    p_state_code VARCHAR,
    p_district_code VARCHAR,
    p_mandal_code VARCHAR,
    p_village_code VARCHAR,
    p_sequence INTEGER
)
RETURNS VARCHAR AS $$
BEGIN
    RETURN p_state_code || '-' ||
           p_district_code || '-' ||
           p_mandal_code || '-' ||
           p_village_code || '-' ||
           LPAD(p_sequence::TEXT, 6, '0');
END;
$$ language 'plpgsql';

-- ============================================================================
-- SEED DATA: Initial States (India)
-- ============================================================================
INSERT INTO states (name, code, capital) VALUES
    ('Andhra Pradesh', 'AP', 'Amaravati'),
    ('Arunachal Pradesh', 'AR', 'Itanagar'),
    ('Assam', 'AS', 'Dispur'),
    ('Bihar', 'BP', 'Patna'),
    ('Chhattisgarh', 'CG', 'Raipur'),
    ('Goa', 'GA', 'Panaji'),
    ('Gujarat', 'GJ', 'Gandhinagar'),
    ('Haryana', 'HR', 'Chandigarh'),
    ('Himachal Pradesh', 'HP', 'Shimla'),
    ('Jharkhand', 'JH', 'Ranchi'),
    ('Karnataka', 'KA', 'Bengaluru'),
    ('Kerala', 'KL', 'Thiruvananthapuram'),
    ('Madhya Pradesh', 'MP', 'Bhopal'),
    ('Maharashtra', 'MH', 'Mumbai'),
    ('Manipur', 'MN', 'Imphal'),
    ('Meghalaya', 'ML', 'Shillong'),
    ('Mizoram', 'MZ', 'Aizawl'),
    ('Nagaland', 'NL', 'Kohima'),
    ('Odisha', 'OD', 'Bhubaneswar'),
    ('Punjab', 'PB', 'Chandigarh'),
    ('Rajasthan', 'RJ', 'Jaipur'),
    ('Sikkim', 'SG', 'Gangtok'),
    ('Tamil Nadu', 'TN', 'Chennai'),
    ('Telangana', 'TS', 'Hyderabad'),
    ('Tripura', 'TR', 'Agartala'),
    ('Uttar Pradesh', 'UP', 'Lucknow'),
    ('Uttarakhand', 'UK', 'Dehradun'),
    ('West Bengal', 'WB', 'Kolkata'),
    ('Delhi', 'DL', 'New Delhi'),
    ('Jammu and Kashmir', 'JK', 'Srinagar'),
    ('Ladakh', 'LA', 'Leh')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED DATA: Demonstration Data Sources
-- ============================================================================
INSERT INTO data_sources (name, department, source_type, data_status, reliability_status) VALUES
    ('Revenue Department Records', 'Revenue', 'REAL_OFFICIAL', 'active', 'verified'),
    ('Registration Department Records', 'Registration', 'REAL_OFFICIAL', 'active', 'verified'),
    ('Town Planning Department', 'Planning', 'REAL_OFFICIAL', 'active', 'verified'),
    ('Cadastral Map Data (Demonstration)', 'Survey & Land Records', 'DEMONSTRATION', 'active', 'demonstration'),
    ('OpenStreetMap', 'External', 'EXTERNAL_OPEN_DATA', 'active', 'external')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandals ENABLE ROW LEVEL SECURITY;
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rights_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE encumbrances ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_tax_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcel_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcel_history ENABLE ROW LEVEL SECURITY;

-- Public read access for administrative hierarchy
CREATE POLICY "Public can read states" ON states
    FOR SELECT USING (true);

CREATE POLICY "Public can read districts" ON districts
    FOR SELECT USING (true);

CREATE POLICY "Public can read mandals" ON mandals
    FOR SELECT USING (true);

CREATE POLICY "Public can read villages" ON villages
    FOR SELECT USING (true);

CREATE POLICY "Public can read data sources" ON data_sources
    FOR SELECT USING (true);

-- Public read access for parcels (verified data only for public)
CREATE POLICY "Public can read verified parcels" ON parcels
    FOR SELECT USING (
        data_status = 'verified'
        OR verification_status = 'verified'
    );

-- Public read access for verified rights records
CREATE POLICY "Public can read verified rights" ON rights_records
    FOR SELECT USING (
        verification_status = 'verified'
        OR is_demonstration = true
    );

-- Public read access for verified registration records
CREATE POLICY "Public can read verified registrations" ON registration_records
    FOR SELECT USING (
        verification_status = 'verified'
        OR is_demonstration = true
    );

-- Public read access for verified encumbrances
CREATE POLICY "Public can read verified encumbrances" ON encumbrances
    FOR SELECT USING (
        verification_status = 'verified'
        OR is_demonstration = true
    );

-- Public read access for planning records
CREATE POLICY "Public can read planning records" ON planning_records
    FOR SELECT USING (true);

-- Public read access for building permissions
CREATE POLICY "Public can read building permissions" ON building_permissions
    FOR SELECT USING (true);

-- Public read access for property tax records
CREATE POLICY "Public can read tax records" ON property_tax_records
    FOR SELECT USING (true);

-- Public read access for utility records
CREATE POLICY "Public can read utility records" ON utility_records
    FOR SELECT USING (true);

-- Public read access for restrictions
CREATE POLICY "Public can read restrictions" ON restrictions
    FOR SELECT USING (true);

-- Public read access for documents (metadata only)
CREATE POLICY "Public can read document metadata" ON parcel_documents
    FOR SELECT USING (true);

-- Public read access for history
CREATE POLICY "Public can read parcel history" ON parcel_history
    FOR SELECT USING (true);

-- Government users can manage all data (placeholder for role-based access)
-- These policies will be updated when authentication is implemented
CREATE POLICY "Authenticated users can manage parcels" ON parcels
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage rights" ON rights_records
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage registrations" ON registration_records
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage encumbrances" ON encumbrances
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage planning" ON planning_records
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage building" ON building_permissions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage tax" ON property_tax_records
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage utilities" ON utility_records
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage restrictions" ON restrictions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage documents" ON parcel_documents
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage history" ON parcel_history
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
