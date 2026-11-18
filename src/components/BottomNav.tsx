import type { Screen } from '../types'
import { Icon } from './Icon'

interface BottomNavProps {
  active: Screen
  onNavigate: (screen: Screen) => void
}

const items = [
  { screen: 'home' as const, icon: 'search' as const, label: 'Search' },
  { screen: 'history' as const, icon: 'history' as const, label: 'History' },
  { screen: 'calm' as const, icon: 'refresh' as const, label: 'Reset' },
]

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Main sections">
      {items.map((item) => (
        <button key={item.screen} className={active === item.screen ? 'bottom-nav__item is-active' : 'bottom-nav__item'} onClick={() => onNavigate(item.screen)} aria-current={active === item.screen ? 'page' : undefined}>
          <Icon name={item.icon} size={21} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
