import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../../lib/response';
import { getAreaAnalytics } from '@/services/analytics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { level: string } }) {
  try {
    const { level } = params;
    if (!['state', 'district', 'mandal', 'village'].includes(level)) {
      return apiError('Invalid level. Use: state, district, mandal, village', 400, 'VALIDATION_ERROR');
    }
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parent_id') || undefined;
    const data = await getAreaAnalytics(level, parentId);
    return apiSuccess({ level, data });
  } catch (err) {
    return apiError('Failed to fetch area analytics', 500, 'ANALYTICS_ERROR');
  }
}
