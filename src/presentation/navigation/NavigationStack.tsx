import { HomeScreen } from '../screens/Home/HomeScreen'
import { PoolManagementScreen } from '../screens/PoolManagement/PoolManagementScreen'
import { PoolSwitcherScreen } from '../screens/PoolSwitcher/PoolSwitcherScreen'
import { WeeklyDrawScreen } from '../screens/WeeklyDraw/WeeklyDrawScreen'
import { useNavigationStack } from './useNavigationStack'

export function NavigationStack() {
  const current = useNavigationStack((s) => s.stack[s.stack.length - 1])

  switch (current) {
    case 'home':
      return <HomeScreen />
    case 'weeklyDraw':
      return <WeeklyDrawScreen />
    case 'poolManagement':
      return <PoolManagementScreen />
    case 'poolSwitcher':
      return <PoolSwitcherScreen />
  }
}
