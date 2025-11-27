# NORTH_STAR.md — Monolyth (v2025-11-27, GA scope frozen — 20 weeks)

## Tagline

**Monolyth — All your docs. One brain.**

## Positioning (Who We Serve)

Early-stage tech founders (0–20 employees) running on **Google Workspace** (Drive, Docs, Sheets, Slides, Gmail) who are drowning in scattered contracts, decks, and investor-facing financials.

## Product Promise

One focused OS that drafts the critical documents, keeps them organized, and drives the follow-through — with one AI operator (**Mono**) that knows your files and your preferences.

## Non-Negotiable Truths

1. **Google-first at GA.** Only **Google Drive** and **Gmail** sync live at GA. Other connectors can appear as "Coming Soon" but do not ship.  

2. **Metadata-first ingestion.** We fetch full content only on **Preview / Save to Vault / Send for Signature**.  

3. **Vault-only semantics.** Embeddings + semantic search apply to **Vaulted** docs; external Google items remain keyword-indexed references.  

4. **Human-in-the-loop.** Mono proposes; users approve. No silent edits to documents, Playbooks, or permissions. Ever.  

5. **Explainability + Undo.** Every AI/automation shows "Why this?" and can be undone.  

6. **Scope freeze to GA.** No new GA modules, flows, connectors, or AI vendors are added mid-build.

## Navigation (GA)

Dashboard · Workbench · Builder · Vault · Playbooks · Share · Integrations · Insights · Settings

## What We Ship at GA (20-week build)

### Builders

- **Contracts (Hero):** NDA, Service/MSA, SOW/Work Order, Contractor. Clause library, structured editor, compare, send for signature.  

  *Mono:* explain clauses, suggest standard terms, compare drafts.  

  *Playbooks:* on **Sign** → store executed version, create renewal task.

- **Decks (B+):** **Fundraising Deck**, **Investor Update Deck**. AI outline → Google-friendly export (Slides/PDF).  

  *Mono:* rewrite for clarity/tone; align story to latest metrics via RAG.

- **Accounts (B+):** **SaaS Financial Pack** (basic P&L, runway) and **Investor Snapshot** (MRR/ARR, growth, burn, runway, LTV/CAC if provided).  

  Inputs: CSV upload & manual entry.  

  *Mono:* explain trends; flag inconsistencies vs. previous snapshot.

### Workbench (Home)

- Answers: **What happened? What's next? Where can Mono help?**  

- Sections: Recent Activity, Open Tasks, Active Deals/Rounds tiles, Mono side panel, Quick Actions (New Contract/Deck/Statement, Analyze Doc, Send for Signature).

### Vault

- Source of truth for Builder outputs and selected Google imports (Drive files, Gmail attachments).  

- Tracks: type, parties, dates (signed/effective/renewal), amounts, status, links, **Deal/Round** tag.  

- **RAG source** for Mono/Builders; versioning + diffs.

### Tasks (Internal only at GA)

- First-class objects created mainly by Playbooks; title, due, status, linked docs; optional email reminders.  

- Visible on Dashboard + Workbench.  

- **No** Google Tasks/Calendar sync at GA.

### Playbooks v1 (Built-ins only)

- Deterministic flows; can read Vault metadata + RAG; create/update internal tasks; send basic emails.  

- Built-ins:

  1. **Contract Signed → Renewal Task**  

  2. **Fundraising Deck Generated → Outreach Task**  

  3. **Investor Snapshot Created → Update Task**

- User-authored Playbooks / marketplace **post-GA**.

### Share & Sign

- Secure share links; send for signature via **Documenso**; track sent/viewed/signed.  

- Playbooks: on **Send** → follow-up task; on **Sign** → renewal task.  

- No Guest Spaces/Smart Share Page at GA.

### Integrations (GA live)

- **Google Drive:** select folders to sync; import docs/slides/PDFs into Vault with metadata linking to originals.  

- **Gmail:** ingest recent attachments + important links into Vault with message context.

### AI & Vendors

- **OpenAI** is the only LLM at GA (Mono, Builders, summaries).  

- Google APIs for Slides/PDF export.  

- **Mono Memory** per request: tone, risk profile, jurisdiction, locale.  

- **Template usage** logged for future ranking (analytics UI **post-GA**).

### RAG

- Vault + selected Google imports are chunked/embedded; retrieval grounds contract advice, reuses language, aligns decks to metrics, cross-checks narratives vs snapshots.

### Import Policy & Storage

- Default import scope **YTD** (presets: 12m/36m/custom).  

- Copy to Vault is explicit and shows **GB impact**.  

- Storage is metered by **Vault GB**; heavy media stored as **reference-only**; per-file caps; version diffs.

### Insights

- Activity timeline; lean dashboards (sent/viewed/signed; tasks due/completed); CSV export; weekly summary email.

### Security

- Least-privilege scopes; org-scoped RLS; watermark/redaction; complete audit of share/sign/task/playbook; "Why this?" everywhere.  

- GA security pass and operational runbooks required before release.

## Pricing (Initial, subject to polish later)

Free (1 user), Starter (~$30/user), Pro (~$60/user), Team (~$200/3 users +$50/addl.).  

Paywalls center on **volume (docs/tasks/storage)** and **feature depth (Builders/Playbooks)**.

## KPIs (Launch + 90 days)

- Time-to-Value: minutes to first **Save to Vault** and first **Send for Signature**  

- Activation: connect Google + run ≥1 built-in Playbook in 7 days  

- Weekly Active Workspaces (≥3 meaningful actions)  

- Task follow-through rate; Signed→Renewal automation uptake  

- Upgrade triggers at ≥80% of plan caps

## Delivery Plan (W1–W20) — Macro

- **W1–W6**: Base app, Google auth/scopes, Vault v1, Workbench v1, Contracts Builder spine, Documenso wire, Share v1, Insights v0, Mono v1, metadata-first ingestion.  

- **W7–W12**: Contracts (templates/clauses/compare), Decks (2 flows), Accounts (2 flows), versioning/diffs, Playbooks v1 (built-ins), internal Tasks.  

- **W13–W16**: RAG hardening, Google export flows (Slides/PDF), Workbench tiles (Deals/Rounds), renewal/outreach/update Playbooks polish, GB metering UI, import presets.  

- **W17–W18**: Perf/a11y/security passes; docs/runbooks; pricing/limits; launch ops prep.  

- **W19–W20**: Buffer for polish and GA readiness.

## Definition of Done (GA)

- Only Google Drive + Gmail live; **no** surprise scope creep.  

- Contracts, Decks, Accounts deliver promised flows; **Send for Signature** stable.  

- Internal Tasks and built-in Playbooks operating end-to-end.  

- Vault GB metering and per-file caps enforced with clear UI.  

- Telemetry ≥95% coverage; alerting on critical paths.  

- Security review + runbooks signed off.

---

## Post-GA Pointer (read-only during GA)

The full post-GA vision and integration plan live in [`docs/NORTH_STAR_POST_GA.md`](./NORTH_STAR_POST_GA.md).  

This section is **non-executable** during GA and exists only to keep long-range context without altering GA scope.
