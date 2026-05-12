const SIZE_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-9 w-9 min-h-9 min-w-9',
  md: 'h-10 w-10 min-h-10 min-w-10',
  lg: 'h-24 w-24 min-h-24 min-w-24',
}

const ICON_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-[20px]',
  md: 'text-[22px]',
  lg: 'text-5xl',
}

type Props = {
  /** Remote image URL; when empty, a generic profile icon is shown. */
  imageUrl?: string | null
  /** Display name for accessibility when no photo is set. */
  label: string
  size?: keyof typeof SIZE_CLASS
  className?: string
}

export default function ProviderAvatar({ imageUrl, label, size = 'md', className = '' }: Props) {
  const src = imageUrl?.trim()
  const dim = `${SIZE_CLASS[size]} shrink-0 rounded-full`

  if (src) {
    return <img alt="" className={`${dim} object-cover ${className}`.trim()} src={src} />
  }

  return (
    <div
      aria-label={label.trim() ? `Profile: ${label}` : 'Profile'}
      className={`${dim} flex items-center justify-center bg-gray-100 text-gray-500 ${className}`.trim()}
      role="img"
    >
      <span className={`material-symbols-outlined leading-none ${ICON_CLASS[size]}`}>person</span>
    </div>
  )
}
