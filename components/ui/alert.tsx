import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: React.ReactNode
  className?: string
}

const config: Record<AlertVariant, { icon: React.ElementType; classes: string }> = {
  success: { icon: CheckCircle,    classes: 'bg-green-50 text-green-800 border-green-200' },
  error:   { icon: XCircle,        classes: 'bg-red-50 text-red-800 border-red-200' },
  warning: { icon: AlertTriangle,  classes: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  info:    { icon: Info,           classes: 'bg-blue-50 text-blue-800 border-blue-200' },
}

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const { icon: Icon, classes } = config[variant]

  return (
    <div className={cn('flex gap-3 p-4 rounded-lg border', classes, className)}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        {title && <p className="font-medium mb-1">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}
