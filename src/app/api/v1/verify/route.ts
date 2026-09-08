import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../lib/response';
import { verifyParcel, getVerificationHistory } from '@/services/verification';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parcel_id, action, notes, user_id, user_email, user_role } = body;

    if (!parcel_id || !action) return apiError('parcel_id and action are required');
    if (!['verified', 'rejected', 'needs_review', 'escalated'].includes(action)) {
      return apiError('Invalid action. Must be: verified, rejected, needs_review, escalated');
    }

    const success = await verifyParcel(
      parcel_id,
      action,
      notes || '',
      user_id || 'anonymous',
      user_email || 'anonymous',
      user_role || 'citizen'
    );

    return apiSuccess({ success, parcelId: parcel_id, action });
  } catch (err) {
    console.error('Verify API error:', err);
    return apiError('Failed to verify parcel', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parcelId = searchParams.get('parcel_id');
    if (!parcelId) return apiError('parcel_id is required');

    const history = await getVerificationHistory(parcelId);
    return apiSuccess({ history, total: history.length });
  } catch (err) {
    console.error('Verification history error:', err);
    return apiError('Failed to fetch verification history', 500);
  }
}
