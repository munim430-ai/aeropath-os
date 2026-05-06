import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function middleware(request: NextRequest) {
  // 1. Create an unmodified response for Supabase
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Initialize Supabase with session refreshing
  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
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
    },
  );

  // Refresh session
  await supabase.auth.getUser()

  // 3. Subdomain Proxy Logic
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

  const hostWithoutPort = hostname.split(':')[0]
  const rootWithoutPort = rootDomain.split(':')[0]

  const isSubdomain =
    hostWithoutPort !== rootWithoutPort &&
    hostWithoutPort !== 'www' &&
    hostWithoutPort.endsWith(`.${rootWithoutPort}`)

  if (isSubdomain) {
    const subdomain = hostWithoutPort.replace(`.${rootWithoutPort}`, '')
    url.pathname = `/app/${subdomain}${url.pathname === '/' ? '' : url.pathname}`
    // Merge the Supabase response headers into the rewrite
    const rewriteResponse = NextResponse.rewrite(url)
    // Copy cookies from supabaseResponse to the rewriteResponse
    supabaseResponse.cookies.getAll().forEach(c => rewriteResponse.cookies.set(c.name, c.value))
    return rewriteResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
