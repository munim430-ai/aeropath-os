'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  getMascotDelayMs,
  getNextMascot,
  getRandomEmote,
  MASCOT_VISIBLE_MS,
  type SidebarMascot,
} from '@/lib/sidebar-mascots'

export function SidebarMascots() {
  const [appearance, setAppearance] = React.useState<{
    mascot: SidebarMascot
    emote: string
    key: number
  } | null>(null)

  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let showTimer: number | null = null
    let hideTimer: number | null = null
    let cancelled = false

    function scheduleNext() {
      showTimer = window.setTimeout(() => {
        if (cancelled) return
        const mascot = getNextMascot()
        setAppearance({
          mascot,
          emote: getRandomEmote(mascot),
          key: Date.now(),
        })

        hideTimer = window.setTimeout(() => {
          setAppearance(null)
          scheduleNext()
        }, MASCOT_VISIBLE_MS)
      }, getMascotDelayMs())
    }

    scheduleNext()

    return () => {
      cancelled = true
      if (showTimer) window.clearTimeout(showTimer)
      if (hideTimer) window.clearTimeout(hideTimer)
    }
  }, [])

  if (!appearance) return null

  return (
    <div
      key={appearance.key}
      className={cn('sidebar-mascot', appearance.mascot.className, `sidebar-mascot--${appearance.emote}`)}
      aria-label={appearance.mascot.label}
      role="img"
    >
      <span className="sidebar-mascot__tail" />
      <span className="sidebar-mascot__body" />
      <span className="sidebar-mascot__head">
        <span className="sidebar-mascot__ear sidebar-mascot__ear--left" />
        <span className="sidebar-mascot__ear sidebar-mascot__ear--right" />
        <span className="sidebar-mascot__patch sidebar-mascot__patch--left" />
        <span className="sidebar-mascot__patch sidebar-mascot__patch--right" />
        <span className="sidebar-mascot__eye sidebar-mascot__eye--left" style={{ backgroundColor: appearance.mascot.eyes.left }} />
        <span className="sidebar-mascot__eye sidebar-mascot__eye--right" style={{ backgroundColor: appearance.mascot.eyes.right }} />
        <span className="sidebar-mascot__nose" />
      </span>
      <span className="sidebar-mascot__emote">{emoteSymbol(appearance.emote)}</span>
    </div>
  )
}

function emoteSymbol(emote: string) {
  if (emote === 'purr') return '...'
  if (emote === 'stretch') return 'z'
  if (emote === 'wink') return '*'
  if (emote === 'tail') return '!'
  return ''
}
