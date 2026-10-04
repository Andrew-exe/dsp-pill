import type { Metadata } from "next";
import Link from "next/link";
import { DisclaimerBanner } from "@/components/shell/DisclaimerBanner";
import { NUTRIENT_IDS, NUTRIENT_UNITS } from "@/lib/domain/types";
import { DeterministicDoseEngine } from "@/lib/engine/deterministic";
import { DemoSafetyPolicy, INGREDIENT_NAMES, PROTOTYPE_CEILINGS } from "@/lib/safety/policy";

export const metadata: Metadata = {
  title: "Methodology note · dsp-pill",
  description: "The fixed demonstration policy, safety gates and sources behind the dsp-pill prototype.",
};

const engine = new DeterministicDoseEngine();
const policy = new DemoSafetyPolicy();

const POLICY_ROWS: { nutrient: string; behavior: string }[] = [
  {
    nutrient: "Vitamin D",
    behavior:
      "Uses 25-OH D. Below 12 ng/mL or above 50: review. From 12 to below 20: proposed supplemental total 1,000 IU/day. From 20 through 50: no addition.",
  },
  {
    nutrient: "B12",
    behavior:
      "Below 400 pg/mL: review because further assessment may be needed. Within the supplied normal range and vegan diet: illustrative dietary-support total of 25 mcg/day; otherwise no addition. Above the lab range: review.",
  },
  {
    nutrient: "Folate",
    behavior:
      "At or below 3 ng/mL: review. Above 3 through 4: illustrative low-normal support total of 200 mcg folic acid/day, only with B12 at least 400 and within range. Above 4 and within range: no addition. Missing/low B12 or high folate: review.",
  },
  {
    nutrient: "Iron / ferritin",
    behavior:
      "Ferritin is interpreted with lab context, but iron is never automatically included in this prototype. Below 30 ng/mL or above the applicable lab range: review. Otherwise iron is omitted and the reason is explained.",
  },
  {
    nutrient: "Magnesium",
    behavior:
      "Supports serum magnesium. Below 0.75 mmol/L or above the lab range: review. From 0.75 to below 0.80: illustrative low-normal support total of 100 mg elemental magnesium/day. At least 0.80 and within range: no addition. Serum magnesium does not establish whole-body stores.",
  },
];

const GATES = [
  "Automatic proposals are limited to adults aged 18 to 65 with explicitly negative medication and medical-history screens.",
  "Any medication, significant medical history, pregnancy or breastfeeding, unresolved safety answer, or unknown supplement composition or amount triggers global review: biomarker interpretations are kept, no doses are proposed, and manufacturing is disabled.",
  "Abnormal or ambiguous findings for one nutrient return a review status and no dose for that nutrient. Other proposals may stay visible, but manufacturing stays disabled.",
  "Missing required biomarkers prevent a complete formulation; available interpretations are shown and the missing information is requested.",
  "A passed screen is never proof of safety.",
];

const SOURCES = [
  { label: "Vitamin D", href: "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/" },
  { label: "Vitamin B12", href: "https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/" },
  { label: "Folate", href: "https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/" },
  { label: "Iron", href: "https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/" },
  { label: "Magnesium", href: "https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/" },
];

const h2 = "font-display text-3xl font-semibold text-teal";

export default function MethodologyPage() {
  return (
    <>
      <DisclaimerBanner />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-10">
        <Link href="/" className="font-semibold text-teal underline underline-offset-4 hover:text-teal/80">
          Back to the demo
        </Link>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-teal sm:text-5xl">
          Methodology note
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          Biomarker interpretation is kept separate from ingredient selection. The amounts and bands below are a{" "}
          <strong className="text-ink">fixed demonstration policy</strong>, not treatment recommendations. This page is
          stored locally and makes no network requests.
        </p>

        <section className="mt-12" aria-labelledby="policy-heading">
          <h2 id="policy-heading" className={h2}>Fixed demonstration policy</h2>
          <div className="relative mt-4 overflow-x-auto rounded-2xl border border-ink/10 bg-white/70">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-ink/10 text-sm uppercase tracking-widest text-ink-muted">
                  <th scope="col" className="px-5 py-3">Nutrient</th>
                  <th scope="col" className="px-5 py-3">Fixed demo behavior</th>
                </tr>
              </thead>
              <tbody>
                {POLICY_ROWS.map((row) => (
                  <tr key={row.nutrient} className="border-b border-ink/10 align-top last:border-0">
                    <th scope="row" className="whitespace-nowrap px-5 py-4 font-display text-lg text-teal">{row.nutrient}</th>
                    <td className="px-5 py-4 leading-relaxed text-ink">{row.behavior}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12" aria-labelledby="ceilings-heading">
          <h2 id="ceilings-heading" className={h2}>Supplemental ceilings</h2>
          <p className="mt-3 text-lg text-ink">
            Existing amounts above these ceilings trigger review. They are{" "}
            <strong>prototype limits, not established clinical upper limits</strong>.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {NUTRIENT_IDS.map((n) => (
              <li key={n} className="rounded-xl bg-ivory-deep px-5 py-4">
                <span className="block text-ink-muted">{INGREDIENT_NAMES[n]}</span>
                <span className="font-display text-2xl text-teal">
                  {PROTOTYPE_CEILINGS[n].toLocaleString("en-US")} {NUTRIENT_UNITS[n]} per day
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="gates-heading">
          <h2 id="gates-heading" className={h2}>Safety gates</h2>
          <ul className="mt-4 list-disc space-y-3 pl-6 text-lg leading-relaxed text-ink">
            {GATES.map((g) => <li key={g}>{g}</li>)}
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="overlap-heading">
          <h2 id="overlap-heading" className={h2}>Supplement overlap</h2>
          <p className="mt-3 text-lg text-ink">
            Known ingredients and daily quantities are normalized, including multivitamins and duplicate products of the
            same nutrient (summed).
          </p>
          <p className="relative mt-4 overflow-x-auto rounded-xl bg-ivory-deep px-5 py-4 font-mono text-base text-ink">
            formula addition = max(0, proposed supplemental total − existing daily amount)
          </p>
          <p className="mt-3 text-ink-muted">An existing product is never advised to be stopped. Additions are rounded to a whole unit.</p>
        </section>

        <section className="mt-12" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className={h2}>Clinical context sources</h2>
          <p className="mt-3 text-lg text-ink">
            The NIH Office of Dietary Supplements fact sheets give clinical context. These sources{" "}
            <strong>do not validate the demo dosing policy</strong>. Following a link leaves this local page.
          </p>
          <ul className="mt-4 space-y-2 text-lg">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a href={s.href} className="font-semibold text-teal underline underline-offset-4 hover:text-teal/80">
                  NIH ODS: {s.label} fact sheet (health professional)
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="versions-heading">
          <h2 id="versions-heading" className={h2}>Engine and policy versions</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-ivory-deep px-5 py-4">
              <dt className="text-ink-muted">Dose engine</dt>
              <dd className="font-mono text-lg text-ink">{engine.id} v{engine.version}</dd>
            </div>
            <div className="rounded-xl bg-ivory-deep px-5 py-4">
              <dt className="text-ink-muted">Safety policy</dt>
              <dd className="font-mono text-lg text-ink">{policy.id} v{policy.version}</dd>
            </div>
          </dl>
        </section>
      </main>
    </>
  );
}
