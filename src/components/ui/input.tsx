
import * as React from 'react'
import { cn } from '@/lib/utils'
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props }, ref
){
  return (
    <input
      ref={ref}
      className={cn('flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', className)}
      {...props}
    />
  )
})
export { Input }
