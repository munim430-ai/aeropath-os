export type PaymentMethod = 'BKASH' | 'BANK' | 'CASH' | 'Stripe' | 'PayPal' | 'Other'
export type PaymentPurpose = 'Service Charge' | 'University Fee' | 'Visa Fee' | 'Other'
export type CashEntryType = 'In' | 'Out'

export type FinancePayment = {
  id?: string
  student_id: string
  pipeline_id?: string | null
  payment_date: string
  description?: string | null
  amount: number
  method: PaymentMethod
  purpose: PaymentPurpose
  invoice_no?: string | null
  receipt_no?: string | null
  student?: { full_name?: string | null; email?: string | null; phone?: string | null } | null
}

export type FinanceExpense = {
  id?: string
  student_id?: string | null
  date: string
  description?: string | null
  category?: string | null
  amount: number
  type: CashEntryType
}

export type StudentProfileLite = {
  id: string
  full_name: string
  email?: string | null
  phone?: string | null
}

export type StudentProfitLoss = {
  studentId: string
  studentName: string
  revenue: number
  fileCosts: number
  netProfit: number
}

export function toMoney(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function buildFinanceSummary(payments: FinancePayment[], expenses: FinanceExpense[]) {
  const totalCollected = payments.reduce((sum, payment) => sum + toMoney(payment.amount), 0)
  const totalExpenses = expenses
    .filter((expense) => expense.type === 'Out')
    .reduce((sum, expense) => sum + toMoney(expense.amount), 0)
  const totalInflows = expenses
    .filter((expense) => expense.type === 'In')
    .reduce((sum, expense) => sum + toMoney(expense.amount), 0)
  const netProfit = totalCollected + totalInflows - totalExpenses

  return {
    totalCollected,
    totalExpenses,
    totalInflows,
    netProfit,
  }
}

export function buildStudentProfitLoss(
  students: StudentProfileLite[],
  payments: FinancePayment[],
  expenses: FinanceExpense[]
): StudentProfitLoss[] {
  return students
    .map((student) => {
      const revenue = payments
        .filter((payment) => payment.student_id === student.id)
        .reduce((sum, payment) => sum + toMoney(payment.amount), 0)
      const fileCosts = expenses
        .filter((expense) => expense.type === 'Out' && expense.student_id === student.id)
        .reduce((sum, expense) => sum + toMoney(expense.amount), 0)

      return {
        studentId: student.id,
        studentName: student.full_name,
        revenue,
        fileCosts,
        netProfit: revenue - fileCosts,
      }
    })
    .filter((row) => row.revenue > 0 || row.fileCosts > 0)
    .sort((a, b) => b.netProfit - a.netProfit)
}

export function buildFinanceDocumentNumber(prefix: 'INV' | 'RCT', date = new Date(), count = 0) {
  const yyyy = date.getFullYear()
  const mm = `${date.getMonth() + 1}`.padStart(2, '0')
  const dd = `${date.getDate()}`.padStart(2, '0')
  return `${prefix}-${yyyy}${mm}${dd}-${`${count + 1}`.padStart(4, '0')}`
}
