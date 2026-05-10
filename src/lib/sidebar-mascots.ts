export const MASCOT_MIN_DELAY_MS = 5 * 60 * 1000
export const MASCOT_MAX_DELAY_MS = 10 * 60 * 1000
export const MASCOT_VISIBLE_MS = 11_000

export type SidebarMascotId = 'white' | 'calico'

export interface SidebarMascot {
  id: SidebarMascotId
  label: string
  className: string
  emotes: string[]
  eyes: {
    left: string
    right: string
  }
}

export const SIDEBAR_MASCOTS: SidebarMascot[] = [
  {
    id: 'white',
    label: 'White cat with blue and orange eyes',
    className: 'mascot-cat--white',
    emotes: ['blink', 'purr', 'stretch'],
    eyes: {
      left: '#60a5fa',
      right: '#fb923c',
    },
  },
  {
    id: 'calico',
    label: 'Calico cat',
    className: 'mascot-cat--calico',
    emotes: ['tail', 'wink', 'sit'],
    eyes: {
      left: '#111827',
      right: '#111827',
    },
  },
]

export function getMascotDelayMs(random = Math.random) {
  return Math.round(MASCOT_MIN_DELAY_MS + random() * (MASCOT_MAX_DELAY_MS - MASCOT_MIN_DELAY_MS))
}

export function getNextMascot(random = Math.random) {
  const index = Math.min(SIDEBAR_MASCOTS.length - 1, Math.floor(random() * SIDEBAR_MASCOTS.length))
  return SIDEBAR_MASCOTS[index]
}

export function getRandomEmote(mascot: SidebarMascot, random = Math.random) {
  const index = Math.min(mascot.emotes.length - 1, Math.floor(random() * mascot.emotes.length))
  return mascot.emotes[index]
}
