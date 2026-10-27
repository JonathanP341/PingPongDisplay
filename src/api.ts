import type { ApiData, SubmitMatchPayload } from './types';

/** Paste your deployed Apps Script web app /exec URL here. */
export const API_URL = 'https://script.google.com/macros/s/AKfycbzpd239rOHRBGsI4HzvVV5civeMmUPSqr6sZKtol8h8ojXYwKYYWYCpJIjG0PyNVPm7/exec';

interface ApiError {
  ok: false;
  error: string;
}

async function parseResponse(res: Response): Promise<ApiData | ApiError> {
  const text = await res.text();
  try {
    return JSON.parse(text) as ApiData | ApiError;
  } catch {
    throw new Error(res.ok ? 'Invalid response from server' : `Request failed (${res.status})`);
  }
}

export async function getData(): Promise<ApiData> {
  let res: Response;
  try {
    res = await fetch(API_URL);
  } catch {
    throw new Error('Network error — check your connection and API URL');
  }
  const data = await parseResponse(res);
  if (!data.ok) {
    throw new Error(data.error || 'Failed to load data');
  }
  return data;
}

export async function submitMatch(payload: SubmitMatchPayload): Promise<void> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Network error — could not publish game');
  }
  const data = await parseResponse(res);
  if (!data.ok) {
    throw new Error(data.error || 'Failed to publish game');
  }
}
