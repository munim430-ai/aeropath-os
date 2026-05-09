'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { addCashEntry, addBankTransaction } from '@/app/actions/finance'

interface Props {
  agencyId: string
  type: 'cash' | 'bank'
}

export function AddFinanceDialog({ agencyId, type }: Props) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const result = type === 'cash' 
      ? await addCashEntry(agencyId, formData)
      : await addBankTransaction(agencyId, formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add {type === 'cash' ? 'Entry' : 'Transaction'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add {type === 'cash' ? 'Cash Ledger Entry' : 'Bank Transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input name="date" type="date" label="Date" required defaultValue={new Date().toISOString().split('T')[0]} />
          <Input name="description" label="Description" placeholder={type === 'cash' ? 'Office Rent' : 'BKASH Transfer'} required />
          
          <div className="grid grid-cols-2 gap-3">
            <Input name="amount" type="number" label="Amount (৳)" placeholder="5000" required />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#606060]">Type</label>
              <select 
                name="type" 
                className="w-full h-9 px-3 rounded-md border border-[#2A2A2A] bg-[#111111] text-sm text-[#F5F5F5] focus:ring-2 focus:ring-[var(--tenant-primary)] outline-none"
                required
              >
                {type === 'cash' ? (
                  <>
                    <option value="Out">Expense (Out)</option>
                    <option value="In">Inflow (In)</option>
                  </>
                ) : (
                  <>
                    <option value="Deposit">Deposit</option>
                    <option value="Withdrawal">Withdrawal</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {type === 'cash' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#606060]">Category</label>
              <select 
                name="category" 
                className="w-full h-9 px-3 rounded-md border border-[#2A2A2A] bg-[#111111] text-sm text-[#F5F5F5] focus:ring-2 focus:ring-[var(--tenant-primary)] outline-none"
                required
              >
                <option value="Extra">Extra / Other</option>
                <option value="Rent">Office Rent</option>
                <option value="Salary">Wages / Salary</option>
                <option value="Utility">Utility Bill</option>
                <option value="Deposit">Bank Deposit</option>
              </select>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={loading}>
              Save {type === 'cash' ? 'Entry' : 'Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
