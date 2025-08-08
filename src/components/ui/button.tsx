
import * as React from 'react'
import { cn } from '@/lib/utils'
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default'|'secondary'|'outline'|'destructive'
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant='default', ...props }, ref
){
  const base = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none h-9 px-4 py-2'
  const variants: Record<string,string> = {
    default: 'bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'bg-secondary text-secondary-foreground hover:opacity-90',
    outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90'
  }
  return <button ref={ref} className={cn(base, variants[variant], className)} {...props} />
})
