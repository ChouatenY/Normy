import { NextResponse } from 'next/server';
import { getApiUrl } from '../../../lib/env.js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const API_URL = getApiUrl();
    const targetUrl = `${API_URL}/telemetry/batch`;

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Telemetry proxy failed' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error(`[ROUTE /telemetry/batch] EXCEPTION: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
