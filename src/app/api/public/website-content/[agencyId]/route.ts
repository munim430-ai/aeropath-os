import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeWebsiteContent } from '@/lib/website-content'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  const { agencyId } = await params
  const supabase = await createClient()

  const { data: agency, error: agencyError } = await supabase
    .from('agencies')
    .select('id, name, subdomain, logo_url, primary_color, website')
    .eq('subdomain', agencyId)
    .maybeSingle()

  if (agencyError) {
    return NextResponse.json({ error: agencyError.message }, { status: 500, headers: corsHeaders })
  }

  if (!agency) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404, headers: corsHeaders })
  }

  const { data: websiteContent, error: contentError } = await supabase
    .from('website_content')
    .select('content, published_at, updated_at')
    .eq('agency_id', agency.id)
    .eq('is_published', true)
    .maybeSingle()

  if (contentError) {
    return NextResponse.json({ error: contentError.message }, { status: 500, headers: corsHeaders })
  }

  if (!websiteContent) {
    return NextResponse.json({ error: 'Website content is not published' }, { status: 404, headers: corsHeaders })
  }

  return NextResponse.json(
    {
      agency: {
        name: agency.name,
        subdomain: agency.subdomain,
        logo_url: agency.logo_url,
        primary_color: agency.primary_color,
        website: agency.website,
      },
      content: normalizeWebsiteContent(websiteContent.content),
      published_at: websiteContent.published_at,
      updated_at: websiteContent.updated_at,
    },
    {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  )
}
