# GSR Case Management System — Specification v1

Status: **Draft for review — no code has been written yet.** This document is the
output of the requirements-discovery interview. Everything below reflects
either (a) something you explicitly described, (b) a decision you made when
asked, or (c) a proposal clearly marked as such. Nothing here is final until
you sign off section by section.

---

## 1. Product purpose

A single desktop application that carries a Genuine Student Requirement (GSR)
case for a study-in-Australia visa applicant through its entire lifecycle —
from first contact to a finalized, exportable GSR and its supporting evidence
pack — for one consultant (you) managing multiple clients at once.

It replaces the current scattered workflow (PDFs, Word docs, email, browser
tabs, screenshots, folders, separate notes) with one connected system where
every fact, document, verification record, and piece of research stays linked
to the client it belongs to and to the specific GSR statement it supports.

It is explicitly **not** a document store or a plain text editor. Its value is
the *relationships* it keeps between information, evidence, and writing.

## 2. User workflow

Confirmed 7-stage workflow, non-linear (you can jump between stages at any
time; stages track progress, they don't lock navigation):

```
1. Client & Information  →  2. Documents  →  3. Verification  →
4. Evidence & Research  →  5. GSR Writing  →  6. Review  →  7. Finalization
```

Each client workspace shows which stage is "current" (for dashboard display)
but every stage's data is always reachable — e.g. you can add evidence while
still collecting documents, or fix information mid-write.

## 3. Client dashboard

**Client list view** shows, per client:
- Name
- Status: Red (Action Required) / Yellow (In Progress) / Green (Ready/Complete)
  — **you set this manually**; the app computes a *suggested* status from case
  state (missing docs, pending verifications, unsupported statements, etc.)
  and displays it as a hint, but never overwrites your explicit choice.
- Current workflow stage (e.g. "Verification", "GSR Writing")
- Last updated date/time
- Pending action count (e.g. "3 docs missing · 2 verifications pending")
- Target/intended Australian intake date

**Dashboard-level controls**: add client, delete client (with confirmation —
this is destructive), open client workspace, search (by name and, per §11,
broader content), sort (name, status, last updated, intake date), filter (by
status, by stage, by "needs attention"), total client count, and a prominent
"needs attention" view surfacing anything Red or stalled.

Deleting a client is a hard, irreversible action given local-only storage —
the delete confirmation will require typing the client's name to confirm,
similar to destructive-action patterns in other professional tools.

## 4. Client workspace

Each client has a fully isolated workspace — one client's data is never
visible from inside another's. The workspace is a hub with entry points into
all 7 stages, plus a persistent client-summary panel and the AI assistant,
so you never need to leave the client to look something up.

**Client isolation is a hard technical boundary**, not just a UI convention:
every database query and every AI context-assembly step is scoped by
`client_id`, and the AI assistant's context window is built exclusively from
that one client's data (see §10).

## 5. Information architecture

**Model**: fixed core schema per section (the fields you listed — personal,
education, English test, Australian study, employment, family, immigration/
residence, financial/sponsor) **plus a "custom field" option on every entry**,
so anything not covered by the built-in schema can still be captured in a
structured (searchable, AI-readable) way rather than dumped into free text.

**Sections** (each is a repeatable list of entries where relevant, e.g. you
can have multiple education entries, multiple employment entries):

- **Personal**: name, contact info, personal profile, residence info, next of
  kin, family info
- **Education**: level (primary/secondary/post-secondary), institution,
  course, start/end dates, qualification, final grade + breakdown,
  institution contact/referee, clubs/certifications
- **English test (IELTS etc.)**: component scores, overall score, TRF
  reference, test date
- **Australian study**: institution/provider, course, course level, CoE
  info (repeatable — a client can have multiple CoEs), offer letter info,
  intended start date
- **Employment** (repeatable): employer, job title, employment type, start/
  end date, monthly salary, duties, employer contact, linked supporting
  documents
- **Family**: relationships, obligations, other GSR-relevant notes
- **Immigration/residence history**: repeatable entries for prior travel,
  visas, residence
- **Financial/Sponsor** (repeatable — **multiple sponsors supported**, per
  your answer): each Sponsor entity has its own contact/relationship info and
  a repeatable list of **Income/Asset Sources** (salary, business, property,
  other), each of which carries its own supporting documents and its own
  verification status. This lets a case with two parents as sponsors, each
  with different income sources, be modeled cleanly without forcing
  everything under one "sponsor."

**Information vs. documents**: every information *entry* (e.g. one
Employment record) can have zero or more documents attached to it
(Employment Letter, Payslip, ...). The entry and its documents are separate
objects linked by relationship — editing the structured fields never touches
the attached files, and a document can support more than one information
entry if relevant (e.g. one bank statement supporting both an Income Source
and a Verification record).

**Versioning — proposed, needs your confirmation**: I recommend every edit to
an information entry keeps a lightweight history (previous value + timestamp,
not a full diff UI) rather than silently overwriting, since GSR-relevant facts
sometimes get corrected mid-case and it's useful to know what changed and
when. This is a proposal — say if you'd rather have no history and just track
"last edited."

**Verified / unverified marking**: any individual field or entry can be
flagged "requires verification." Until a linked Verification record reaches
status "Verified," the UI marks that field/entry as unverified (visually
distinct — see §14). This is the mechanism described in your notes:
`Information → flagged for verification → Verification Record → Evidence`.

## 6. Document management

**Categories** (built-in, extensible with your own custom categories):
Identity & Personal · Education · Employment · Financial · Australian Study ·
Verification Correspondence · Evidence/Research · GSR Drafts & Finalized.

**Per-document capabilities**: upload, in-app preview (PDF viewer, zoom,
text search within the PDF), label, category, freeform notes/context, link to
one or more information entries, link to other documents (e.g. "this email
confirms that voucher"), flag as verification evidence, replace/version
(old version kept, not deleted, per the versioning approach above), multi-
select, reorder, merge into a single output PDF, export the merged PDF —
**without breaking the links the original component files had** (i.e.
merging into "Voucher + Confirmation + KRA PIN + Permit.pdf" keeps each
source file's metadata, labels, and links intact and traceable back from the
merged file).

**PDF engine**: pdf.js for viewing/search/zoom, pdf-lib for merge/reorder/
export — both operate entirely locally, no upload to any external service.

## 7. Verification system

**Verification record fields**: what is being verified, why, who to contact,
their contact details, date contacted, method of contact, status, their
response, date verified, notes, linked correspondence/documents.

**Status set** (confirmed, simplified per your answer):
`Not Required → Pending → Verified → Could Not Verify`
(nuance — e.g. whether it failed outright vs. nobody responded — goes in the
record's notes field rather than as separate statuses, keeping day-to-day use
fast.)

**Email verification — manual upload workflow** (confirmed): you continue
handling verification emails in your own mail client; the resulting thread is
attached to the verification record as a PDF export or screenshots, keeping
the chain visible in-app:
```
Information flagged for verification → Verification Record → attached
correspondence (PDF/screenshots) → supporting docs (e.g. KRA PIN, permit)
```
No email service integration is built — this keeps the app fully offline-
capable and avoids depending on any mail account.

**Verification is per information-entry/field, not just per-document** —
e.g. "Employer name," "Salary," "Employment dates," and "Transaction" on the
same case can each independently be flagged and tracked, matching your
example.

## 8. Evidence management

**Evidence item fields**: source, title, URL, publication info, relevant
excerpt/text, notes, "what this proves," linked GSR section, linked GSR
statement(s), attached file (PDF/screenshot — **you attach these yourself**,
confirmed no auto-fetch/scraping is built).

**Evidence-to-statement relationship is bidirectional** (confirmed as
critical): from a GSR statement you can see its supporting evidence; from an
evidence item you can see every statement that cites it. This is a real
many-to-many link in the data model, not a one-way note.

## 9. GSR writing environment

**Structure**: a **fixed standard template** of GSR sections/questions
(confirmed — same structure applies across clients), rendered as an
Obsidian-style linked writing surface: while working on a section, a side
panel gives direct access to client info, documents, verified/unverified
status, evidence, research, notes, sources, prior drafts, and the checklist —
without leaving the editor.

**Section-level work**: you can open and work on one section while the rest
of the case stays reachable; each statement you write can be explicitly
linked to the evidence that supports it (feeding §8's bidirectional graph and
§12's compliance check).

**Draft history**: automatic version snapshots (confirmed) — the app keeps a
background history as you write, viewable/restorable, no manual "save
version" step required.

## 10. AI functionality

**Provider**: Google AI Studio (Gemini API), using **your own API key**,
entered in app settings. AI features require internet; all non-AI features
work fully offline.

**What the AI can access, scoped to one client at a time**: structured client
information (with verified/unverified/client-provided/background distinction
preserved), document contents (via extracted PDF text), verification records,
evidence, research notes, GSR drafts and version history, and checklist state
for that client. It never has cross-client access — context assembly is
hard-scoped by `client_id` at the code level, not just hidden in the UI.

**What the AI can do**:
- Conversational Q&A grounded in that client's data ("What evidence supports
  this?", "Is the salary verified?", "What's missing?")
- Rewrite/expand/shorten/improve selected text or a full section
- Draft a section — or, eventually, a full GSR — from collected information
  and evidence
- Contradiction detection across documents/information
- Missing-information/evidence detection
- Evidence-to-statement compliance checking (§12)

**Edit control (confirmed)**: the AI **never auto-applies changes**. Every
suggestion — a one-line rewrite or a full generated section — is shown as a
proposed change you must explicitly accept before it becomes part of the real
document. Declined suggestions are discarded without altering the draft.

**Cost/token awareness**: given GSRs run 8–11 pages plus a large evidence
corpus, the app should show an estimated token/cost indicator before
expensive actions (e.g. "generate full GSR"), so usage against your API key
stays visible. Exact cost figures depend on the Gemini model/pricing tier you
choose in AI Studio — worth revisiting once you've picked a model.

## 11. Search and knowledge management

Search operates within a client's workspace (matching your example: searching
"salary" should surface the Employment entry, payslips, bank statements,
verification records, GSR statements, and evidence that mention it) and, at
the dashboard level, across client names/status/stage for finding a case
quickly. Filtering/categorization follows the same category and status
vocabularies defined in §6/§7 so search and filters stay consistent.

## 12. GSR checklist / compliance review

**Confirmed workflow** (this is a headline feature, not an afterthought):
1. You upload your own checklist as a PDF.
2. The AI parses it into a structured set of requirements.
3. Against the current case (information, documents, verification, evidence,
   and drafted GSR text), the AI produces a **compliance percentage**, a list
   of specific gaps (missing info/documents/verification/evidence,
   unsupported statements), and where relevant, points to the exact GSR
   statement or section responsible for each gap.
4. On your instruction, the AI can attempt to **fix** flagged issues (e.g.
   draft the missing statement, suggest evidence, rewrite an unsupported
   claim) — subject to the same "always propose, review before apply" rule
   as all other AI edits (§10).

**Enforcement**: advisory only (confirmed) — the checklist never blocks you
from marking a GSR finalized; it's there to make sure nothing is missed by
mistake, not to gate your professional judgment.

## 13. PDF workflow

Covered in §6. Summary: local, fully-featured PDF handling (view, zoom,
search-in-document, label, annotate/note, link, merge, reorder, export) using
pdf.js + pdf-lib, with merged outputs retaining traceability back to their
source files and labels.

## 14. User interface

Material 3–inspired, premium desktop UI (Electron + React), covering: clean
navigation between dashboard and client workspace, clear visual status
indicators (the Red/Yellow/Green system, plus verified/unverified markers on
fields), modern cards/tables, strong search/filter affordances, split-screen
layouts (e.g. document preview beside an entry form, or draft beside
evidence panel), consistent form patterns, empty/loading/error states,
confirmation dialogs for destructive actions, and light/dark/system theming.
Designed for long working sessions, not quick CRUD.

## 15. Database structure (proposed — for review once workflow is signed off)

SQLite, one local database file. Core tables (indicative, not final):
`clients`, `information_sections` (typed per section with a JSON `custom_fields`
column for extensibility), `documents`, `information_document_links`,
`verification_records`, `verification_evidence`, `evidence_items`,
`evidence_statement_links`, `gsr_documents`, `gsr_sections`, `gsr_statements`,
`gsr_draft_versions`, `checklist_items`, `checklist_evaluations`,
`audit_log`. Every table carries `client_id` for hard isolation. Full schema
to be designed as its own step once this spec is approved.

## 16. File-storage structure (proposed)

A per-client folder tree on disk (e.g. `/ClientData/<client_id>/documents/`,
`/evidence/`, `/gsr_drafts/`, `/exports/`), with the SQLite database storing
metadata and relationships while actual files live as normal files on disk —
this keeps files inspectable/backupable outside the app if ever needed, per
your "I'll handle backups myself" answer (§18) — the app should make the data
folder's location obvious and documented so manual backup is straightforward.

## 17. Relationships between entities

The graph described throughout this document, summarized:
```
Client
 ├─ Information Entry ──(has)──> Document(s)
 │        └─(flagged)──> Verification Record ──(has)──> Verification Evidence
 ├─ Evidence Item <──(supports, bidirectional)──> GSR Statement
 ├─ GSR Statement ── belongs to ──> GSR Section ── belongs to ──> GSR Draft (versioned)
 └─ Checklist Evaluation ── references ──> gaps across all of the above
```
This graph is what search, the AI's grounding, and the compliance checklist
all read from — it is the core of the system, not an add-on.

## 18. Security

- Local-only storage, single machine (confirmed) — no cloud account, no
  network dependency for core features.
- App-level password/PIN lock on open (confirmed).
- **No disk-level encryption** (confirmed choice) — noting again for the
  record: if the machine itself isn't otherwise protected (device
  encryption, physical security), someone with direct disk access could
  still read the files. You've chosen to accept this trade-off for
  simplicity; flagging once more here since the data involved is sensitive.
- No multi-user roles needed (confirmed solo use).
- Basic audit log of key actions (edits, deletions, finalization) — proposed,
  low-cost to include given §5's versioning already tracks changes.

## 19. Authentication

Single local password/PIN gate at app launch (confirmed, no encryption tied
to it). No external identity provider needed since there's no multi-user or
cloud component.

## 20. Permissions

Not applicable beyond the single app-level lock — single user, single
machine, no role system (confirmed).

## 21. AI / RAG architecture (proposed)

Given local-only storage and Gemini as the model provider: at query time, the
app assembles a context package for the *current client only* — structured
information (with verified/unverified tags), relevant document text
(extracted from PDFs, chunked/embedded locally or selected by relevance —
approach to be decided based on typical case size), evidence items, and
current draft text — and sends only that package plus your prompt to the
Gemini API. No case data is stored by the app on any external server; the
only outbound calls are the AI requests themselves, using your API key.
Exact retrieval strategy (full-context vs. embedding-based retrieval for
large cases) is a technical decision to work out during implementation
planning, not something to lock in now.

## 22. Export / finalization

Final GSR exports as **both Word (.docx) and PDF** (confirmed). Finalization
also supports assembling/merging the supporting evidence PDF pack (§6/§13).
The Review stage (§2) is where the checklist (§12) is run before you choose
to finalize; finalization itself remains your call, never automatic.

## 23. Recommended technology stack

- **Shell/UI**: Electron + TypeScript + React (Material 3–styled component
  library)
- **Database**: SQLite (local file), accessed via a typed ORM (e.g. Prisma
  or Drizzle) for schema safety
- **File storage**: local filesystem, per-client folder structure (§16)
- **PDF**: pdf.js (viewing/search/zoom), pdf-lib (merge/reorder/export)
- **Rich text / linked writing editor**: Tiptap or Lexical, for the
  Obsidian-style GSR writing surface with inline references to info/evidence
- **AI**: Google AI Studio (Gemini API), user-supplied key, called directly
  from the app (no backend server needed given local-only architecture)
- **Packaging**: electron-builder → Windows installer (.exe/.msi)

This stack was chosen specifically because your storage answer (local-only,
offline-first, single machine) ruled out the cloud-hosted stack this session
had pre-configured (Supabase/Vercel/Resend) — those remain available if you
ever reconsider cloud sync, but nothing in the current design depends on
them.

## 24. Development phases (proposed)

1. **Foundation**: Electron shell, SQLite schema, client CRUD, dashboard,
   app-level password lock
2. **Client workspace core**: information sections (fixed schema + custom
   fields), document upload/storage, information-document linking
3. **PDF workflow**: viewer, labeling/notes, merge/reorder/export
4. **Verification system**: verification records, status tracking, evidence
   attachment, correspondence upload
5. **Evidence & research**: evidence entries, statement-linking groundwork
6. **GSR writing environment**: section template, linked writing surface,
   draft versioning
7. **AI integration**: client-scoped Gemini calls, chat interface, propose/
   review edit flow
8. **Checklist/compliance**: PDF checklist parsing, compliance scoring, gap
   detection, AI-assisted fixes
9. **Finalization**: Word/PDF export, evidence pack assembly, review flow
10. **Polish**: theming, empty/loading/error states, backup-folder docs,
    packaging/installer

## 25. Testing requirements (proposed)

- Unit tests around the data-relationship logic (§17) — this is the part
  most likely to have subtle bugs and hardest to catch visually
- Client-isolation tests specifically verifying no query or AI context can
  cross `client_id` boundaries
- PDF merge/export round-trip tests (source labels/links survive merging)
- Manual test pass on Windows for installer, offline behavior (core features
  working with network disabled), and AI feature behavior when offline
  (graceful "unavailable" state, not a crash)

---

## Open items still needing your input before implementation starts

- **§5 versioning depth** — confirm full field-history vs. "last edited only"
- **§15/§16 schema/folder design** — will be proposed in detail as a
  follow-up once the above is confirmed; not something to approve blind
- Whether you want the **AI compliance/checklist feature** prioritized
  earlier than Phase 8, given how central it sounds in how you described your
  review process
