import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

// DELETE /api/auth/session - logs the current user out
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
