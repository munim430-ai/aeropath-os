import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Subdomain routing (e.g., demo.aeropath.app)
  // Assuming the main domain is aeropath.app or localhost:3000
  const isLocalhost = hostname.includes('localhost')
  const baseDomain = isLocalhost ? 'localhost:3000' : process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '') || 'aeropath-os.vercel.app'
  
  let subdomain = null
  if (hostname !== baseDomain && hostname.endsWith(baseDomain)) {
    subdomain = hostname.replace(`.${baseDomain}`, '')
  }

  // Path-based routing for app
  if (url.pathname.startsWith('/app')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // If accessing /app without a specific agency ID and they are on a subdomain, route them
    if (url.pathname === '/app' && subdomain) {
      // Look up agency by subdomain could be done here, but usually path /app/[agencyId] is used.
      // For now, let the page component handle or redirect.
    }
  }

  if (url.pathname.startsWith('/login') || url.pathname.startsWith('/signup')) {
    if (user) {
      // Redirect to app dashboard if already logged in
      return NextResponse.redirect(new URL('/app', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
