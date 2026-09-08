export type FileFormat = 'csv' | 'geojson' | 'json';

export interface ParsedRecord {
  data: Record<string, unknown>;
  format: FileFormat;
  index: number;
}

export function parseCSV(content: string): ParsedRecord[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const records: ParsedRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const record: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });
    records.push({ data: record, format: 'csv', index: i });
  }

  return records;
}

export function parseGeoJSON(content: string): ParsedRecord[] {
  const geojson = JSON.parse(content);
  const records: ParsedRecord[] = [];

  if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
    geojson.features.forEach((feature: Record<string, unknown>, idx: number) => {
      const props = (feature.properties as Record<string, unknown>) || {};
      if (feature.geometry) {
        props._geometry = feature.geometry;
      }
      records.push({ data: props, format: 'geojson', index: idx });
    });
  } else if (geojson.type === 'Feature') {
    const props = (geojson.properties as Record<string, unknown>) || {};
    if (geojson.geometry) {
      props._geometry = geojson.geometry;
    }
    records.push({ data: props, format: 'geojson', index: 0 });
  }

  return records;
}

export function parseJSON(content: string): ParsedRecord[] {
  const parsed = JSON.parse(content);
  const records: ParsedRecord[] = [];

  if (Array.isArray(parsed)) {
    parsed.forEach((item: Record<string, unknown>, idx: number) => {
      records.push({ data: item, format: 'json', index: idx });
    });
  } else if (typeof parsed === 'object') {
    records.push({ data: parsed, format: 'json', index: 0 });
  }

  return records;
}

export function parseFile(content: string, format: FileFormat): ParsedRecord[] {
  switch (format) {
    case 'csv': return parseCSV(content);
    case 'geojson': return parseGeoJSON(content);
    case 'json': return parseJSON(content);
    default: return [];
  }
}

export function detectFormat(filename: string): FileFormat {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'csv') return 'csv';
  if (ext === 'geojson' || ext === 'geo.json') return 'geojson';
  if (ext === 'json') return 'json';
  return 'json';
}
