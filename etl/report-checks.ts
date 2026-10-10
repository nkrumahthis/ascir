// Checks that add sections to the run report, for a person to follow up.
// Each later ETL ticket can add its own check to REPORT_CHECKS.

import type { Dump } from "@/etl/push";

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

export const REPORT_CHECKS: readonly ReportCheck[] = [];
