-- ============================================================================
-- DHARANISETU SEED DATA
-- Demonstration data for Andhra Pradesh
-- ============================================================================
-- Run this AFTER 001_initial_schema.sql
-- This inserts demonstration parcels and related records for AP
-- ============================================================================

-- Get the AP state ID
DO $$
DECLARE
    ap_state_id UUID;
    kr_district_id UUID;
    vr_mandal_id UUID;
    gu_village_id UUID;
    demo_source_id UUID;
    parcel1_id UUID;
    parcel2_id UUID;
    parcel3_id UUID;
    parcel4_id UUID;
    parcel5_id UUID;
BEGIN
    -- Get state ID
    SELECT id INTO ap_state_id FROM states WHERE code = 'AP';

    -- Create demonstration district: Krishna
    INSERT INTO districts (state_id, name, code)
    VALUES (ap_state_id, 'Krishna', 'KR')
    ON CONFLICT (state_id, code) DO UPDATE SET name = 'Krishna'
    RETURNING id INTO kr_district_id;

    -- Create demonstration mandal: Vijayawada Rural
    INSERT INTO mandals (district_id, name, code, mandal_type)
    VALUES (kr_district_id, 'Vijayawada Rural', 'VR', 'mandal')
    ON CONFLICT (district_id, code) DO UPDATE SET name = 'Vijayawada Rural'
    RETURNING id INTO vr_mandal_id;

    -- Create demonstration village: Gunadala
    INSERT INTO villages (mandal_id, name, code)
    VALUES (vr_mandal_id, 'Gunadala', 'GU')
    ON CONFLICT (mandal_id, code) DO UPDATE SET name = 'Gunadala'
    RETURNING id INTO gu_village_id;

    -- Get demonstration source
    SELECT id INTO demo_source_id FROM data_sources WHERE name LIKE '%Demonstration%';

    -- Create Parcel 1: Residential
    INSERT INTO parcels (
        survey_number, subdivision_number, state_id, district_id, mandal_id, village_id,
        area, area_unit, land_classification, land_use, source_id, source_record_id,
        data_status, verification_status, geometry
    ) VALUES (
        '102/3', NULL, ap_state_id, kr_district_id, vr_mandal_id, gu_village_id,
        2250, 'sq.yd', 'Non-Agricultural', 'residential', demo_source_id, 'DEMO-REC-001',
        'pending_verification', 'pending_verification',
        ST_GeomFromText('POLYGON((80.6220 16.5200, 80.6230 16.5200, 80.6230 16.5210, 80.6220 16.5210, 80.6220 16.5200))', 4326)
    ) RETURNING id INTO parcel1_id;

    -- Create Parcel 2: Agricultural
    INSERT INTO parcels (
        survey_number, subdivision_number, state_id, district_id, mandal_id, village_id,
        area, area_unit, land_classification, land_use, source_id, source_record_id,
        data_status, verification_status, geometry
    ) VALUES (
        '45/1', NULL, ap_state_id, kr_district_id, vr_mandal_id, gu_village_id,
        1.5, 'acres', 'Agricultural', 'agricultural', demo_source_id, 'DEMO-REC-002',
        'verified', 'verified',
        ST_GeomFromText('POLYGON((80.6200 16.5190, 80.6210 16.5190, 80.6210 16.5200, 80.6200 16.5200, 80.6200 16.5190))', 4326)
    ) RETURNING id INTO parcel2_id;

    -- Create Parcel 3: Commercial
    INSERT INTO parcels (
        survey_number, subdivision_number, state_id, district_id, mandal_id, village_id,
        area, area_unit, land_classification, land_use, source_id, source_record_id,
        data_status, verification_status, geometry
    ) VALUES (
        '78/2', 'a', ap_state_id, kr_district_id, vr_mandal_id, gu_village_id,
        3500, 'sq.ft', 'Commercial', 'commercial', demo_source_id, 'DEMO-REC-003',
        'unverified', 'pending_verification',
        ST_GeomFromText('POLYGON((80.6240 16.5180, 80.6250 16.5180, 80.6250 16.5190, 80.6240 16.5190, 80.6240 16.5180))', 4326)
    ) RETURNING id INTO parcel3_id;

    -- Create Parcel 4: Industrial
    INSERT INTO parcels (
        survey_number, subdivision_number, state_id, district_id, mandal_id, village_id,
        area, area_unit, land_classification, land_use, source_id, source_record_id,
        data_status, verification_status, geometry
    ) VALUES (
        '201', NULL, ap_state_id, kr_district_id, vr_mandal_id, gu_village_id,
        5, 'acres', 'Industrial', 'industrial', demo_source_id, 'DEMO-REC-004',
        'pending_verification', 'pending_verification',
        ST_GeomFromText('POLYGON((80.6190 16.5210, 80.6200 16.5210, 80.6200 16.5220, 80.6190 16.5220, 80.6190 16.5210))', 4326)
    ) RETURNING id INTO parcel4_id;

    -- Create Parcel 5: Residential (another)
    INSERT INTO parcels (
        survey_number, subdivision_number, state_id, district_id, mandal_id, village_id,
        area, area_unit, land_classification, land_use, source_id, source_record_id,
        data_status, verification_status, geometry
    ) VALUES (
        '33/5', NULL, ap_state_id, kr_district_id, vr_mandal_id, gu_village_id,
        1200, 'sq.m', 'Residential', 'residential', demo_source_id, 'DEMO-REC-005',
        'verified', 'verified',
        ST_GeomFromText('POLYGON((80.6210 16.5205, 80.6215 16.5205, 80.6215 16.5210, 80.6210 16.5210, 80.6210 16.5205))', 4326)
    ) RETURNING id INTO parcel5_id;

    -- Generate ULPINs for parcels
    UPDATE parcels SET ulpin = generate_ulpin('AP', 'KR', 'VR', 'GU', 1) WHERE id = parcel1_id;
    UPDATE parcels SET ulpin = generate_ulpin('AP', 'KR', 'VR', 'GU', 2) WHERE id = parcel2_id;
    UPDATE parcels SET ulpin = generate_ulpin('AP', 'KR', 'VR', 'GU', 3) WHERE id = parcel3_id;
    UPDATE parcels SET ulpin = generate_ulpin('AP', 'KR', 'VR', 'GU', 4) WHERE id = parcel4_id;
    UPDATE parcels SET ulpin = generate_ulpin('AP', 'KR', 'VR', 'GU', 5) WHERE id = parcel5_id;

    -- Create Rights Records for Parcel 1
    INSERT INTO rights_records (
        parcel_id, rights_holder_name, rights_holder_type, right_type,
        share, extent, possession_status, record_number, record_date,
        source_id, verification_status, is_demonstration
    ) VALUES (
        parcel1_id, 'Demo Owner 1', 'individual', 'ownership',
        '100%', 'Full', 'in_possession', 'ROR-2020-001', '2020-05-15',
        demo_source_id, 'verified', true
    );

    -- Create Rights Records for Parcel 2
    INSERT INTO rights_records (
        parcel_id, rights_holder_name, rights_holder_type, right_type,
        share, extent, possession_status, record_number, record_date,
        source_id, verification_status, is_demonstration
    ) VALUES (
        parcel2_id, 'Demo Farmer 1', 'individual', 'ownership',
        '100%', 'Full', 'in_possession', 'ROR-2019-045', '2019-03-20',
        demo_source_id, 'verified', true
    );

    -- Create Registration Records
    INSERT INTO registration_records (
        parcel_id, document_number, transaction_type, registration_date,
        transaction_status, consideration_amount, stamp_duty,
        source_id, verification_status, is_demonstration
    ) VALUES
        (parcel1_id, 'DOC-2020-45678', 'sale', '2020-05-15', 'completed', 2500000, 125000, demo_source_id, 'verified', true),
        (parcel2_id, 'DOC-2019-12345', 'sale', '2019-03-20', 'completed', 1500000, 75000, demo_source_id, 'verified', true),
        (parcel3_id, 'DOC-2021-67890', 'sale', '2021-07-10', 'completed', 5000000, 250000, demo_source_id, 'pending_verification', true);

    -- Create Encumbrances
    INSERT INTO encumbrances (
        parcel_id, encumbrance_type, reference_number, start_date,
        release_date, status, source_id, verification_status, is_demonstration
    ) VALUES
        (parcel1_id, 'mortgage', 'MTG-2020-001', '2020-06-01', '2022-12-31', 'released', demo_source_id, 'verified', true),
        (parcel3_id, 'lien', 'LIEN-2021-001', '2021-08-01', NULL, 'active', demo_source_id, 'pending_verification', true);

    -- Create Planning Records
    INSERT INTO planning_records (
        parcel_id, zoning, master_plan_zone, permitted_land_use,
        development_restrictions, planning_authority, effective_date,
        source_id, is_demonstration
    ) VALUES
        (parcel1_id, 'residential', 'R2 - Medium Density Residential', 'residential', 'Max 3 floors', 'Vijayawada Municipal Corporation', '2020-01-01', demo_source_id, true),
        (parcel2_id, 'agricultural', 'A1 - Agricultural', 'agricultural', 'No non-agricultural construction', 'Revenue Department', '2015-01-01', demo_source_id, true),
        (parcel3_id, 'commercial', 'C1 - Commercial', 'commercial', 'Max 4 floors, 60% FAR', 'Vijayawada Municipal Corporation', '2020-01-01', demo_source_id, true);

    -- Create Property Tax Records
    INSERT INTO property_tax_records (
        parcel_id, assessment_number, assessment_year, assessed_value,
        tax_amount, paid_amount, outstanding_amount, payment_status,
        last_paid_date, source_id, is_demonstration
    ) VALUES
        (parcel1_id, 'ASSESS-2025-001', '2025-26', 2500000, 25000, 25000, 0, 'current', '2025-06-30', demo_source_id, true),
        (parcel2_id, 'ASSESS-2025-002', '2025-26', 1500000, 15000, 15000, 0, 'current', '2025-06-30', demo_source_id, true),
        (parcel3_id, 'ASSESS-2025-003', '2025-26', 5000000, 50000, 30000, 20000, 'arrears', '2025-03-15', demo_source_id, true);

    -- Create Utility Records
    INSERT INTO utility_records (
        parcel_id, electricity, water, drainage, sewerage, gas, road_access, telecom_fiber,
        source_id, is_demonstration
    ) VALUES
        (parcel1_id, true, true, true, true, false, true, true, demo_source_id, true),
        (parcel2_id, true, true, false, false, false, true, false, demo_source_id, true),
        (parcel3_id, true, true, true, true, true, true, true, demo_source_id, true),
        (parcel4_id, true, true, true, true, true, true, false, demo_source_id, true),
        (parcel5_id, true, true, true, true, false, true, true, demo_source_id, true);

    -- Create Restrictions
    INSERT INTO restrictions (
        parcel_id, restriction_type, description, authority,
        effective_date, is_demonstration
    ) VALUES
        (parcel3_id, 'development', 'Commercial development restricted to approved plans only', 'Vijayawada Municipal Corporation', '2020-01-01', true);

    -- Create Parcel Documents
    INSERT INTO parcel_documents (
        parcel_id, document_type, document_number, issuing_authority,
        issue_date, source_id, verification_status, is_demonstration
    ) VALUES
        (parcel1_id, 'Sale Deed', 'DOC-2020-45678', 'Sub-Registrar Office, Vijayawada', '2020-05-15', demo_source_id, 'verified', true),
        (parcel1_id, 'Encumbrance Certificate', 'EC-2020-001', 'Sub-Registrar Office, Vijayawada', '2020-06-01', demo_source_id, 'verified', true),
        (parcel2_id, 'Sale Deed', 'DOC-2019-12345', 'Sub-Registrar Office, Vijayawada', '2019-03-20', demo_source_id, 'verified', true);

    -- Create Parcel History
    INSERT INTO parcel_history (
        parcel_id, event_type, event_date, description, reference,
        source_id, is_demonstration
    ) VALUES
        (parcel1_id, 'Registration', '2020-05-15', 'Sale deed registered', 'DOC-2020-45678', demo_source_id, true),
        (parcel1_id, 'Mutation', '2020-06-01', 'Ownership mutated in revenue records', 'MUT-2020-1234', demo_source_id, true),
        (parcel1_id, 'Mortgage', '2020-06-15', 'Property mortgaged', 'MTG-2020-001', demo_source_id, true),
        (parcel1_id, 'Mortgage Release', '2022-12-31', 'Mortgage released', 'MTG-2020-001', demo_source_id, true),
        (parcel2_id, 'Registration', '2019-03-20', 'Sale deed registered', 'DOC-2019-12345', demo_source_id, true),
        (parcel3_id, 'Registration', '2021-07-10', 'Sale deed registered', 'DOC-2021-67890', demo_source_id, true);

END $$;
