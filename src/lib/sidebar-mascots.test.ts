import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getMascotDelayMs,
  getNextMascot,
  SIDEBAR_MASCOTS,
} from './sidebar-mascots'

test('getMascotDelayMs returns a delay between 5 and 10 minutes', () => {
  assert.equal(getMascotDelayMs(() => 0), 300_000)
  assert.equal(getMascotDelayMs(() => 1), 600_000)
  assert.equal(getMascotDelayMs(() => 0.5), 450_000)
})

test('getNextMascot chooses a mascot by random value', () => {
  assert.equal(getNextMascot(() => 0).id, 'white')
  assert.equal(getNextMascot(() => 0.99).id, 'calico')
})

test('sidebar mascots include the white heterochromia and calico cats', () => {
  assert.deepEqual(
    SIDEBAR_MASCOTS.map((mascot) => mascot.id),
    ['white', 'calico']
  )
  assert.equal(SIDEBAR_MASCOTS[0].eyes.left, '#60a5fa')
  assert.equal(SIDEBAR_MASCOTS[0].eyes.right, '#fb923c')
})
