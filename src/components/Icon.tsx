import type { ReactNode } from 'react'
import type { IconName } from '../types'

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 24, className }: IconProps) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  const paths: Record<IconName, ReactNode> = {
    trail: <><path d="M4 19c2.8-4.8 5.8-1.8 8.2-6.5C14.5 8.2 17 9 20 4" /><circle cx="4" cy="19" r="1.6" /><circle cx="20" cy="4" r="1.6" /></>,
    keys: <><circle cx="8" cy="15" r="4" /><path d="m11 12 7-7m-2 2 2 2m-5 1 2 2" /></>,
    wallet: <><path d="M19 8V6H6a3 3 0 0 0 0 6h13a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V9" /><path d="M21 14h-4" /></>,
    money: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M7 8H5v2m12-2h2v2M7 16H5v-2m12 2h2v-2" /></>,
    phone: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10 18.5h4" /></>,
    medicine: <><rect x="7" y="3" width="10" height="4" rx="1" /><path d="M8 7v2l-1 1v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9l-1-1V7m-6 8h4m-2-2v4" /></>,
    glasses: <><circle cx="7" cy="14" r="4" /><circle cx="17" cy="14" r="4" /><path d="M11 14h2M3 13l1-5m17 5-1-5" /></>,
    remote: <><rect x="7.5" y="2.5" width="9" height="19" rx="3" /><circle cx="12" cy="7" r="1.5" /><path d="M10 12h4m-4 3h4m-4 3h2" /></>,
    other: <><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="9" /></>,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10m-9 10v-6h4v6" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.1 15.1 4.9 4.9" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5m4-2v6l4 2" /></>,
    calm: <><path d="M12 21c4.4-2.3 7-5.2 7-9.4A4.6 4.6 0 0 0 12 7a4.6 4.6 0 0 0-7 4.6C5 15.8 7.6 18.7 12 21Z" /><path d="M12 7c-.2-2.3 1-3.7 3-4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3.1 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
    back: <path d="m15 18-6-6 6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    voice: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0m-7 7v3m-3 0h6" /></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4Z" /><path d="M15 9a4 4 0 0 1 0 6m2.5-8.5a8 8 0 0 1 0 11" /></>,
    pause: <><path d="M9 6v12M15 6v12" /></>,
    spark: <><path d="m12 3 1.3 4.7L18 9l-4.7 1.3L12 15l-1.3-4.7L6 9l4.7-1.3Z" /><path d="m18 14 .6 2.4L21 17l-2.4.6L18 20l-.6-2.4L15 17l2.4-.6Z" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    download: <><path d="M12 3v12m-4-4 4 4 4-4" /><path d="M5 20h14" /></>,
    upload: <><path d="M12 17V5m-4 4 4-4 4 4" /><path d="M5 20h14" /></>,
    pin: <><path d="m9 4 6 6m-8 2 5 5m5-10-3 3 3 3-4 4-6-6 4-4 3 3 3-3Z" /><path d="m8 16-4 4" /></>,
    refresh: <><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M18.5 9A7 7 0 0 0 6 6.5L4 11m16 2-2 4.5A7 7 0 0 1 5.5 15" /></>,
    forward: <path d="m9 18 6-6-6-6" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></>,
  }

  return <svg {...common} className={className}>{paths[name]}</svg>
}
