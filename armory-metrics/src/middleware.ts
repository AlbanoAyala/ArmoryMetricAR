import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth middleware — protect all dashboard routes
// In production, validate Supabase session cookie here
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (pathname.startsWith('/auth') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // For demo: allow everything. 
  // In production: check supabase session and redirect to /auth/login if missing
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
};
