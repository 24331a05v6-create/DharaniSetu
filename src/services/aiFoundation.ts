export type AnalysisType = 'anomaly_detection' | 'conflict_prediction' | 'document_classification' | 'land_use_classification' | 'change_detection' | 'duplicate_detection' | 'data_quality_assessment';

export interface AiAnalysisRequest {
  parcelId?: string;
  analysisType: AnalysisType;
  inputSummary: string;
}

export interface AiAnalysisResult {
  id: string;
  analysisType: AnalysisType;
  modelName: string;
  modelVersion: string;
  outputResult: Record<string, unknown>;
  confidenceScore: number;
  isDemonstration: boolean;
  explanation: string;
}

export const ANALYSIS_TYPE_LABELS: Record<AnalysisType, string> = {
  anomaly_detection: 'Anomaly Detection',
  conflict_prediction: 'Conflict Prediction',
  document_classification: 'Document Classification',
  land_use_classification: 'Land Use Classification',
  change_detection: 'Change Detection',
  duplicate_detection: 'Duplicate Detection',
  data_quality_assessment: 'Data Quality Assessment',
};

// Placeholder — actual AI models would be plugged in here
// Each model must produce explainable results with confidence scores
// All outputs from demonstration models are clearly labeled
export function getAvailableAnalysisTypes(): Array<{ type: AnalysisType; label: string; status: 'available' | 'coming_soon' }> {
  return [
    { type: 'data_quality_assessment', label: 'Data Quality Assessment', status: 'available' },
    { type: 'anomaly_detection', label: 'Anomaly Detection', status: 'coming_soon' },
    { type: 'conflict_prediction', label: 'Conflict Prediction', status: 'coming_soon' },
    { type: 'document_classification', label: 'Document Classification', status: 'coming_soon' },
    { type: 'land_use_classification', label: 'Land Use Classification', status: 'coming_soon' },
    { type: 'change_detection', label: 'Change Detection', status: 'coming_soon' },
    { type: 'duplicate_detection', label: 'Duplicate Detection', status: 'coming_soon' },
  ];
}
