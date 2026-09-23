import type { Screen } from '../types'
import { Icon } from './Icon'
import { FeatherMark } from './FeatherMark'

interface BottomNavProps {
  active: Screen
  onNavigate: (screen: Screen) => void
}

const items = [
  { screen: 'home' as const, icon: 'home' as const, label: 'Home' },
  { screen: 'history' as const, icon: 'history' as const, label: 'History' },
  { screen: 'calm' as const, icon: 'calm' as const, label: 'Reset' },
  { screen: 'settings' as const, icon: 'settings' as const, label: 'Settings' },
]

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Main sections">
      {items.map((item) => (
        <button key={item.screen} className={active === item.screen ? 'bottom-nav__item is-active' : 'bottom-nav__item'} onClick={() => onNavigate(item.screen)} aria-current={active === item.screen ? 'page' : undefined}>
          {item.screen === 'calm' ? <FeatherMark className="bottom-nav__feather" /> : <Icon name={item.icon} size={21} />}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
