-- Migration 006 Step 5: Services Tables
-- Creates tables for citizen service requests, status tracking, change detection,
-- notifications, and AI/ML analysis logging.
-- This migration is idempotent (uses IF NOT EXISTS).

-- 1. SERVICE_REQUESTS (Citizen service requests)
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    citizen_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    citizen_email VARCHAR(255),
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN (
        'record_information', 'mutation_status', 'registration_status',
        'planning_information', 'property_tax', 'general_enquiry',
        'encumbrance_certificate', 'document_copy', 'other'
    )),
    description TEXT,
    status VARCHAR(30) DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'under_review', 'processing', 'resolved', 'rejected'
    )),
    assigned_department VARCHAR(100),
    assigned_role VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE service_requests IS 'Citizen service requests associated with parcels';

-- 2. SERVICE_REQUEST_UPDATES (Status tracking)
CREATE TABLE IF NOT EXISTS service_request_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by_email VARCHAR(255),
    updated_by_role VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE service_request_updates IS 'Status change history for service requests';

-- 3. CHANGE_DETECTIONS (Satellite/change detection foundation)
CREATE TABLE IF NOT EXISTS change_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
    change_type VARCHAR(30) NOT NULL CHECK (change_type IN (
        'built_up_change', 'vegetation_change', 'water_change',
        'boundary_change', 'land_use_change', 'no_change'
    )),
    previous_date DATE,
    "current_date" DATE,
    confidence_score DECIMAL(5, 2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    evidence_description TEXT,
    is_demonstration BOOLEAN DEFAULT true,
    data_source VARCHAR(100) DEFAULT 'DEMONSTRATION',
    review_status VARCHAR(30) DEFAULT 'pending' CHECK (review_status IN (
        'pending', 'confirmed', 'rejected', 'requires_field_verification'
    )),
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewer_email VARCHAR(255),
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE change_detections IS 'Change detection records - demonstration data clearly labeled';

-- 4. NOTIFICATIONS (In-app notification model)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'service_status_update', 'verification_update', 'data_change_alert',
        'change_detection_alert', 'system_announcement'
    )),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'In-app notifications for citizens and government users';

-- 5. AI_ANALYSIS_LOG (AI/ML foundation)
CREATE TABLE IF NOT EXISTS ai_analysis_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN (
        'anomaly_detection', 'conflict_prediction', 'document_classification',
        'land_use_classification', 'change_detection', 'duplicate_detection',
        'data_quality_assessment'
    )),
    input_summary TEXT,
    output_result JSONB,
    confidence_score DECIMAL(5, 2),
    is_demonstration BOOLEAN DEFAULT true,
    explanation TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    review_status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ai_analysis_log IS 'AI/ML analysis foundation - all outputs are clearly labeled as demonstration';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_parcel_id ON service_requests(parcel_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_citizen_user_id ON service_requests(citizen_user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_request_updates_request_id ON service_request_updates(request_id);
CREATE INDEX IF NOT EXISTS idx_change_detections_parcel_id ON change_detections(parcel_id);
CREATE INDEX IF NOT EXISTS idx_change_detections_review_status ON change_detections(review_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_log_parcel_id ON ai_analysis_log(parcel_id);

-- RLS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_log ENABLE ROW LEVEL SECURITY;

-- Service requests: citizens see their own, government sees all
CREATE POLICY "Citizens can view own service requests" ON service_requests
    FOR SELECT USING (
        citizen_user_id = auth.uid()
        OR auth.role() = 'authenticated'
    );

CREATE POLICY "Citizens can create service requests" ON service_requests
    FOR INSERT WITH CHECK (
        citizen_user_id = auth.uid()
        OR auth.role() = 'authenticated'
    );

CREATE POLICY "Government can update service requests" ON service_requests
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Service request updates
CREATE POLICY "Authenticated can view request updates" ON service_request_updates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Government can create request updates" ON service_request_updates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Change detections: government only
CREATE POLICY "Government can view change detections" ON change_detections
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Government can manage change detections" ON change_detections
    FOR ALL USING (auth.role() = 'authenticated');

-- Notifications: users see their own
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- AI analysis: government only
CREATE POLICY "Government can view AI analysis" ON ai_analysis_log
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can create AI analysis" ON ai_analysis_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Triggers
DROP TRIGGER IF EXISTS update_service_requests_updated_at ON service_requests;
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_change_detections_updated_at ON change_detections;
CREATE TRIGGER update_change_detections_updated_at BEFORE UPDATE ON change_detections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
