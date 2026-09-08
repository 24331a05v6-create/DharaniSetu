import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../lib/response';
import { getSourceHealth } from '@/services/sourceHealth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await getSourceHealth();
    return apiSuccess({ sources: health, total: health.length });
  } catch (err) {
    console.error('Source health error:', err);
    return apiError('Failed to fetch source health', 500);
  }
}
