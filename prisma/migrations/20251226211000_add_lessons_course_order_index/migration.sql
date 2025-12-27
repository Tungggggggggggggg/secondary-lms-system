-- Add index to speed up lessons listing and order allocation by course
CREATE INDEX IF NOT EXISTS "lessons_courseId_order_idx"
  ON "lessons" ("courseId", "order");
