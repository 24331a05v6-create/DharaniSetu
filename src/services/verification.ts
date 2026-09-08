import { getSupabase } from '@/lib/supabase';

export type VerificationAction = 'verified' | 'rejected' | 'needs_review' | 'escalated';

export interface VerificationRecord {
  id: string;
  parcelId: string;
  verifierId: string;
  verifierEmail: string;
  verifierRole: string;
  action: VerificationAction;
  previousStatus: string;
  newStatus: string;
  notes: string;
  createdAt: string;
}

export interface ConflictRecord {
  id: string;
  parcelId: string;
  conflictType: 'ownership' | 'area' | 'land_use' | 'registration' | 'geometry';
  description: string;
  sourceA: string;
  sourceB: string;
  valueA: unknown;
  valueB: unknown;
  status: 'open' | 'resolved' | 'escalated';
  resolvedBy: string | null;
  resolution: string | null;
  createdAt: string;
}

export async function verifyParcel(
  parcelId: string,
  action: VerificationAction,
  notes: string,
  userId: string,
  userEmail: string,
  userRole: string
): Promise<boolean> {
  const supabase = getSupabase();

  const { data: parcel } = await supabase
    .from('parcels')
    .select('verification_status')
    .eq('id', parcelId)
    .single();

  const typedParcel = parcel as unknown as { verification_status?: string } | null;
  const previousStatus = typedParcel?.verification_status || 'unverified';
  const newStatus = action === 'verified' ? 'verified' : action === 'rejected' ? 'rejected' : 'pending';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('parcels') as any).update({
    verification_status: newStatus,
    last_verified_at: new Date().toISOString(),
  }).eq('id', parcelId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('audit_logs') as any).insert({
    user_id: userId,
    user_email: userEmail,
    user_role: userRole,
    action: `parcel_${action}`,
    entity_type: 'parcel',
    entity_id: parcelId,
    details: JSON.stringify({ previousStatus, newStatus, notes }),
  });

  return true;
}

export async function getVerificationHistory(parcelId: string): Promise<VerificationRecord[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_type', 'parcel')
    .eq('entity_id', parcelId)
    .like('action', 'parcel_%')
    .order('created_at', { ascending: false });

  return (data || []).map((log: Record<string, unknown>) => {
    const details = log.details ? (typeof log.details === 'string' ? JSON.parse(log.details) : log.details) : {};
    return {
      id: log.id as string,
      parcelId: parcelId,
      verifierId: (log.user_id as string) || '',
      verifierEmail: (log.user_email as string) || '',
      verifierRole: (log.user_role as string) || '',
      action: ((details as Record<string, unknown>).newStatus as VerificationAction) || 'needs_review',
      previousStatus: (details as Record<string, unknown>).previousStatus as string || '',
      newStatus: (details as Record<string, unknown>).newStatus as string || '',
      notes: (details as Record<string, unknown>).notes as string || '',
      createdAt: log.created_at as string,
    };
  });
}

export async function detectConflicts(parcelId: string): Promise<ConflictRecord[]> {
  const supabase = getSupabase();
  const conflicts: ConflictRecord[] = [];

  const { data: rights } = await supabase
    .from('rights_records')
    .select('id, rights_holder_name, source_id, verification_status')
    .eq('parcel_id', parcelId);

  if (rights && rights.length > 1) {
    const typedRights = rights as unknown as Array<{ id: string; rights_holder_name: string; source_id: string; verification_status: string }>;
    const names = [...new Set(typedRights.map((r) => r.rights_holder_name))];
    if (names.length > 1) {
      conflicts.push({
        id: `conflict-ownership-${parcelId}`,
        parcelId,
        conflictType: 'ownership',
        description: `Multiple ownership records found with different holders: ${names.join(', ')}`,
        sourceA: typedRights[0].source_id || 'unknown',
        sourceB: typedRights[1].source_id || 'unknown',
        valueA: typedRights[0].rights_holder_name,
        valueB: typedRights[1].rights_holder_name,
        status: 'open',
        resolvedBy: null,
        resolution: null,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const { data: regs } = await supabase
    .from('registration_records')
    .select('id, document_number, transaction_type, source_id')
    .eq('parcel_id', parcelId);

  if (regs && regs.length > 1) {
    const typedRegs = regs as unknown as Array<{ id: string; document_number: string; transaction_type: string; source_id: string }>;
    const types = [...new Set(typedRegs.map((r) => r.transaction_type))];
    if (types.length > 1) {
      conflicts.push({
        id: `conflict-registration-${parcelId}`,
        parcelId,
        conflictType: 'registration',
        description: `Multiple transaction types found: ${types.join(', ')}`,
        sourceA: typedRegs[0].source_id || 'unknown',
        sourceB: typedRegs[1].source_id || 'unknown',
        valueA: typedRegs[0].transaction_type,
        valueB: typedRegs[1].transaction_type,
        status: 'open',
        resolvedBy: null,
        resolution: null,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return conflicts;
}

export async function getOpenConflicts(): Promise<ConflictRecord[]> {
  const supabase = getSupabase();
  const { data: parcels } = await supabase
    .from('parcels')
    .select('id')
    .eq('verification_status', 'pending');

  if (!parcels) return [];

  const allConflicts: ConflictRecord[] = [];
  const typedParcels = parcels as unknown as Array<{ id: string }>;
  for (const parcel of typedParcels.slice(0, 50)) {
    const conflicts = await detectConflicts(parcel.id);
    allConflicts.push(...conflicts);
  }
  return allConflicts;
}
