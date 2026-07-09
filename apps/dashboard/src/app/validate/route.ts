import { NextResponse } from 'next/server';

import { getApiUrl } from '../../lib/env.js';

export async function POST(req: Request) {
  const body = await req.json();
  const authHeader = req.headers.get('Authorization');
  const API_URL = getApiUrl();
  const targetUrl = `${API_URL}/validate`;

  console.log(`[ROUTE /validate] Proxying to: ${targetUrl}`);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      console.error(`[ROUTE /validate] FAILED: HTTP ${res.status} ${res.statusText}`);
      const text = await res.text().catch(() => 'no-body');
      console.error(`[ROUTE /validate] Response body: ${text}`);
      return NextResponse.json({ error: 'Backend validation failed' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error(`[ROUTE /validate] EXCEPTION: ${error.message}`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
