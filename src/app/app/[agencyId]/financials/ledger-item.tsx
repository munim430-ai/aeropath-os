'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { updateLedgerStatus } from '@/app/actions/financials'
import { Check, X, RotateCcw } from 'lucide-react'

export function LedgerItem({ entry, agencyId }: { entry: any, agencyId: string }) {
  const [loading, setLoading] = React.useState(false)
  const pipeline = entry.pipeline as any
  const statusColor = entry.status === 'Received' ? '#10b981' : entry.status === 'Cancelled' ? '#ef4444' : '#f59e0b'

  async function handleUpdate(newStatus: 'Received' | 'Cancelled' | 'Pending') {
    setLoading(true)
    await updateLedgerStatus(agencyId, entry.id, newStatus)
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-[8px] bg-[#1A1A1A] group">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#F5F5F5] font-medium">
          {pipeline?.student?.full_name ?? 'Unknown'}
        </p>
        <p className="text-xs text-[#606060]">
          {pipeline?.university?.name ?? 'No University'} • {formatDate(entry.created_at)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[#F5F5F5] mr-2">
          {formatCurrency(entry.expected_commission)}
        </span>
        
        <Badge color={statusColor}>{entry.status}</Badge>

        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {entry.status === 'Pending' ? (
            <>
              <button
                onClick={() => handleUpdate('Received')}
                disabled={loading}
                className="p-1.5 rounded-[6px] hover:bg-green-500/10 text-[#10b981] transition-colors"
                title="Mark as Received"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleUpdate('Cancelled')}
                disabled={loading}
                className="p-1.5 rounded-[6px] hover:bg-red-500/10 text-red-400 transition-colors"
                title="Cancel Commission"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => handleUpdate('Pending')}
              disabled={loading}
              className="p-1.5 rounded-[6px] hover:bg-[#2A2A2A] text-[#A0A0A0] transition-colors"
              title="Reset to Pending"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
