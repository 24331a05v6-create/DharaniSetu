import { getSupabase } from '@/lib/supabase';

export interface ServiceRequest {
  id: string;
  parcel_id: string | null;
  citizen_user_id: string | null;
  citizen_email: string;
  service_type: string;
  description: string | null;
  status: string;
  assigned_department: string | null;
  assigned_role: string | null;
  priority: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestUpdate {
  id: string;
  request_id: string;
  old_status: string | null;
  new_status: string;
  updated_by_email: string | null;
  notes: string | null;
  created_at: string;
}

export type ServiceType = 'record_information' | 'mutation_status' | 'registration_status' | 'planning_information' | 'property_tax' | 'general_enquiry' | 'encumbrance_certificate' | 'document_copy' | 'other';

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  record_information: 'Record Information',
  mutation_status: 'Mutation/Status Enquiry',
  registration_status: 'Registration Status Enquiry',
  planning_information: 'Planning Information',
  property_tax: 'Property Tax Information',
  general_enquiry: 'General Land Enquiry',
  encumbrance_certificate: 'Encumbrance Certificate',
  document_copy: 'Document Copy',
  other: 'Other',
};

export const SERVICE_TYPE_DEPARTMENTS: Record<ServiceType, string> = {
  record_information: 'Revenue & Land Records',
  mutation_status: 'Revenue & Land Records',
  registration_status: 'Registration & Stamps',
  planning_information: 'Town Planning',
  property_tax: 'Municipal Corporation',
  general_enquiry: 'Revenue & Land Records',
  encumbrance_certificate: 'Registration & Stamps',
  document_copy: 'Revenue & Land Records',
  other: 'General',
};

export async function createServiceRequest(data: {
  parcelId?: string;
  userId?: string;
  email: string;
  serviceType: ServiceType;
  description?: string;
}): Promise<ServiceRequest | null> {
  const supabase = getSupabase();
  const { data: result, error } = await (supabase
    .from('service_requests') as any)
    .insert({
      parcel_id: data.parcelId || null,
      citizen_user_id: data.userId || null,
      citizen_email: data.email,
      service_type: data.serviceType,
      description: data.description || null,
      assigned_department: SERVICE_TYPE_DEPARTMENTS[data.serviceType],
      status: 'submitted',
      priority: 'normal',
    })
    .select()
    .single();
  
  if (error) throw error;
  return result as ServiceRequest;
}

export async function getServiceRequests(filters?: {
  userId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: ServiceRequest[]; count: number }> {
  const supabase = getSupabase();
  let query = (supabase.from('service_requests') as any).select('*', { count: 'exact' });
  
  if (filters?.userId) query = query.eq('citizen_user_id', filters.userId);
  if (filters?.status) query = query.eq('status', filters.status);
  query = query.order('created_at', { ascending: false });
  if (filters?.limit) query = query.range(filters.offset || 0, (filters.offset || 0) + filters.limit - 1);
  
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data || []) as ServiceRequest[], count: count || 0 };
}

export async function getServiceRequestUpdates(requestId: string): Promise<ServiceRequestUpdate[]> {
  const supabase = getSupabase();
  const { data, error } = await (supabase
    .from('service_request_updates') as any)
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data || []) as ServiceRequestUpdate[];
}

export async function updateServiceRequestStatus(
  requestId: string,
  newStatus: string,
  updatedBy: { userId?: string; email: string; role: string },
  notes?: string
): Promise<void> {
  const supabase = getSupabase();
  
  // Get current status
  const { data: current } = await (supabase.from('service_requests') as any).select('status').eq('id', requestId).single();
  const currentData = current as Record<string, unknown> | null;
  
  // Create update record
  await (supabase.from('service_request_updates') as any).insert({
    request_id: requestId,
    old_status: currentData?.status || null,
    new_status: newStatus,
    updated_by_user_id: updatedBy.userId || null,
    updated_by_email: updatedBy.email,
    updated_by_role: updatedBy.role,
    notes: notes || null,
  });
  
  // Update the request
  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'resolved' || newStatus === 'rejected') {
    updateData.resolved_at = new Date().toISOString();
    if (notes) updateData.resolution_notes = notes;
  }
  
  await (supabase.from('service_requests') as any).update(updateData).eq('id', requestId);
}
