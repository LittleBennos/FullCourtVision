import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  "X-RateLimit-Limit": "100",
  "X-RateLimit-Remaining": "99",
  "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 3600),
};

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export function error(message: string, status = 400) {
  return json({ error: message }, status);
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function parseIntParam(val: string | null, defaultVal: number, max?: number): number {
  const n = val ? parseInt(val, 10) : defaultVal;
  if (isNaN(n) || n < 0) return defaultVal;
  return max ? Math.min(n, max) : n;
}
