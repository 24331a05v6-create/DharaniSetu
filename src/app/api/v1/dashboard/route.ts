import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../lib/response';
import { getDashboardStats } from '@/services/dashboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return apiSuccess(stats);
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return apiError('Failed to fetch dashboard statistics', 500);
  }
}
