# dsp-pill

Personalized Formulation Studio: a local, offline hackathon demo that walks synthetic bloodwork through
**Start → Context → Biomarkers → Formula (simulated sachet and manufacturing) → Next Formula (v2)**.

> Synthetic demo data · Hackathon prototype · Not medical advice · Formulations are not clinically validated

Everything runs on your own computer: no database, accounts, payments, AI models or external requests.

---

## Quick start: run it on your computer

### 1. Install the prerequisites

- **Node.js 22.13 or newer** (check with `node -v`). Download it from <https://nodejs.org>, or with nvm run
  `nvm install` inside the project folder (the version is pinned in `.nvmrc`).
- **Git** (check with `git --version`).

### 2. Get the code

```bash
git clone https://github.com/Andrew-exe/dsp-pill.git
cd dsp-pill
git checkout andrew/demo-pitch
```

Already cloned? Just update:

```bash
cd dsp-pill
git fetch origin
git checkout andrew/demo-pitch
git pull
```

### 3. Install dependencies (needs internet, one time only)

```bash
npm install
```

This also copies the PDF reader's worker file into `public/`. You do not need to install anything globally.

### 4. Build the app

```bash
npm run build
```

### 5. Start it

```bash
npm run start -- -p 3100
```

Open **<http://localhost:3100>** in your browser. Stop the server with `Ctrl+C`.

After step 3 the app needs no internet at all, so you can turn Wi-Fi off for the demo.

> Prefer live reloading while editing code? Use `npm run dev` instead of steps 4–5 and open
> <http://localhost:3000>. For the actual demo, use the build (steps 4–5): it is faster and is what the tests run
> against.

---

## Running the demo (about 4 minutes)

The full talk track is in [PITCH.md](PITCH.md). The click path:

1. **Your Starting Point** – drag in `public/reports/dsp-pill-synthetic-report-v1.pdf` (also downloadable from the
   Start page), or click **Load synthetic patient**. Check the values, then click **Confirm biomarkers**.
2. **Your Context** – click **Fill synthetic profile**, then **See my analysis**.
3. **Your Biomarkers** – use **Try a change** to let a judge edit something:
   - Vitamin D → 28: Vitamin D drops out of the formula.
   - Diet → Omnivore: B12 drops out.
   - Existing Vitamin D3 → 1,000 IU: Vitamin D is "covered by existing supplement".
   - Medical history → Yes: clinician review required, manufacturing disabled.
4. **Your Formula** – the sachet shows **Vitamin D3 600 IU / 15 mcg, Vitamin B12 25 mcg, Magnesium (elemental)
   100 mg**. Click **Simulate manufacturing** and step through to `SIM-1842-v1`.
5. **Your Next Formula** – click **Load 8-week follow-up report (synthetic)**. Formula v2 contains **Vitamin B12
   25 mcg** only.
6. Click **Reset demo** (top right) before the next person.

Tips:

- **Use Reset demo, not browser refresh.** The walkthrough lives only in browser memory; a refresh also starts over.
- Undo each "Try a change" edit before moving on, otherwise the sachet reflects it.
- Optional extra: upload `public/reports/dsp-pill-synthetic-report-scenario-b.pdf` with sex set to Female –
  manufacturing is disabled (ferritin review). Change **Sex used for lab context** to Male in Your Context and it is
  enabled again. Sex selects a lab range; it never changes a dose.
- **Methodology** (header link) explains the fixed demo policy and keeps your place in the walkthrough.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` complains about the Node version | Install Node 22.13+ (`node -v` to check). |
| Error that port 3100 is already in use (`EADDRINUSE`) | Stop the other server, or pick another port: `npm run start -- -p 3200`. |
| `next start` says it could not find a production build | Run `npm run build` before `npm run start`. |
| PDF upload says it can't read the file | Only text-based PDFs up to 10 MB / 10 pages are supported. Use **Enter manually** instead. |

---

## For developers

### Commands

```bash
npm run dev               # development server on http://localhost:3000
npm test                  # unit tests (Vitest, run once)
npm run lint              # ESLint
npm run build             # production build
npm run e2e:install       # one time: download Chromium into node_modules for the browser tests
npm run e2e               # Playwright browser tests against a production build on :3100
npm run generate:reports  # regenerate the synthetic PDF reports in public/reports (needs Ghostscript)
```

`npm run e2e` builds, starts `next start` on port 3100 (it never reuses an existing server, so make sure nothing
else is listening on :3100) and runs the specs with one worker.

### Offline rehearsal (Linux)

Runs the production build and the full walkthrough test inside a network namespace that has only loopback, so any
external request would fail and be recorded:

```bash
npm run build
unshare -rn sh -c 'ip link set lo up; PLAYWRIGHT_BROWSERS_PATH=0 NEXT_TELEMETRY_DISABLED=1 SKIP_BUILD=1 npx playwright test tests/e2e/walkthrough.spec.ts'
```

`SKIP_BUILD=1` makes Playwright start only `npm run start`, because the build was done above.

### Methodology

Open `/methodology` (linked in the header) for the fixed demonstration policy, prototype limits, safety gates and
the engine/policy versions. The NIH sources linked there provide clinical context only and do not validate the
demo dosing policy.
