'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import { cn } from '@/lib/utils'

const Toaster = ({ className, expand = false, ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      expand={expand}
      className={cn('toaster group', className)}
      toastOptions={{
        classNames: {
          toast:
            'group toast flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg text-sm font-medium',
          title:    'text-sm font-semibold leading-snug',
          description: 'text-xs opacity-80 mt-0.5 leading-relaxed',
          actionButton: 'text-xs font-semibold',
          cancelButton: 'text-xs font-medium opacity-70',
          closeButton:  'opacity-50 hover:opacity-100 transition-opacity',
          success:
            'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 [&_[data-icon]]:text-emerald-600',
          error:
            'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100 [&_[data-icon]]:text-red-600',
          warning:
            'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 [&_[data-icon]]:text-amber-600',
          info:
            'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100 [&_[data-icon]]:text-blue-600',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
