import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer'

const BASE_URL = process.env.QA_BASE_URL ?? 'https://aeropath-os.vercel.app'
const PASSWORD = process.env.QA_PASSWORD ?? 'Demo@12345!'
const SCREENSHOT_DIR = path.join(process.cwd(), 'docs', 'qa-screenshots')

type RoleName = 'Owner' | 'Manager' | 'Counselor' | 'Receptionist'

const roles: Array<{ role: RoleName; email: string; allowed: string[] }> = [
  {
    role: 'Owner',
    email: 'demo@aeropath.app',
    allowed: ['Dashboard', 'CRM', 'Students', 'Pipeline', 'Calendar', 'Analytics', 'Sub-Agents', 'Commissions', 'Universities', 'Website Content', 'Tasks', 'Financials', 'Payroll', 'HRM', 'Team Access', 'Settings'],
  },
  {
    role: 'Manager',
    email: 'manager@aeropath.app',
    allowed: ['Dashboard', 'CRM', 'Students', 'Pipeline', 'Calendar', 'Analytics', 'Sub-Agents', 'Commissions', 'Universities', 'Website Content', 'Tasks', 'HRM'],
  },
  {
    role: 'Counselor',
    email: 'counselor@aeropath.app',
    allowed: ['Dashboard', 'CRM', 'Students', 'Pipeline', 'Calendar', 'Universities', 'Tasks', 'HRM'],
  },
  {
    role: 'Receptionist',
    email: 'reception@aeropath.app',
    allowed: ['Dashboard', 'CRM', 'Students', 'Tasks'],
  },
]

const moduleRoutes = [
  { label: 'Dashboard', path: '/app/demo' },
  { label: 'CRM', path: '/app/demo/crm' },
  { label: 'Students', path: '/app/demo/students' },
  { label: 'Pipeline', path: '/app/demo/pipeline' },
  { label: 'Calendar', path: '/app/demo/calendar' },
  { label: 'Analytics', path: '/app/demo/analytics' },
  { label: 'Sub-Agents', path: '/app/demo/sub-agents' },
  { label: 'Commissions', path: '/app/demo/commissions' },
  { label: 'Payroll', path: '/app/demo/payroll' },
  { label: 'HRM', path: '/app/demo/hrm' },
  { label: 'Team Access', path: '/app/demo/team' },
  { label: 'Website Content', path: '/app/demo/website-content' },
]

async function login(page: import('puppeteer').Page, email: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.type('input[name="email"]', email)
  await page.type('input[name="password"]', PASSWORD)
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ])
  await page.waitForFunction(() => window.location.pathname.startsWith('/app/demo'), { timeout: 20000 })
}

async function visibleSidebarLabels(page: import('puppeteer').Page) {
  return page.$$eval('aside nav a', (links) =>
    links.map((link) => link.textContent?.trim() ?? '').filter(Boolean)
  )
}

async function routeSettledPath(page: import('puppeteer').Page, targetPath: string) {
  await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await new Promise((resolve) => setTimeout(resolve, 1200))
  return new URL(page.url()).pathname
}

async function main() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true })

  const browser = await puppeteer.launch({ headless: true })
  const report: Array<Record<string, unknown>> = []

  try {
    const publicPage = await browser.newPage()
    await publicPage.setViewport({ width: 1440, height: 980, deviceScaleFactor: 1 })
    console.log('Capturing public homepage screenshots...')
    await publicPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await publicPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'homepage-desktop.png'), fullPage: true })
    await publicPage.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 })
    await publicPage.reload({ waitUntil: 'domcontentloaded', timeout: 20000 })
    await publicPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'homepage-mobile.png'), fullPage: true })
    await publicPage.close()

    for (const role of roles) {
      console.log(`Checking ${role.role} permissions...`)
      const context = await browser.createBrowserContext()
      const page = await context.newPage()
      await page.setViewport({ width: 1440, height: 980, deviceScaleFactor: 1 })
      await login(page, role.email)

      if (role.role === 'Owner') {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard-owner-desktop.png'), fullPage: true })
        await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 })
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard-owner-mobile.png'), fullPage: true })
        await page.setViewport({ width: 1440, height: 980, deviceScaleFactor: 1 })
      }

      const sidebar = await visibleSidebarLabels(page)
      const missingSidebar = role.allowed.filter((label) => !sidebar.includes(label))
      const extraSidebar = sidebar.filter((label) => !role.allowed.includes(label))

      const routeResults = []
      for (const route of moduleRoutes) {
        process.stdout.write(`  ${route.label}...`)
        const allowed = role.allowed.includes(route.label)
        const settledPath = await routeSettledPath(page, route.path)
        console.log(settledPath)
        routeResults.push({
          label: route.label,
          expected: allowed ? 'allowed' : 'redirect',
          path: settledPath,
          pass: allowed ? settledPath === route.path : settledPath === '/app/demo',
        })
      }

      report.push({
        role: role.role,
        email: role.email,
        sidebar,
        missingSidebar,
        extraSidebar,
        routeResults,
      })
      await context.close()
    }
  } finally {
    await browser.close()
  }

  await fs.writeFile(path.join(SCREENSHOT_DIR, 'qa-report.json'), JSON.stringify(report, null, 2))

  let failures = 0
  for (const roleReport of report) {
    const missing = roleReport.missingSidebar as string[]
    const extra = roleReport.extraSidebar as string[]
    const routes = roleReport.routeResults as Array<{ label: string; expected: string; path: string; pass: boolean }>
    const failedRoutes = routes.filter((route) => !route.pass)
    if (missing.length || extra.length || failedRoutes.length) failures += 1
    console.log(`${roleReport.role}: sidebar missing=${missing.length} extra=${extra.length} routeFailures=${failedRoutes.length}`)
    for (const route of failedRoutes) {
      console.log(`  ${route.label}: expected ${route.expected}, got ${route.path}`)
    }
  }

  console.log(`Screenshots: ${SCREENSHOT_DIR}`)
  if (failures > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
