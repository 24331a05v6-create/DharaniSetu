import { getSupabase } from '@/lib/supabase';

export interface SourceHealth {
  id: string;
  name: string;
  department: string;
  sourceType: string;
  recordCount: number;
  lastSync: string | null;
  verifiedCount: number;
  pendingCount: number;
  failedCount: number;
  status: 'healthy' | 'needs_attention' | 'error';
}

export async function getSourceHealth(): Promise<SourceHealth[]> {
  const supabase = getSupabase();

  const { data: sources } = await supabase
    .from('data_sources')
    .select('*')
    .order('name');

  if (!sources) return [];

  const typedSources = sources as unknown as Array<{ id: string; name: string; department: string; source_type: string; last_synchronized_at: string | null }>;
  const health: SourceHealth[] = [];

  for (const source of typedSources) {
    const { count: total } = await supabase
      .from('parcels')
      .select('id', { count: 'exact', head: true })
      .eq('source_id', source.id);

    const { count: verified } = await supabase
      .from('parcels')
      .select('id', { count: 'exact', head: true })
      .eq('source_id', source.id)
      .eq('verification_status', 'verified');

    const { count: pending } = await supabase
      .from('parcels')
      .select('id', { count: 'exact', head: true })
      .eq('source_id', source.id)
      .eq('verification_status', 'pending');

    const { count: failed } = await supabase
      .from('parcels')
      .select('id', { count: 'exact', head: true })
      .eq('source_id', source.id)
      .eq('verification_status', 'rejected');

    const recordCount = total || 0;
    const verifiedCount = verified || 0;
    const pendingCount = pending || 0;
    const failedCount = failed || 0;

    let status: SourceHealth['status'] = 'healthy';
    if (failedCount > 0) status = 'error';
    else if (pendingCount > recordCount * 0.3) status = 'needs_attention';

    health.push({
      id: source.id,
      name: source.name,
      department: source.department,
      sourceType: source.source_type,
      recordCount,
      lastSync: source.last_synchronized_at,
      verifiedCount,
      pendingCount,
      failedCount,
      status,
    });
  }

  return health;
}
