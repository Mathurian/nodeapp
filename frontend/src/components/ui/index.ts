// Shared UI Components
// These components provide consistent styling and behavior across the application.

export { default as Button } from './Button'
export type { ButtonProps } from './Button'
export { default as MobileWorkflowNav } from './MobileWorkflowNav'
export type { MobileWorkflowNavProps } from './MobileWorkflowNav'

export { default as Card } from './Card'
export type { CardProps } from './Card'

export { default as PageHeader } from './PageHeader'
export type { PageHeaderProps } from './PageHeader'

export { default as StatsCard } from './StatsCard'
export type { StatsCardProps } from './StatsCard'

export { default as Loading } from './Loading'
export type { LoadingProps } from './Loading'

export { default as EmptyState } from './EmptyState'
export type { EmptyStateProps, EmptyStateAction } from './EmptyState'

export { default as ErrorState } from './ErrorState'
export type { ErrorStateProps } from './ErrorState'

export { default as ConfirmModal } from './ConfirmModal'
export type { ConfirmModalProps } from './ConfirmModal'

export { default as ResponsiveTable } from './ResponsiveTable'
export type { ResponsiveTableProps } from './ResponsiveTable'

export { default as Skeleton } from './Skeleton'
export type { SkeletonProps } from './Skeleton'

export {
  TableRowSkeleton,
  CardSkeleton,
  UserRowSkeleton,
  StatCardSkeleton,
  ActivityItemSkeleton,
  EventCardSkeleton,
  FormSkeleton,
  UserTableSkeleton,
} from './SkeletonPatterns'
export type {
  TableRowSkeletonProps,
  CardSkeletonProps,
  UserRowSkeletonProps,
  StatCardSkeletonProps,
  ActivityItemSkeletonProps,
  FormSkeletonProps,
  UserTableSkeletonProps,
} from './SkeletonPatterns'

export { default as UploadProgress } from './UploadProgress'
export type { UploadProgressProps, UploadStatus } from './UploadProgress'

export { default as OptimisticIndicator } from './OptimisticIndicator'
export {
  optimisticRowClasses,
  optimisticValueClasses,
  getOptimisticRowClass
} from './OptimisticIndicator'
export type { OptimisticIndicatorProps, OptimisticStatus } from './OptimisticIndicator'
