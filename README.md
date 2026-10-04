# dsp-pill

Personalized Formulation Studio: a local, offline hackathon demo that walks synthetic bloodwork through
**Start → Context → Biomarkers → Formula (simulated sachet and manufacturing) → Next Formula (v2)**.

Synthetic demo data. Hackathon prototype. Not medical advice. Formulations are not clinically validated.
Everything runs locally: no database, accounts, payments, models or external requests.

## Setup

Requires Node 22 (`.nvmrc`; `engines.node` is `>=22.13`).

```bash
npm install          # postinstall copies the PDF worker into public/
npm run e2e:install  # downloads Chromium into node_modules (PLAYWRIGHT_BROWSERS_PATH=0, no global install)
```

## Commands

```bash
npm run dev          # development server on http://localhost:3000
npm test             # unit tests (Vitest, run once)
npm run lint         # ESLint
npm run build        # production build
npm run e2e          # Playwright against a production build served on :3100
npm run generate:reports   # regenerate the synthetic PDF reports in public/reports
```

`npm run e2e` builds, starts `next start` on port 3100 (never reusing an existing server, so make sure nothing
else listens on :3100) and runs the specs with one worker.

## Offline rehearsal

Run the production build and the full walkthrough spec inside a network namespace that has only loopback, so any
external request fails and is recorded by the spec's request tracker:

```bash
npm run build
unshare -rn sh -c 'ip link set lo up; PLAYWRIGHT_BROWSERS_PATH=0 NEXT_TELEMETRY_DISABLED=1 SKIP_BUILD=1 npx playwright test tests/e2e/walkthrough.spec.ts'
```

`SKIP_BUILD=1` makes Playwright start only `npm run start` (the build was done above). For a live rehearsal, run
`npm run build && npm run start -- -p 3100` with the network disabled and follow [PITCH.md](PITCH.md).

## Methodology

Open `/methodology` (linked in the header) for the fixed demonstration policy, prototype limits, safety gates and
the engine/policy versions. The NIH sources linked there provide clinical context only and do not validate the
demo dosing policy.
