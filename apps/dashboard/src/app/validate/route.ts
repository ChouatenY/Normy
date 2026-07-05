import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const authHeader = req.headers.get('Authorization');
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    const res = await fetch(`${API_URL}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('Proxy Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
