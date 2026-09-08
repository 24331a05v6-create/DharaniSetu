import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../lib/response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const analysisTypes = [
      { type: 'data_quality_assessment', label: 'Data Quality Assessment', status: 'available' },
      { type: 'anomaly_detection', label: 'Anomaly Detection', status: 'coming_soon' },
      { type: 'conflict_prediction', label: 'Conflict Prediction', status: 'coming_soon' },
      { type: 'document_classification', label: 'Document Classification', status: 'coming_soon' },
      { type: 'land_use_classification', label: 'Land Use Classification', status: 'coming_soon' },
      { type: 'change_detection', label: 'Change Detection', status: 'coming_soon' },
      { type: 'duplicate_detection', label: 'Duplicate Detection', status: 'coming_soon' },
    ];
    return apiSuccess({ analysisTypes, note: 'AI models produce explainable results with confidence scores. All demonstration outputs are clearly labeled.' });
  } catch (err) {
    return apiError('Failed to fetch AI analysis types', 500, 'AI_ERROR');
  }
}
