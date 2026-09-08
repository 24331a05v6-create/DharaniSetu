import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../lib/response';
import { parseFile, detectFormat } from '@/services/parser';
import { ingestBatch, insertIngestedParcel } from '@/services/ingestion';
import { matchParcel } from '@/services/matching';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const stateCode = (formData.get('state_code') as string) || 'AP';
    const sourceId = formData.get('source_id') as string;

    if (!file) return apiError('No file provided');

    const content = await file.text();
    const format = detectFormat(file.name);
    const records = parseFile(content, format);

    if (records.length === 0) return apiError('No records found in file');

    const ingestionRecords = records.map(r => ({
      externalData: r.data,
      sourceId: sourceId || 'open-data-import',
      sourceRecordId: `import-${format}-${r.index}`,
      stateCode,
    }));

    const batchResult = await ingestBatch(ingestionRecords);

    const matchResults = [];
    for (let i = 0; i < records.length; i++) {
      const mapped = batchResult.results[i]?.mappedData;
      if (!mapped || batchResult.results[i].status === 'INVALID') continue;

      const match = await matchParcel(
        mapped.survey_number as string,
        mapped.subdivision_number as string | null,
        '',
        mapped.area ? Number(mapped.area) : 0,
        mapped.ulpin as string | undefined,
        mapped.parcel_reference as string | undefined
      );
      matchResults.push({
        index: i,
        match,
        mappedData: mapped,
      });
    }

    return apiSuccess({
      filename: file.name,
      format,
      totalRecords: records.length,
      valid: batchResult.valid,
      needsReview: batchResult.needsReview,
      invalid: batchResult.invalid,
      matchResults,
      errors: batchResult.results.filter(r => r.status === 'INVALID').map(r => r.errors).flat(),
      warnings: batchResult.results.filter(r => r.status === 'NEEDS_REVIEW').map(r => r.warnings).flat(),
    });
  } catch (err) {
    console.error('Import API error:', err);
    return apiError('Failed to process import file', 500);
  }
}
