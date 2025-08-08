
import * as React from 'react'
import { cn } from '@/lib/utils'
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default'|'secondary'|'destructive'|'outline'
}
export function Badge({ className, variant='default', ...props }: BadgeProps){
  const base = 'badge'
  const variants: Record<string,string> = {
    default: 'bg-primary/10 text-primary border-primary/30',
    secondary: 'bg-secondary text-secondary-foreground border-transparent',
    destructive: 'bg-destructive/10 text-destructive border-destructive/30',
    outline: 'bg-transparent text-foreground'
  }
  return <div className={cn(base, variants[variant], className)} {...props} />
}
