// Edit history for the app's database. Callers check can() before saving.

import "server-only";
import { db } from "@/lib/db";
import { createRevisionService } from "@/lib/revisions/service";

// No table keeps history yet. Each model registers its table here when it
// is added (T10 onwards), after giving it versionColumn().
export const { saveWithRevision, listRevisions, getRevision, restoreRevision } =
  createRevisionService(db, {});
