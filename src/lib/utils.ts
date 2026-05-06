import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date))
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function stageColor(stage: string): string {
  const map: Record<string, string> = {
    Lead: '#6366f1',
    Docs: '#f59e0b',
    Applied: '#3b82f6',
    Visa: '#8b5cf6',
    Enrolled: '#10b981',
  }
  return map[stage] ?? '#6b7280'
}
