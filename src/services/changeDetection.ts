import { getSupabase } from '@/lib/supabase';

export interface ChangeDetection {
  id: string;
  parcel_id: string;
  change_type: string;
  previous_date: string | null;
  current_date: string | null;
  confidence_score: number | null;
  evidence_description: string | null;
  is_demonstration: boolean;
  data_source: string;
  review_status: string;
  reviewer_email: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const CHANGE_TYPE_LABELS: Record<string, string> = {
  built_up_change: 'Built-up Change',
  vegetation_change: 'Vegetation Change',
  water_change: 'Water Body Change',
  boundary_change: 'Boundary Change',
  land_use_change: 'Land Use Change',
  no_change: 'No Change Detected',
};

export async function getChangeDetections(filters?: {
  parcelId?: string;
  reviewStatus?: string;
  limit?: number;
}): Promise<ChangeDetection[]> {
  const supabase = getSupabase();
  let query = (supabase.from('change_detections') as any).select('*');
  
  if (filters?.parcelId) query = query.eq('parcel_id', filters.parcelId);
  if (filters?.reviewStatus) query = query.eq('review_status', filters.reviewStatus);
  query = query.order('created_at', { ascending: false });
  if (filters?.limit) query = query.limit(filters.limit);
  
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ChangeDetection[];
}

export async function reviewChangeDetection(
  changeId: string,
  decision: 'confirmed' | 'rejected' | 'requires_field_verification',
  reviewerId: string,
  reviewerEmail: string,
  notes?: string
): Promise<void> {
  const supabase = getSupabase();
  await (supabase.from('change_detections') as any).update({
    review_status: decision,
    reviewer_id: reviewerId,
    reviewer_email: reviewerEmail,
    review_notes: notes || null,
    reviewed_at: new Date().toISOString(),
  }).eq('id', changeId);
}
