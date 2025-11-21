# Monolyth — NORTH_STAR (v2025-11-20)

## 1. Vision

Monolyth is the **document-first business OS** for founders and small teams.

It connects all your important documents, automates the boring workflow glue around them, and gives you one AI operator — **Mono** — that knows what’s happening across your business.

**Tagline:**  
> **Monolyth – All your docs. One brain.**

If you plug in your current doc mess (contracts, decks, PDFs, share links), Monolyth should feel like you suddenly hired a sharp operations person who:
- Knows where every important doc lives.
- Remembers what’s been done with it.
- Nudges you on what needs to happen next.

---

## 2. Who Monolyth is For

- Solo founders and lean teams who run their business out of Google Docs/Drive, PDFs, slides, and links.
- SMBs drowning in contracts, proposals, and updates with no real system.
- People who hate juggling 5–7 tools just to get a contract drafted, signed, shared, and tracked.

Monolyth is **not** an enterprise ECM or a generic note-taking app. It’s a **doc-first task organizer** aimed at small teams that want leverage, not bureaucracy.

---

## 3. Core Job To Be Done

> “Show me everything that matters across my documents,  
> help me get the next steps done automatically,  
> and keep track of who did what, when.”

In plain terms:
- One pane of glass for your important docs and their status.
- Smart workflows that move documents along without you micro-managing them.
- A trustworthy log and analytics layer so you aren’t flying blind.

---

## 4. Product Pillars (What We Actually Ship)

1. **Vault** – The source of truth for docs  
   - Stores Monolyth-native docs and references to external docs (Google Drive, etc.).  
   - Holds metadata: type, status, owner, tags, last activity.  
   - **Semantic index is Vault-only** at first for safety and simplicity.

2. **Builder** – AI document builder  
   - Uses templates + Mono to draft and refine contracts and later decks/statements.  
   - Beta: contracts only (NDAs, MSAs, etc.).  
   - GA: contracts + decks + statements + bundles (“new hire packet”, “fundraising packet”).  

3. **Workbench** – Single pane of glass  
   - Unified table view across Vault + connected sources.  
   - Lets you filter by source, status, owner, and last activity.  
   - First place you go to find a doc, run analysis, or kick off a workflow.

4. **Playbooks** – Automation layer  
   - Deterministic workflow engine: **triggers + conditions + actions**.  
   - Automates recurrent document workflows (NDAs, proposals, approvals, follow-ups).  
   - Mono helps design and explain Playbooks, but **users always approve and enable them**.

5. **Share + Signatures** – External surface area  
   - Share Center for secure share links with permissions, protection, and expiries.  
   - E-signatures built on Documenso.  
   - GA: Guest Spaces + Smart Share Page so external guests see everything relevant in one place.

6. **Insights + Activity** – Brain telemetry  
   - Activity Log records every meaningful event (generate, analyze, share, sign, playbook run, Mono query).  
   - Insights dashboards show time saved, bottlenecks, and risky docs or workflows.

7. **Mono (AI Operator)**  
   - Lives in a right-hand pane plus global “Ask Mono” entrypoint.  
   - Always page-aware: knows whether you’re in Vault, Builder, Playbooks, Share, or Activity.  
   - Can:
     - Organize docs and tasks.  
     - Analyze and summarize docs.  
     - Draft Playbooks and documents.  
     - Explain what the Activity Log is telling you.  
   - **Mono is a copilot, not an autonomous agent.**  
     - It proposes drafts and optimizations.  
     - You approve changes to Playbooks, permissions, and critical workflows.

---

## 5. Navigation & Information Architecture

Sidebar (GA baseline):

- Dashboard  
- Workbench  
- Builder  
- Playbooks  
- Vault  
- Share  
- Signatures  
- Integrations  
- Insights  
- Activity  
- Calendar  
- Tasks  
- Settings  

Conceptual groupings:

- **Workspace:** Dashboard, Workbench, Builder, Vault.  
- **Automation:** Playbooks, Tasks, Calendar.  
- **Collaboration:** Share, Signatures.  
- **Ops:** Insights, Activity, Settings, Integrations.

Rule: every feature should clearly support one of those groups; if it doesn’t, it probably doesn’t belong in the core product.

### Week 5 Product Shape

At the end of Week 5, Monolyth has a **new UI shell** with:

- **Sidebar + TopBar + Mono Pane**: Bolt-inspired design system with consistent navigation, theme toggle, and Mono assistant accessible on all core pages.
- **Core Routes**: Dashboard, Workbench, Builder, Vault, Playbooks, Share, Activity, Settings — all with consistent layout and Mono integration.
- **Golden Path**: Workbench → Analyze → Builder → Save to Vault → Share → Activity. This flow is wired end-to-end with ActivityLog tracking.
- **Status**: Beta wiring is live. Playbooks, Share, and Activity pages exist in the shell with typed mock data and activity logging. Mono pane is mounted on all core pages with `/api/mono` stub route that logs queries.

**Mono Operator Positioning**: Mono sits on top of all core modules:
- **Workbench**: Analyzes documents, suggests actions, organizes the unified table.
- **Builder**: Helps draft contracts, suggests clauses, reviews generated content.
- **Vault**: Explains document status, suggests organization, identifies gaps.
- **Playbooks**: Designs automation workflows, explains triggers and actions.
- **Share**: Suggests permissions and protections, explains link usage.
- **Activity**: Interprets audit trails, identifies patterns, answers "what happened?" questions.

---

## 6. Release Targets

### Beta (Week 6)

- Core promise: **"All your docs. One brain — for contracts."**  
- Must-have modules:
  - ✅ Vault v1 (contracts + key docs) — **Week 5: Live, docs appear after Save to Vault**.  
  - ✅ Builder v1 (contracts only) — **Week 5: Live, generates contracts, saves to Vault**.  
  - ✅ Workbench v1 (single pane of glass) — **Week 5: Live, unified table with Analyze**.  
  - ✅ Share Center v1 — **Week 5: Shell + mock data, UI ready**.  
  - ⏳ Signatures via Documenso — **Week 5: UI shell exists, integration pending**.  
  - ✅ Activity Log v1 (key events and filters) — **Week 5: Live, tracks analyze_completed, doc_generated, doc_saved_to_vault, mono_query**.  
  - ✅ Mono v1 (context-aware assistant on main pages) — **Week 5: Pane mounted on all pages, /api/mono stub + logging**.  
  - ⏳ Playbooks v1 (limited automations for NDAs/proposals with prebuilt recipes) — **Week 5: Shell + mock data, engine pending**.

- Connectors:
  - ⏳ Google Drive (read) — **Week 5: Base wiring exists, needs hardening**.  
  - ⏳ Documenso — **Week 5: Integration pending**.

- Stability:
  - ✅ "Generate → Save to Vault" — **Week 5: Working end-to-end**.  
  - ⏳ "Share → Sign" — **Week 5: Share UI ready, Sign pending**.  
  - ✅ ActivityLog records entire flow — **Week 5: Live for core events**.

### GA (Week 15)

- Core promise: **“Document-first business task organizer with Mono acting as your operator.”**  
- Builder supports contracts, decks, and statements plus bundled flows.  
- Playbooks engine fully usable for common business workflows.  
- Smart Share Page and simple Guest Spaces live.  
- Insights dashboards exist and don’t lie.  
- Connectors stable enough that Drive-heavy users can rely on them daily.  
- Pricing and plan caps implemented in code.

---

## 7. Pricing & Free Plan (Direction)

- Plans: **Free, Starter, Pro, Team** with prices:  
  - Free — $0  
  - Starter — $30/seat/month  
  - Pro — $60/seat/month  
  - Team — $200/month for 3 seats (+$50/additional seat)  
  - ~20% discount on annual.

Free plan is tuned for **virality**, not generosity:
- 2 built-in playbooks/week, 1 rebuild/week.  
- 10 active share links.  
- 30 AI actions/month.  
- Limited Vault docs and short Activity history.

Everything above Free is about:
- More docs  
- More automations  
- More AI  
- Longer history and more seats.

---

## 8. Non-Goals (Next 12–18 Months)

- No heavy enterprise ECM or rigid DMS features.  
- No generic chat-over-everything agent that automatically rewires workflows.  
- No “yet another wiki” – focus on **documents that move money or risk** (contracts, proposals, board packs, investor updates).  
- No sprawling marketplace before core flows are solid.

---

## 9. Definition of “Win” for This Phase

By GA (Week 15):

- 5–10 active teams using Monolyth weekly for real contract/proposal flows.  
- At least 2–3 workflows where Playbooks + Mono demonstrably save **hours/week**.  
- Clear usage patterns to justify going deeper on:
  - Playbooks (automation),  
  - Share/Guest Spaces (external workflows),  
  - or both.

If founders and small teams can say:

> “I finally know what’s happening across all my docs, and I don’t have to search other apps or chase people for next steps,”

then this North Star is on track.
