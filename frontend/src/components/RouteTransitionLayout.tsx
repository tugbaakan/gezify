import { Outlet, useLocation } from 'react-router-dom'

/**
 * Remounts the outlet subtree when the path changes so a lightweight CSS
 * enter animation can run on each navigation.
 */
export function RouteTransitionLayout() {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="motion-route">
      <Outlet />
    </div>
  )
}
