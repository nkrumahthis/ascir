// Checks that add sections to the run report, for a person to follow up.
// Each later ETL ticket can add its own check to REPORT_CHECKS.

import type { Dump } from "@/etl/push";
import type { DumpItem } from "@/etl/registry";

export type Finding = { ref: string; detail: string };
export type CheckContext = {
  pushed: readonly Dump[];
  // Every ref in etl/dumps, including types this run did not push.
  knownRefs: ReadonlySet<string>;
};
export type ReportCheck = {
  title: string;
  run: (context: CheckContext) => Finding[];
};

type Visit = (key: string, value: unknown, path: string) => void;

// Calls visit for every key below value, with a path such as body.content[2].
function walk(value: unknown, visit: Visit, path = "") {
  if (Array.isArray(value)) {
    value.forEach((child, i) => walk(child, visit, `${path}[${i}]`));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    visit(key, child, childPath);
    walk(child, visit, childPath);
  }
}

function eachItem(pushed: readonly Dump[]) {
  return pushed.flatMap((dump) =>
    dump.items.map((item) => ({ type: dump.definition.type, item })),
  );
}

// Links between records are fields named *Ref or *Refs, such as authorRefs.
export const unresolvedRefs: ReportCheck = {
  title: "Unresolved refs",
  run: ({ pushed, knownRefs }) =>
    eachItem(pushed).flatMap(({ item }) => {
      const findings: Finding[] = [];
      walk(item, (key, value, path) => {
        if (!key.endsWith("Ref") && !key.endsWith("Refs")) return;
        const refs = Array.isArray(value) ? value : [value];
        for (const ref of refs) {
          if (typeof ref === "string" && !knownRefs.has(ref)) {
            findings.push({ ref: item.ref, detail: `${path} → ${ref}` });
          }
        }
      });
      return findings;
    }),
};

// The lookahead stops ascir.org.uk or ascir.org-archive from matching.
const OLD_SITE_URL = /https?:\/\/(?:www\.)?ascir\.org(?![\w.-])[^\s"'<>)\]]*/gi;
// ref and legacyUrl point at ascir.org on purpose.
const OLD_SITE_ALLOWED = new Set(["ref", "legacyUrl"]);

export const oldSiteLinks: ReportCheck = {
  title: "Links still pointing at ascir.org",
  run: ({ pushed }) =>
    eachItem(pushed).flatMap(({ item }) => {
      const findings: Finding[] = [];
      walk(item, (key, value, path) => {
        if (OLD_SITE_ALLOWED.has(key) || typeof value !== "string") return;
        for (const url of value.match(OLD_SITE_URL) ?? []) {
          findings.push({ ref: item.ref, detail: `${path}: ${url}` });
        }
      });
      return findings;
    }),
};

function isImageWithoutAlt(item: DumpItem) {
  const isImage =
    typeof item.type !== "string" || item.type.startsWith("image");
  const alt = typeof item.alt === "string" ? item.alt.trim() : "";
  return isImage && alt === "";
}

// Alt text lives on the media record, so one finding per image.
export const missingAlt: ReportCheck = {
  title: "Images missing alt text",
  run: ({ pushed }) =>
    eachItem(pushed)
      .filter(({ type, item }) => type === "media" && isImageWithoutAlt(item))
      .map(({ item }) => ({ ref: item.ref, detail: "no alt text" })),
};

export const REPORT_CHECKS: readonly ReportCheck[] = [
  unresolvedRefs,
  oldSiteLinks,
  missingAlt,
];
