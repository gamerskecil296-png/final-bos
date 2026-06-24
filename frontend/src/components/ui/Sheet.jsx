import * as React from "react"
import { X } from "lucide-react"
import { cn } from "../../lib/utils"

const Sheet = React.forwardRef(({ className, side = "right", open, onOpenChange, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(open || false)

  React.useEffect(() => {
    setIsOpen(open || false)
  }, [open])

  const handleOpenChange = (value) => {
    setIsOpen(value)
    if (onOpenChange) onOpenChange(value)
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/80"
        onClick={() => handleOpenChange(false)}
      />
      <div
        ref={ref}
        className={cn(
          "fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out",
          side === "right" && "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-xl",
          side === "left" && "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-xl",
          side === "top" && "inset-x-0 top-0 border-b",
          side === "bottom" && "inset-x-0 bottom-0 border-t",
          className
        )}
        style={{ animation: 'slideInRight 0.3s ease-out' }}
      >
        <button
          onClick={() => handleOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
})
Sheet.displayName = "Sheet"

const SheetContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props}>
    {children}
  </div>
))
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-2", className)} {...props} />
)
SheetHeader.displayName = "SheetHeader"

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
))
SheetTitle.displayName = "SheetTitle"

const SheetFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
SheetFooter.displayName = "SheetFooter"

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-gray-500", className)} {...props} />
))
SheetDescription.displayName = "SheetDescription"

const SheetTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <button ref={ref} className={className} {...props} />
))
SheetTrigger.displayName = "SheetTrigger"

const SheetClose = React.forwardRef(({ className, ...props }, ref) => (
  <button ref={ref} className={className} {...props} />
))
SheetClose.displayName = "SheetClose"

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription, SheetTrigger, SheetClose }
