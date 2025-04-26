import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();
  
  // Remove noindex directive and add proper SEO headers
  response.headers.set('x-robots-tag', 'index, follow, max-image-preview:large');
  
  // Add performance and caching headers for better SEO scores
  response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Response headers for security
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content security policy to improve security score
  response.headers.set('X-Frame-Options', 'DENY');
  
  return response;
}

// Run the middleware on all routes
export const config = {
  matcher: [
    // Apply to all routes except static files, api routes, and _next internal routes
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 