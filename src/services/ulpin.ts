export interface ULPINInfo {
  ulpin: string;
  isOfficial: boolean;
  isValid: boolean;
  components?: {
    stateCode: string;
    districtCode: string;
    mandalCode: string;
    villageCode: string;
    sequence: string;
  };
}

const ULPIN_PATTERN = /^[A-Z]{2}-[A-Z]{2}-[A-Z]{2}-[A-Z]{2}-\d{4,}$/;

export function validateULPINFormat(ulpin: string): boolean {
  return ULPIN_PATTERN.test(ulpin);
}

export function parseULPINComponents(ulpin: string): ULPINInfo['components'] | null {
  if (!validateULPINFormat(ulpin)) return null;
  const parts = ulpin.split('-');
  return {
    stateCode: parts[0],
    districtCode: parts[1],
    mandalCode: parts[2],
    villageCode: parts[3],
    sequence: parts[4],
  };
}

export function isOfficialULPIN(ulpin: string | null, sourceType?: string): boolean {
  if (!ulpin) return false;
  if (!validateULPINFormat(ulpin)) return false;
  return sourceType === 'REAL_OFFICIAL' || sourceType === 'OPEN_DATA';
}

export function generateInternalParcelId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DS-${timestamp}-${random}`;
}

export function getULPINDisplay(
  ulpin: string | null,
  sourceType?: string | null
): { label: string; type: 'official' | 'internal' | 'none'; badge: string } {
  if (!ulpin) {
    return { label: 'Not assigned', type: 'none', badge: 'bg-gray-100 text-gray-500' };
  }
  if (isOfficialULPIN(ulpin, sourceType || undefined)) {
    return { label: ulpin, type: 'official', badge: 'bg-emerald-100 text-emerald-700' };
  }
  if (validateULPINFormat(ulpin)) {
    return { label: ulpin, type: 'internal', badge: 'bg-blue-100 text-blue-700' };
  }
  return { label: ulpin, type: 'internal', badge: 'bg-amber-100 text-amber-700' };
}
