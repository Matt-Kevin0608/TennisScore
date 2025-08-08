
import * as React from 'react'
import { cn } from '@/lib/utils'
export interface SimpleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}
export function Select({ className, ...props }: SimpleSelectProps){
  return <select className={cn('h-9 rounded-md border bg-background px-3 py-1 text-sm', className)} {...props} />
}
