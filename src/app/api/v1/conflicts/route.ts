import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../lib/response';
import { getOpenConflicts, detectConflicts } from '@/services/verification';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parcelId = searchParams.get('parcel_id');

    if (parcelId) {
      const conflicts = await detectConflicts(parcelId);
      return apiSuccess({ conflicts, total: conflicts.length });
    }

    const conflicts = await getOpenConflicts();
    return apiSuccess({ conflicts, total: conflicts.length });
  } catch (err) {
    console.error('Conflicts API error:', err);
    return apiError('Failed to fetch conflicts', 500);
  }
}
