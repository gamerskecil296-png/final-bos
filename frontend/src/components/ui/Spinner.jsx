

import { cn } from '@/lib/utils'

function Spinner({ className, ...props }) {
  return (
    <span className="material-symbols-outlined animate-spin"
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}>sync</span>
  )
}

export { Spinner }