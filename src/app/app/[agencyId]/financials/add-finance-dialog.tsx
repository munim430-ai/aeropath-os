'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Edit, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  addBankTransaction,
  addCashEntry,
  addStudentPayment,
  updateCashEntry,
  updateStudentPayment,
} from '@/app/actions/finance'
import type { PaymentMethod, PaymentPurpose } from '@/lib/finance'

export type StudentOption = { id: string; full_name: string }
export type PipelineOption = {
  id: string
  student_id: string
  stage?: string | null
  university?: { name?: string | null; country?: string | null } | null
}

export type PaymentFormValue = {
  id: string
  student_id: string
  pipeline_id?: string | null
  payment_date: string
  description?: string | null
  purpose: PaymentPurpose
  method: PaymentMethod
  amount: number
  invoice_no?: string | null
  receipt_no?: string | null
  notes?: string | null
}

export type ExpenseFormValue = {
  id: string
  student_id?: string | null
  date: string
  description?: string | null
  category?: string | null
  payment_method?: string | null
  vendor_name?: string | null
  reference_no?: string | null
  amount: number
  type: 'In' | 'Out'
}

const selectClass =
  'w-full h-9 px-3 rounded-md border border-[#2A2A2A] bg-[#111111] text-sm text-[#F5F5F5] focus:ring-2 focus:ring-[var(--tenant-primary)] outline-none'

export function PaymentDialog({
  agencyId,
  students,
  pipelines,
  payment,
}: {
  agencyId: string
  students: StudentOption[]
  pipelines: PipelineOption[]
  payment?: PaymentFormValue
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [studentId, setStudentId] = React.useState(payment?.student_id ?? '')
  const router = useRouter()
  const studentPipelines = pipelines.filter((pipeline) => pipeline.student_id === studentId)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = payment
      ? await updateStudentPayment(agencyId, payment.id, formData)
      : await addStudentPayment(agencyId, formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={payment ? 'icon' : 'sm'} variant={payment ? 'ghost' : 'default'} className={payment ? 'h-8 w-8' : 'gap-1.5'}>
          {payment ? <Edit className="h-3.5 w-3.5" /> : <><Plus className="h-3.5 w-3.5" /> Add Payment</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{payment ? 'Edit Payment' : 'Add Student Payment'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A0A0A0]">Student</label>
              <select name="student_id" required className={selectClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">Select student</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A0A0A0]">Application</label>
              <select name="pipeline_id" className={selectClass} defaultValue={payment?.pipeline_id ?? ''}>
                <option value="">No application link</option>
                {studentPipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.university?.name ?? 'Application'} · {pipeline.stage ?? 'Stage'}
                  </option>
                ))}
              </select>
            </div>
            <Input name="payment_date" type="date" label="Payment date" required defaultValue={payment?.payment_date ?? new Date().toISOString().slice(0, 10)} />
            <Input name="amount" type="number" min="1" step="0.01" label="Amount (BDT)" required defaultValue={payment?.amount ?? ''} />
            <SelectField name="purpose" label="Purpose" defaultValue={payment?.purpose ?? 'Service Charge'} options={['Service Charge', 'University Fee', 'Visa Fee', 'Other']} />
            <SelectField name="method" label="Method" defaultValue={payment?.method ?? 'CASH'} options={['BKASH', 'BANK', 'CASH', 'Stripe', 'PayPal', 'Other']} />
            <Input name="invoice_no" label="Invoice No" placeholder="Auto if blank" defaultValue={payment?.invoice_no ?? ''} />
            <Input name="receipt_no" label="Receipt No" placeholder="Auto if blank" defaultValue={payment?.receipt_no ?? ''} />
          </div>
          <Input name="description" label="Description" placeholder="Service charge installment" defaultValue={payment?.description ?? ''} />
          <Input name="notes" label="Notes" placeholder="Optional internal note" defaultValue={payment?.notes ?? ''} />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogActions loading={loading} onCancel={() => setOpen(false)} label={payment ? 'Update Payment' : 'Save Payment'} />
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ExpenseDialog({
  agencyId,
  students,
  expense,
}: {
  agencyId: string
  students: StudentOption[]
  expense?: ExpenseFormValue
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = expense
      ? await updateCashEntry(agencyId, expense.id, formData)
      : await addCashEntry(agencyId, formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={expense ? 'icon' : 'sm'} variant={expense ? 'ghost' : 'default'} className={expense ? 'h-8 w-8' : 'gap-1.5'}>
          {expense ? <Edit className="h-3.5 w-3.5" /> : <><Plus className="h-3.5 w-3.5" /> Add Expense</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Expense / Inflow' : 'Add Expense / Inflow'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input name="date" type="date" label="Date" required defaultValue={expense?.date ?? new Date().toISOString().slice(0, 10)} />
            <Input name="amount" type="number" min="1" step="0.01" label="Amount (BDT)" required defaultValue={expense?.amount ?? ''} />
            <SelectField name="type" label="Type" defaultValue={expense?.type ?? 'Out'} options={['Out', 'In']} labels={{ Out: 'Expense (Out)', In: 'Inflow (In)' }} />
            <SelectField name="payment_method" label="Method" defaultValue={expense?.payment_method ?? 'CASH'} options={['BKASH', 'BANK', 'CASH', 'Stripe', 'PayPal', 'Other']} />
            <SelectField name="category" label="Category" defaultValue={expense?.category ?? 'Extra'} options={['Extra', 'Rent', 'Salary', 'Utility', 'Marketing', 'Courier', 'Notary', 'Commission', 'Vendor', 'Deposit']} />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A0A0A0]">Student file link</label>
              <select name="student_id" className={selectClass} defaultValue={expense?.student_id ?? ''}>
                <option value="">Office / general expense</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
              </select>
            </div>
            <Input name="vendor_name" label="Vendor" placeholder="Courier, notary, consultant" defaultValue={expense?.vendor_name ?? ''} />
            <Input name="reference_no" label="Reference No" placeholder="Optional" defaultValue={expense?.reference_no ?? ''} />
          </div>
          <Input name="description" label="Description" placeholder="Courier fee for visa file" defaultValue={expense?.description ?? ''} />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogActions loading={loading} onCancel={() => setOpen(false)} label={expense ? 'Update Entry' : 'Save Entry'} />
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BankDialog({ agencyId }: { agencyId: string }) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await addBankTransaction(agencyId, new FormData(e.currentTarget))
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Bank Entry</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Bank Transaction</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="date" type="date" label="Date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          <Input name="description" label="Description" required />
          <Input name="amount" type="number" min="1" step="0.01" label="Amount (BDT)" required />
          <SelectField name="type" label="Type" defaultValue="Deposit" options={['Deposit', 'Withdrawal']} />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <DialogActions loading={loading} onCancel={() => setOpen(false)} label="Save Transaction" />
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SelectField({
  defaultValue,
  label,
  labels,
  name,
  options,
}: {
  defaultValue: string
  label: string
  labels?: Record<string, string>
  name: string
  options: string[]
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#A0A0A0]">{label}</label>
      <select name={name} className={selectClass} defaultValue={defaultValue} required>
        {options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}
      </select>
    </div>
  )
}

function DialogActions({ label, loading, onCancel }: { label: string; loading: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-2">
      <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
      <Button type="submit" className="flex-1" loading={loading}>{label}</Button>
    </div>
  )
}
