import React from 'react';
import { cn } from '../../../lib/utils'; // Adjust path if using alias like @/lib/utils

export function PageContent({ children, className, ...props }) {
  return (
    <div 
      className={cn(
        "w-full space-y-6",
        "animate-in fade-in duration-500",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
