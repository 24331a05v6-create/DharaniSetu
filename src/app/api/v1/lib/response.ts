import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  source: string;
  timestamp: string;
  requestId: string;
}

export function apiSuccess<T>(data: T, source = 'dharanisetu'): NextResponse {
  const body: ApiResponse<T> = {
    status: 'success',
    data,
    source,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
  };
  return NextResponse.json(body);
}

export function apiError(error: string, status = 400, source = 'dharanisetu'): NextResponse {
  const body: ApiResponse = {
    status: 'error',
    error,
    source,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
  };
  return NextResponse.json(body, { status });
}
