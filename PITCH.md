# dsp-pill pitch script (3 to 5 minutes)

All data is synthetic. Say the banner out loud once: "Synthetic demo data, hackathon prototype, not medical advice."
Rehearse on the production build with the network off: `npm run build && npm run start -- -p 3100`, open
http://localhost:3100. Click **Reset demo** (top right) before every run.

Expected end result of the main path: **Vitamin D3 600 IU / 15 mcg, Vitamin B12 25 mcg, Magnesium (elemental) 100 mg**
in one simulated sachet. Follow-up (v2): **Vitamin B12 25 mcg** only.

## 1. Your Starting Point (about 30 s)

Say: "Bloodwork is a PDF. Nothing here leaves the browser: it is read locally, and only the values you confirm are sent
to a small local rules service."

Click: drag in `public/reports/dsp-pill-synthetic-report-v1.pdf` (or click **Load synthetic patient** to skip ahead).
The review table appears: Vitamin D 18, B12 480, folate 6.5, ferritin 62, magnesium 0.78. Point out that each value is
editable and the tests the report contains but we do not use (hemoglobin, TSH) are listed, not silently dropped.
Click **Confirm biomarkers**.

## 2. Your Context (about 30 s)

Say: "Safety answers come before any dose. Medications, history, pregnancy and supplements gate everything."

Click **Fill synthetic profile** (32, female, vegan, no medications or history, Vitamin D3 400 IU daily).
Click **See my analysis**.

## 3. Your Biomarkers (about 75 s) - judge-edit moments

Say: "Each card separates what the lab says from our fixed demonstration policy. Amounts are policy, not advice."
Scroll the five cards; note Vitamin D 18 ng/mL, existing 400 IU subtracted from a 1,000 IU total, leaving 600 IU.

Open **Try a change** and invite a judge to pick one (every card and amount re-evaluates; the sachet always reflects
the last edit):

1. **Vitamin D**: drag to 28 ng/mL. Vitamin D drops out (no addition above 20).
2. **Diet**: switch Vegan to Omnivore. B12 drops out; switch to Unknown and B12 goes to review.
3. **Supplement overlap**: set existing Vitamin D3 to 1,000 IU daily. The addition becomes nothing: already covered.
4. **Medical history**: choose Yes. Global review: interpretations stay, no doses, manufacturing disabled.

Put each edit back (or press **Reset demo** and run the load again). Then click **See my formula**.

## 4. Your Formula (about 60 s)

Say: "One simulated sachet. We never invent weight, excipients or capsule capacity."
Point to the label `dsp-pill Formula #1842 · v1` and the three lines. Click **Simulate manufacturing** and press
**Next** through specification, blending, packaging and the demo confirmation (SIM-1842-v1). Say: "No real product is
made or shipped." Press Escape.

Optional scenario B (judge-edit on sex and ferritin): after **Reset demo**, upload
`public/reports/dsp-pill-synthetic-report-scenario-b.pdf`, **Confirm biomarkers**, **Fill synthetic profile**,
**See my analysis**, **See my formula**: the sachet is a draft and manufacturing is disabled (ferritin review). Go to
**Your Context**, set **Sex used for lab context** to Male, run analysis again: a different, explicitly supplied
ferritin range applies and manufacturing is enabled. Sex never changes a dose.

## 5. Your Next Formula (about 45 s)

Click the **Your Next Formula** step, then **Load 8-week follow-up report (synthetic)**.
Say: "Measured points only: it does not show the formula caused anything and predicts nothing." Show v1 beside v2:
Vitamin D3 and magnesium are no longer included, Vitamin B12 25 mcg remains.

## 6. Close and reset (about 20 s)

Open **Methodology** in the header: the fixed policy table, the prototype limits (not clinical upper limits), the
safety gates, the overlap formula, the engine and policy versions, and the NIH links (context only; they do not
validate the policy). Return, and click **Reset demo**: back to Start, no draft, no result, ready for the next judge.

Timing: roughly 4 minutes at a steady pace; the scripted walkthrough runs in seconds under test.
