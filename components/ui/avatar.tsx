import Image from 'next/image'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  imageUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: { container: 'h-8 w-8', text: 'text-xs' },
  md: { container: 'h-10 w-10', text: 'text-sm' },
  lg: { container: 'h-12 w-12', text: 'text-base' },
  xl: { container: 'h-16 w-16', text: 'text-lg' },
}

export function Avatar({ name, imageUrl, size = 'md', className }: AvatarProps) {
  const { container, text } = sizes[size]

  if (imageUrl) {
    return (
      <div className={cn('relative rounded-full overflow-hidden bg-gray-100', container, className)}>
        <Image src={imageUrl} alt={name} fill className="object-cover" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-teal-100 text-teal-700 font-semibold flex items-center justify-center',
        container,
        text,
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}
