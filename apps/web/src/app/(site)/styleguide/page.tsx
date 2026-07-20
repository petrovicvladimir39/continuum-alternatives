import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ALT_TAXONOMY, CLASS_ACCENTS } from "@continuum/shared";
import { Button } from "@/components/ui/button";
import { ClassChip, ClassKicker, ClassTopRule } from "@/components/editorial/class-accent";
import { DataTable, numericCell } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { StatBlock } from "@/components/ui/stat-block";
import { Tag } from "@/components/ui/tag";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

const neutrals = [
  ["ground", "#FAFAF8"],
  ["surface", "#FFFFFF"],
  ["ink", "#141311"],
  ["ink-secondary", "#5C5952"],
  ["ink-muted", "#8A867C"],
  ["line", "#E7E4DC"],
  ["line-strong", "#D2CEC3"],
] as const;

const accents = [
  ["accent", "#17456B"],
  ["accent-ink", "#FFFFFF"],
] as const;

const semantics = [
  ["equity", "#1D7A5F"],
  ["equity-bg", "#E9F3EF"],
  ["credit", "#96690F"],
  ["credit-bg", "#F6EFDF"],
  ["distressed", "#A4442A"],
  ["distressed-bg", "#F7EAE5"],
  ["positive", "#1D7A5F"],
  ["negative", "#A4442A"],
] as const;

const funds: {
  name: string;
  country: string;
  type: "equity" | "credit" | "distressed";
  typeLabel: string;
  aum: string;
  yoy: number;
}[] = [
  {
    name: "Enterprise Investors PEF IX",
    country: "Poland",
    type: "equity",
    typeLabel: "Equity",
    aum: "€498M",
    yoy: 3.4,
  },
  {
    name: "MidEuropa Fund V",
    country: "Regional",
    type: "equity",
    typeLabel: "Equity",
    aum: "€800M",
    yoy: 1.9,
  },
  {
    name: "Accession Mezzanine Capital IV",
    country: "Regional",
    type: "credit",
    typeLabel: "Credit",
    aum: "€264M",
    yoy: 6.1,
  },
  {
    name: "Balkan Special Situations II",
    country: "Serbia",
    type: "distressed",
    typeLabel: "Distressed",
    aum: "€112M",
    yoy: -2.8,
  },
];

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="w-28">
      <div className="h-14 rounded-sm border border-line" style={{ background: hex }} />
      <div className="type-small mt-1.5">{name}</div>
      <div className="type-data text-ink-muted">{hex}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line py-8">
      <h2 className="type-label mb-5">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <div className="py-10">
      <h1 className="type-h1">Styleguide</h1>
      <p className="mt-2 text-ink-secondary">
        The visual contract for Continuum Alternatives. All future phases build from these tokens.
      </p>

      <Section title="Color · Neutrals">
        <div className="flex flex-wrap gap-4">
          {neutrals.map(([name, hex]) => (
            <Swatch key={name} name={name} hex={hex} />
          ))}
        </div>
      </Section>

      <Section title="Color · Accent">
        <div className="flex flex-wrap gap-4">
          {accents.map(([name, hex]) => (
            <Swatch key={name} name={name} hex={hex} />
          ))}
        </div>
      </Section>

      <Section title="Color · Semantic data encoding">
        <div className="flex flex-wrap gap-4">
          {semantics.map(([name, hex]) => (
            <Swatch key={name} name={name} hex={hex} />
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="space-y-6">
          <div>
            <div className="type-label mb-1">h1 · serif 500 · 30/1.2</div>
            <div className="type-h1">The map of European alternative assets</div>
          </div>
          <div>
            <div className="type-label mb-1">h2 · serif 500 · 22/1.25</div>
            <div className="type-h2">Fund performance across European private markets</div>
          </div>
          <div>
            <div className="type-label mb-1">h3 · sans 500 · 16/1.3</div>
            <div className="type-h3">Quarterly capital deployment</div>
          </div>
          <div>
            <div className="type-label mb-1">body · sans 400 · 14/1.5</div>
            <div className="type-body">
              Private capital across Europe remains concentrated in mid-market buyouts,
              with credit strategies gaining share as bank lending retreats.
            </div>
          </div>
          <div>
            <div className="type-label mb-1">small · 13/1.45</div>
            <div className="type-small">Source: fund filings and manager disclosures.</div>
          </div>
          <div>
            <div className="type-label mb-1">label · sans 500 · 11/1.3 uppercase</div>
            <div className="type-label">Assets under management</div>
          </div>
          <div>
            <div className="type-label mb-1">data cell · 13 tabular-nums</div>
            <div className="type-data">€1,240.5M · 1,024 · 87.25%</div>
          </div>
        </div>
      </Section>

      <Section title="Button">
        <div className="flex gap-3">
          <Button>Primary action</Button>
          <Button variant="ghost">Ghost action</Button>
        </div>
      </Section>

      <Section title="Panel">
        <Panel className="max-w-md">
          <div className="type-h3">Panel heading</div>
          <p className="mt-1 text-ink-secondary">
            Surface background, hairline border, 4px radius. Elevation is expressed by borders only.
          </p>
        </Panel>
      </Section>

      <Section title="Tag">
        <div className="flex gap-2">
          <Tag>Neutral</Tag>
          <Tag variant="equity">Equity</Tag>
          <Tag variant="credit">Credit</Tag>
          <Tag variant="distressed">Distressed</Tag>
        </div>
      </Section>

      <Section title="DataTable">
        <DataTable>
          <thead>
            <tr>
              <th>Fund</th>
              <th>Country</th>
              <th>Type</th>
              <th className={numericCell}>AUM</th>
              <th className={numericCell}>YoY</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((fund) => (
              <tr key={fund.name}>
                <td>{fund.name}</td>
                <td>{fund.country}</td>
                <td>
                  <Tag variant={fund.type}>{fund.typeLabel}</Tag>
                </td>
                <td className={numericCell}>{fund.aum}</td>
                <td
                  className={`${numericCell} ${fund.yoy < 0 ? "text-negative" : "text-positive"}`}
                >
                  {fund.yoy < 0 ? "−" : "+"}
                  {Math.abs(fund.yoy)}%
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Section>

      <Section title="StatBlock">
        <div className="flex gap-12">
          <StatBlock value="€41.2B" label="Tracked AUM" delta={4.2} />
          <StatBlock value="312" label="Active funds" />
          <StatBlock value="9.4%" label="Median net IRR" delta={-0.8} />
        </div>
      </Section>

      <Section title="Class accents (Phase 27)">
        <p className="type-small mb-4 max-w-xl text-ink-secondary">
          One accent per taxonomy asset class. Usage law: kicker text, 2px top rule, and the class
          chip (border+text) — never backgrounds, fills, headlines, buttons, or links. The map
          capital-type colors are a separate system.
        </p>
        <div className="mb-6 flex flex-wrap gap-4">
          {ALT_TAXONOMY.map((assetClass) => (
            <div key={assetClass.slug} className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 border border-line"
                style={{ backgroundColor: CLASS_ACCENTS[assetClass.slug] }}
              />
              <span className="type-small">{assetClass.label}</span>
              <span className="type-data text-ink-muted">{CLASS_ACCENTS[assetClass.slug]}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALT_TAXONOMY.map((assetClass) => (
            <div key={assetClass.slug} className="border border-line bg-surface">
              <ClassTopRule assetClass={assetClass.slug} />
              <div className="p-3">
                <ClassKicker
                  assetClass={assetClass.slug}
                  strategy={assetClass.strategies[0]?.slug ?? null}
                />
                <p className="mt-1 font-serif text-[17px] font-medium leading-[1.25]">
                  Specimen article headline in the {assetClass.label.toLowerCase()} register
                </p>
                <p className="type-data mt-2 flex items-center gap-2 text-ink-muted">
                  Continuum Desk
                  <ClassChip
                    assetClass={assetClass.slug}
                    strategy={assetClass.strategies[0]?.slug ?? null}
                  />
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
