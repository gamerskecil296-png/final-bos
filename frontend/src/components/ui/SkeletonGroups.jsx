import React from 'react';
import { Skeleton } from './Skeleton';

// Composite Skeleton for Dashboard View
export function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
      {/* Banner Skeleton */}
      <Skeleton className="h-10 rounded-2xl w-full max-w-2xl" />
      
      {/* Hero Card Skeleton */}
      <div className="bg-neutral-100 rounded-3xl p-8 h-48 flex flex-col justify-between">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3 rounded-xl" />
          <Skeleton className="h-4 w-1/2 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Grid Skeletons */}
      <CardGridSkeleton count={8} />

      {/* Two Column Layout Skel */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-10">
        <div className="lg:col-span-6 space-y-4">
          <Skeleton className="h-48 rounded-3xl w-full" />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <Skeleton className="h-48 rounded-3xl w-full" />
        </div>
      </div>
    </div>
  );
}

// Composite Skeleton for Grid items
export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
      ))}
    </div>
  );
}

// Composite Skeleton for Tables
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full space-y-4">
      {/* Table Header */}
      <div className="flex gap-4 border-b border-neutral-100 pb-4">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded-full" />
        ))}
      </div>
      {/* Table Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 py-4 border-b border-neutral-50/50">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Composite Skeleton for Profile Header
export function ProfileSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm flex flex-col md:flex-row gap-8 items-center">
      <div className="space-y-4 flex flex-col items-center">
        <Skeleton className="w-32 h-32 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-6 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Composite Skeleton for Notification List
export function NotifListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 rounded-3xl bg-neutral-50/30 border border-neutral-100/50 items-center">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/3 rounded-full" />
              <Skeleton className="h-3 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Composite Skeleton for Mini Calendar
export function KalenderSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-2">
        <Skeleton className="h-5 w-24 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="w-8 h-8 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {[...Array(35)].map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-xl" />
        ))}
      </div>
    </div>
  );
}