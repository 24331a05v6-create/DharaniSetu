import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../lib/response';
import { getGovernanceAnalytics } from '@/services/analytics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const analytics = await getGovernanceAnalytics();
    return apiSuccess(analytics);
  } catch (err) {
    return apiError('Failed to fetch analytics', 500, 'ANALYTICS_ERROR');
  }
}
