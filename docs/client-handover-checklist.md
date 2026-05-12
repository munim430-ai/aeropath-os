# AeroPath OS Client Handover Checklist

## Production

- Production URL: https://aeropath-os.vercel.app
- Demo workspace: https://aeropath-os.vercel.app/app/demo
- Student portal entry: https://aeropath-os.vercel.app/portal/demo
- Sub-agent portal entry: https://aeropath-os.vercel.app/sub-agent/demo

## Demo Staff Credentials

All seeded staff users use the same demo password: `Demo@12345!`

| Role | Email |
| --- | --- |
| Owner | `demo@aeropath.app` |
| Manager | `manager@aeropath.app` |
| Counselor | `counselor@aeropath.app` |
| Receptionist | `reception@aeropath.app` |

## Supabase Notes

- The live schema must include appended blocks 24, 25, and 26 from `supabase/schema.sql`.
- Required blocks:
  - `-- 24. Sub-Agent Portal`
  - `-- 25. Commission And Payout Tracking`
  - `-- 26. Payroll MVP`
- Do not rerun the full `supabase/schema.sql` against an existing production database unless intentionally resetting it.
- Use `npx tsx scripts/reconcile-live-schema.ts` to verify the live schema before demo seeding.
- Use `npx tsx scripts/seed-demo.ts` to reset only the `demo` tenant's business data and recreate realistic demo rows.

## Vercel Notes

- GitHub remote: `https://github.com/munim430-ai/Aeropath-OS.git`
- Current production branch used in this handover pass: `master`
- If a `master` push lands as Preview, promote the ready deployment with:
  - `npx vercel promote <preview-deployment-url> --yes --timeout 5m`
- Confirm production with:
  - `npx vercel inspect https://aeropath-os.vercel.app`

## QA Evidence

- Screenshot output folder: `docs/qa-screenshots/`
- QA report file: `docs/qa-screenshots/qa-report.json`
- Browser QA command: `npx tsx scripts/qa-production.ts`
- Expected protected-route behavior:
  - Unauthenticated `/app/demo/*` routes redirect to `/login`.
  - Role-restricted routes redirect back to `/app/demo` after login.

## Known Limitations And Next Upgrades

- Route authorization is enforced by a client-side guard after authenticated layout load. Server-side role enforcement should be added for stronger defense-in-depth on sensitive pages.
- `master` and `main` currently diverge on GitHub. Production has been promoted from `master`; reconcile default-branch strategy before the next long release train.
- Demo credentials are for review only and should be rotated or disabled before real client data is entered.
- Payroll is an MVP ledger and approval flow; it does not yet integrate bank transfer exports, payslip PDFs, or statutory payroll rules.
- Commission tracking is ready for operational review but does not yet auto-generate payouts from every application status change.
- Final client rollout should add branded email templates, reminder automations, and a guided onboarding flow.
