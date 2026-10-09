// Where the ETL keeps its files. All three folders are git-ignored.

import { join } from "node:path";

export const RAW_DIR = join("etl", "raw");
export const DUMPS_DIR = join("etl", "dumps");
export const REPORTS_DIR = join("etl", "reports");
