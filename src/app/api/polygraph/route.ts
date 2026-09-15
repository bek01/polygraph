import { NextResponse } from 'next/server';
import { snapshot } from '@/lib/polygraph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols')?.split(',').filter(Boolean);

  try {
    const snap = await snapshot(symbols);
    return NextResponse.json(snap, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=240' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: message, hint: 'Check that NANSEN_API_KEY is set and has credits.' },
      { status: 500 },
    );
  }
}
