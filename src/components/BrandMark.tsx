interface BrandMarkProps {
  className?: string
  title?: string
}

export function BrandMark({ className, title }: BrandMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 44"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <path
        d="M7 36C12 29 24 31 29 25C34 19 18 20 18 14C18 10 24 8 33 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="35.4" cy="4.6" r="3.1" fill="#c68b53" />
    </svg>
  )
}
