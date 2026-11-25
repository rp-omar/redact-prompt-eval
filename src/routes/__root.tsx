import * as stylex from '@stylexjs/stylex'
import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div {...stylex.props(styles.shell)}>
      <header {...stylex.props(styles.header)}>
        <Link to="/" {...stylex.props(styles.brand)}>
          {/* LCP candidate: preloaded from index.html, dimensions reserved. */}
          <img src="/logo.svg" width={160} height={40} alt="People" fetchPriority="high" />
        </Link>
        <nav {...stylex.props(styles.nav)}>
          <Link to="/" {...stylex.props(styles.navLink)}>
            Directory
          </Link>
          {/* Low-value link: intent preloading switched off. */}
          <Link to="/about" preload={false} {...stylex.props(styles.navLink)}>
            About
          </Link>
        </nav>
      </header>
      <main {...stylex.props(styles.main)}>
        <Outlet />
      </main>
    </div>
  )
}

const styles = stylex.create({
  shell: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBlock: 12,
    paddingInline: 24,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'color-mix(in srgb, currentColor 15%, transparent)',
  },
  brand: { display: 'inline-flex', lineHeight: 0 },
  nav: { display: 'flex', gap: 16 },
  navLink: { color: 'inherit', textDecoration: { default: 'none', ':hover': 'underline' } },
  main: { paddingBlock: 16, paddingInline: 24, flexGrow: 1 },
})
