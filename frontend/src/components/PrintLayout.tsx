import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'

export interface PrintLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  orientation?: 'portrait' | 'landscape'
  paperSize?: 'letter' | 'a4' | 'legal'
  showHeader?: boolean
  showFooter?: boolean
  headerContent?: React.ReactNode
  footerContent?: React.ReactNode
  className?: string
}

/**
 * Mobile-optimized print layout component
 *
 * Features:
 * - Responsive design that adapts for print
 * - Mobile-friendly print preview
 * - Configurable page orientation and size
 * - Header and footer support
 * - Auto page breaks
 */
export const PrintLayout: React.FC<PrintLayoutProps> = ({
  children,
  title,
  subtitle,
  orientation = 'portrait',
  paperSize = 'letter',
  showHeader = true,
  showFooter = true,
  headerContent,
  footerContent,
  className = '',
}) => {
  const [isPrintMode, setIsPrintMode] = useState(false)

  // Detect print mode
  useEffect(() => {
    const handleBeforePrint = () => setIsPrintMode(true)
    const handleAfterPrint = () => setIsPrintMode(false)

    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)

    // Also check if we're in a print media query
    const printMediaQuery = window.matchMedia('print')
    const handlePrintMediaChange = (e: MediaQueryListEvent) => {
      setIsPrintMode(e.matches)
    }

    if (printMediaQuery.addEventListener) {
      printMediaQuery.addEventListener('change', handlePrintMediaChange)
    } else {
      // Fallback for older browsers
      printMediaQuery.addListener(handlePrintMediaChange)
    }

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)

      if (printMediaQuery.removeEventListener) {
        printMediaQuery.removeEventListener('change', handlePrintMediaChange)
      } else {
        printMediaQuery.removeListener(handlePrintMediaChange)
      }
    }
  }, [])

  const orientationClass = orientation === 'landscape' ? 'print:landscape' : 'print:portrait'

  return (
    <div
      className={`
        print-layout
        ${orientationClass}
        ${className}
      `}
      data-paper-size={paperSize}
    >
      <style>{`
        @media print {
          @page {
            size: ${paperSize} ${orientation};
            margin: 0.5in;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-layout {
            width: 100%;
            max-width: 100%;
          }

          /* Ensure proper page breaks */
          .page-break-before {
            page-break-before: always;
          }

          .page-break-after {
            page-break-after: always;
          }

          .page-break-avoid {
            page-break-inside: avoid;
          }

          /* Hide interactive elements */
          button,
          .no-print,
          nav,
          .modal-overlay {
            display: none !important;
          }

          /* Optimize spacing */
          .print-compact {
            margin: 0;
            padding: 0.25rem;
          }

          /* Fix backgrounds and borders */
          .print-preserve-bg {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        /* Mobile print preview styles */
        @media screen and (max-width: 768px) {
          .print-layout {
            padding: 1rem;
            background: white;
          }
        }
      `}</style>

      {/* Header */}
      {showHeader && (
        <div className="print-header mb-6 page-break-avoid">
          {headerContent || (
            <div className="border-b-2 border-gray-800 pb-4">
              {title && (
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm md:text-base text-gray-600 mt-1">
                  {subtitle}
                </p>
              )}
              <p className="text-xs md:text-sm text-gray-500 mt-2">
                Generated: {format(new Date(), 'PPpp')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="print-content">
        {children}
      </div>

      {/* Footer */}
      {showFooter && (
        <div className="print-footer mt-6 page-break-avoid">
          {footerContent || (
            <div className="border-t border-gray-300 pt-4 text-xs md:text-sm text-gray-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  Event Manager System
                </div>
                <div>
                  Page <span className="page-number"></span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Print page component for creating distinct pages
 */
export interface PrintPageProps {
  children: React.ReactNode
  breakBefore?: boolean
  breakAfter?: boolean
  className?: string
}

export const PrintPage: React.FC<PrintPageProps> = ({
  children,
  breakBefore = false,
  breakAfter = true,
  className = '',
}) => {
  return (
    <div
      className={`
        print-page
        page-break-avoid
        ${breakBefore ? 'page-break-before' : ''}
        ${breakAfter ? 'page-break-after' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

/**
 * Print section component for grouping content
 */
export interface PrintSectionProps {
  children: React.ReactNode
  title?: string
  avoidBreak?: boolean
  className?: string
}

export const PrintSection: React.FC<PrintSectionProps> = ({
  children,
  title,
  avoidBreak = true,
  className = '',
}) => {
  return (
    <div
      className={`
        print-section
        mb-6
        ${avoidBreak ? 'page-break-avoid' : ''}
        ${className}
      `}
    >
      {title && (
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
          {title}
        </h2>
      )}
      <div className="print-section-content">
        {children}
      </div>
    </div>
  )
}

/**
 * Print button with mobile optimization
 */
export interface PrintButtonProps {
  children?: React.ReactNode
  className?: string
  onBeforePrint?: () => void
  onAfterPrint?: () => void
}

export const PrintButton: React.FC<PrintButtonProps> = ({
  children = 'Print',
  className = '',
  onBeforePrint,
  onAfterPrint,
}) => {
  const handlePrint = () => {
    // Call before print callback
    onBeforePrint?.()

    // Small delay to allow any state updates to render
    setTimeout(() => {
      window.print()

      // Call after print callback
      // Note: This fires immediately, not when print dialog closes
      // For that, use window.addEventListener('afterprint', callback)
      onAfterPrint?.()
    }, 100)
  }

  return (
    <button
      onClick={handlePrint}
      className={`
        touch-target
        no-print
        inline-flex items-center justify-center
        px-4 py-2
        text-sm font-medium
        text-white bg-blue-600 hover:bg-blue-700
        rounded-lg
        transition-colors
        ${className}
      `}
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
      {children}
    </button>
  )
}

/**
 * Print preview modal (useful for mobile)
 */
export interface PrintPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 safe-area-inset">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900">Print Preview</h2>
          <div className="flex items-center gap-2">
            <PrintButton className="bg-blue-600 hover:bg-blue-700" />
            <button
              onClick={onClose}
              className="touch-target px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
