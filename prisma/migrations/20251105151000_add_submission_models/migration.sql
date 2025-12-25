-- Create table: submissions
create table if not exists "submissions" (
    "id" text primary key,
    "assignmentId" text not null,
    "studentId" text not null,
    "status" text not null default 'submitted',
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now()
);

-- Indexes
create index if not exists "submissions_assignmentId_studentId_idx"
  on "submissions" ("assignmentId", "studentId");

-- Create table: submission_files
create table if not exists "submission_files" (
    "id" text primary key,
    "submissionId" text not null references "submissions"("id") on delete cascade,
    "fileName" text not null,
    "mimeType" text not null,
    "sizeBytes" integer not null,
    "storagePath" text not null,
    "createdAt" timestamp with time zone not null default now()
);

-- Indexes
create index if not exists "submission_files_submissionId_idx"
  on "submission_files" ("submissionId");


