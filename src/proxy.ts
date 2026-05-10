import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { canAccessAppPath } from "@/lib/rbac";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function withSessionCookies(response: NextResponse, sessionResponse: NextResponse) {
  sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie.name, cookie.value))
  return response
}

export async function proxy(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  const appPath = isSubdomain
    ? `/app/${hostWithoutPort.replace(`.${rootWithoutPort}`, '')}${url.pathname === '/' ? '' : url.pathname}`
    : url.pathname

  if (appPath.startsWith('/app/')) {
    const [, , agencyId] = appPath.split('/')
    const { data: auth } = await supabase.auth.getUser()

    if (!auth.user) {
      return withSessionCookies(NextResponse.redirect(new URL('/login', request.url)), supabaseResponse)
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('role, status, agencies(subdomain)')
      .eq('auth_id', auth.user.id)
      .single()

    const agency = dbUser as { role?: string | null; status?: string | null; agencies?: { subdomain?: string | null } | null } | null
    if (!agency || agency.agencies?.subdomain !== agencyId) {
      return withSessionCookies(NextResponse.redirect(new URL('/login', request.url)), supabaseResponse)
    }

    if (agency.status === 'Disabled') {
      return withSessionCookies(NextResponse.redirect(new URL('/login?disabled=1', request.url)), supabaseResponse)
    }

    if (!canAccessAppPath(agency.role, agency.status, appPath, agencyId)) {
      return withSessionCookies(NextResponse.redirect(new URL(`/app/${agencyId}`, request.url)), supabaseResponse)
    }
  } else {
    await supabase.auth.getUser()
  }

  if (isSubdomain) {
    const subdomain = hostWithoutPort.replace(`.${rootWithoutPort}`, '')
    url.pathname = `/app/${subdomain}${url.pathname === '/' ? '' : url.pathname}`
    return withSessionCookies(NextResponse.rewrite(url), supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
