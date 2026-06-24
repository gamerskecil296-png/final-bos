import React from 'react';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-neutral-200/60 ${className}`}
      {...props}
    />
  );
}
