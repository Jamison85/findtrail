interface FeatherMarkProps {
  className?: string
}

export function FeatherMark({ className }: FeatherMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M26.6 3.4c-5.1 1.1-10 3.7-13.4 7.2-3.8 3.9-5.5 8.2-4.7 11.6l-4 5.2 2 1.5 4-5.2c3.5.3 7.5-1.6 10.8-5.4 3.5-4 5.4-9.4 5.3-14.9Z"
        fill="#f3e4d1"
        stroke="#173a34"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <path
        d="M6 28.1 23.2 6.7"
        fill="none"
        stroke="#173a34"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M18.4 8.9 22.6 8m-7.4 4.9 5.5-1.2m-8.1 5.3 5.6-1.3m-8 5.1 5.2-1.5M17.4 9.8l-1.1-3.1m-2.1 6.5-1.9-3.6m-.7 7.3-2.2-3.1m.3 6.8-2.1-2.2"
        fill="none"
        stroke="#725266"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  )
}
