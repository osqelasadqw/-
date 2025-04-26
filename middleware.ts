import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();
  
  // Remove noindex directive and add proper SEO headers
  response.headers.set('x-robots-tag', 'index, follow');
  
  // Add other performance related headers
  response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  return response;
}

// Run the middleware on all routes
export const config = {
  matcher: [
    // Apply to all routes except static files, api routes, and _next internal routes
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 