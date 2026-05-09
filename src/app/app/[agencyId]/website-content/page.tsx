import { getWebsiteContent } from '@/app/actions/website-content'
import { Card, CardContent } from '@/components/ui/card'
import { WebsiteContentEditor } from './website-content-editor'

export default async function WebsiteContentPage({
  params,
}: {
  params: Promise<{ agencyId: string }>
}) {
  const { agencyId } = await params
  const websiteContent = await getWebsiteContent(agencyId)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#F5F5F5]">Website Content</h1>
        <p className="text-sm text-[#606060] mt-0.5">
          Manage the public website sections that your agency website can fetch dynamically.
        </p>
      </div>

      {websiteContent ? (
        <WebsiteContentEditor agencyId={agencyId} initialContent={websiteContent} />
      ) : (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-red-400">You are not allowed to manage this workspace.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
