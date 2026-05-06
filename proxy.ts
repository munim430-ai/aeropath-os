import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

  // Strip port for comparison on localhost
  const hostWithoutPort = hostname.split(':')[0]
  const rootWithoutPort = rootDomain.split(':')[0]

  const isSubdomain =
    hostWithoutPort !== rootWithoutPort &&
    hostWithoutPort !== 'www' &&
    hostWithoutPort.endsWith(`.${rootWithoutPort}`)

  if (isSubdomain) {
    const subdomain = hostWithoutPort.replace(`.${rootWithoutPort}`, '')
    url.pathname = `/app/${subdomain}${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
