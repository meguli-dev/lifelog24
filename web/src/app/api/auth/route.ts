import { NextResponse } from 'next/server';

const PASSWORD = process.env.AUTH_PASSWORD || 'Meguli1234!';
const COOKIE_NAME = 'lifelog_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request) {
  const { password } = await request.json();

  if (password !== PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = Buffer.from(`${Date.now()}:${PASSWORD}`).toString('base64');

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return response;
}
