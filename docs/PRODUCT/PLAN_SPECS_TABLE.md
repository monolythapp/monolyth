# Monolyth — GA (20-week, frozen) — Full Product Spec — v2025-11-27

| Area | GA Capabilities (final) | Default Workflows & AI | Guardrails / Notes |
|---|---|---|---|
| **Who/Focus** | Early-stage founders (0–20 ppl) on **Google Workspace** | Contracts, decks, investor snapshots in one place; Mono assists end-to-end | Scope is frozen until GA |
| **Navigation** | **Dashboard · Workbench · Builder · Vault · Playbooks · Share · Integrations · Insights · Settings** | Global "Ask Mono"; consistent CTAs (Analyze · Share · Sign) | No external Task/Calendar sync at GA |
| **Dashboard** | **Recent Activity**, **Open Tasks**, **Active Deals/Rounds** tiles, **Mono panel** ("What should I focus on?") | Mono: daily focus, weekly summary, anomalies | First-run CTA: Connect Google + Import scope |
| **Workbench** | Home screen view of docs + tasks; filters (Type/Status/Deal/Round), bulk actions, quick backfill (YTD/12m) | Mono flags "Needs attention" (sent/not viewed, expiring, stale), creates follow-ups | Metadata-first; fetch content on Preview/Save/Sign only |
| **Vault** | Stores Builder outputs + selected Drive/Gmail files; types (contract/deck/statement/other), parties, key dates, amounts, status, links, **Deal/Round** tag | Vault is **RAG** source for Mono & Builders; versioning + diffs | Semantic search **Vault only**; external refs remain keyword |
| **Builder — Contracts (Hero)** | Templates: NDA, MSA/Service, SOW/Work Order, Contractor; clause library; structured editor; compare versions | Mono: explain clauses, suggest terms, compare drafts; **Send for signature**; Playbook: on sign → store executed + create renewal task | Opinionated defaults; clear diff/track changes |
| **Builder — Decks (B+)** | **Fundraising Deck**, **Investor Update Deck**; AI outline → Google-friendly export (Slides/PDF) | Mono: rewrite for clarity/tone; align story with latest metrics (RAG) | Only these two flows at GA |
| **Builder — Accounts (B+)** | **SaaS Financial Pack** (basic P&L, runway), **Investor Snapshot** (MRR/ARR, growth, burn, runway, LTV/CAC if provided) | Inputs: CSV (GA), manual entry; Mono explains trends & flags inconsistencies vs prior | Google Sheets ingest **post-GA** |
| **Tasks (Internal)** | First-class **Monolyth tasks** (title, due, status, linked docs) shown in Dashboard/Workbench | Created mainly by Playbooks (renewals, outreach, updates); optional email reminders | **No** Google Tasks/Calendar sync at GA |
| **Playbooks v1 (Built-ins only)** | Deterministic: triggers (contract signed/generated), actions (create task, store executed, notify), read Vault metadata/RAG | Built-ins: **Signed → Renewal Task**, **Fundraising Deck → Outreach Task**, **Snapshot → Update Task** | User-authored Playbooks & marketplace **post-GA** |
| **Share & Sign** | Create secure links; send for signature (Documenso); track sent/viewed/signed | Playbooks: on send → follow-up task; on sign → renewal task | No Guest Spaces/Smart Share Page at GA |
| **Integrations (GA-live)** | **Google Drive** (select folders, import docs/slides/PDFs), **Gmail** (recent attachments & links) | Maintain metadata to link originals; trigger Playbooks | Slack/Notion/OneDrive/Calendar/Tasks = **post-GA** ("Coming Soon" in UI) |
| **AI/Vendors** | **OpenAI only** (Mono, all Builders, summaries); Google APIs for Slides/PDF export | Mono Memory (tone/risk/jurisdiction/locale) loads per request; template usage logged | No multi-vendor LLM routing at GA |
| **RAG** | Vault + selected Google imports chunked/embedded | Grounds contract advice; reuses language/numbers; cross-checks decks vs snapshots | Private by org; explainability + undo for AI actions |
| **Import policy** | YTD default; presets 12m/36m/custom; metadata-first; Drive/Gmail content copied to Vault only when user confirms | GB impact preview before copy; filters (attachments/known types) | Skip promos; throttle massive backfills |
| **Storage model** | **Meter by Vault GB**; only stored bytes count; per-file caps; versions with diffs | Cleanup: prune versions; convert to reference | Heavy media = reference-only |
| **Insights** | Activity timeline; simple dashboards (sent/viewed/signed, tasks due/completed); CSV export | Weekly summary email; anomaly hints (e.g., stale sent docs) | Keep lean; deep analytics post-GA |
| **Security** | Least-privilege scopes; audit log for share/sign/task/playbook; watermarks; redaction; org RLS | "Why this?" on AI; undo for AI/automation | GA security pass & runbooks |

