import React from 'react';

/**
 * A single animated skeleton block. Use width/height/rounded props for shape.
 */
export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`bg-gray-200 animate-pulse rounded ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton for a class card (Step1 + Dashboard)
 */
export function ClassCardSkeleton() {
  return (
    <div className="border-2 border-gray-100 rounded-xl p-5 space-y-3">
      <SkeletonBlock className="h-5 w-3/5" />
      <SkeletonBlock className="h-4 w-2/5" />
      <SkeletonBlock className="h-5 w-24 rounded-full" />
    </div>
  );
}

/**
 * Skeleton for a standards list row (Step2)
 */
export function StandardsRowSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 border-b border-gray-100">
      <SkeletonBlock className="w-5 h-5 rounded flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <SkeletonBlock className="h-4 w-16 rounded" />
          <SkeletonBlock className="h-4 w-24 rounded" />
        </div>
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-4/5" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a lesson archive card
 */
export function LessonCardSkeleton() {
  return (
    <div className="card space-y-3">
      <SkeletonBlock className="h-5 w-3/4" />
      <SkeletonBlock className="h-4 w-1/2" />
      <div className="flex gap-1">
        <SkeletonBlock className="h-5 w-16 rounded-full" />
        <SkeletonBlock className="h-5 w-16 rounded-full" />
        <SkeletonBlock className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}
