# Helm Lite — Project Handoff

Everything needed to continue this project in a fresh chat. The **code** lives
in the GitHub repo (source of truth); this file captures the context, decisions,
accounts, and gotchas that the code alone doesn't tell you.

---

## 0. How to resume in a new chat (paste this first)

> I'm continuing work on **Helm Lite**, an internal ops app I built with you.
> It's live and finished; I'm now using it / making small changes. The full
> context is in `HANDOFF.md` at the repo root (github.com/rzr99/Helm-Lite) and
> in the local project. Read that first. The app is on my real brand
> ("Linear Solutions" — my company, not the SaaS "Linear.app"). I'm
> non-technical — explain in plain terms and confirm before destructive steps.

Local project path: `C:\Users\Zohaib Rao\Downloads\helm-lite`
The assistant also keeps auto-memory that reloads each session on this machine.

---

## 1. What Helm Lite is

An internal operations app for an **X (Twitter) outreach agency's sales floor**
(company: **Linear Solutions** — a motion/video editing agency for funded
startups). One app, per-user logins, three roles, built on Supabase + Next.js,
deployed on Vercel. Security enforced in the database (Row-Level Security), not
just hidden in the UI.

**Status: COMPLETE and LIVE.** All 6 modules + extras built, security-audited,
rebranded, and wiped to a clean slate (only the owner account remains). Building
phase is done; the owner is now entering real content.

---

## 2. Accounts, URLs, keys

| Thing | Value |
|---|---|
| Live app | https://helm-lite.vercel.app |
| GitHub repo | https://github.com/rzr99/Helm-Lite (account: **rzr99**) |
| Vercel | team **linear-solutions**, project **helm-lite**, region **hnd1 (Tokyo)** |
| Supabase project ref | **msjtebtppwnyzokdwhdb** (region: AWS ap-northeast-1 / Tokyo) |
| Supabase dashboard | https://supabase.com/dashboard/project/msjtebtppwnyzokdwhdb |
| Supabase SQL editor | …/project/msjtebtppwnyzokdwhdb/sql/new |
| Supabase Auth users | …/project/msjtebtppwnyzokdwhdb/auth/users |
| Owner login | Zohaib Rao (zohaibrao77@gmail.com), role **owner** |
| Supabase publishable/anon key | `sb_publishable_D8kJ-irdAN1pC5_dnPyKzQ_ZThDO3tV` (public-safe; in `.env.local` and the client bundle) |
| Supabase URL | https://msjtebtppwnyzokdwhdb.supabase.co |

**Never** put the Supabase **service_role/secret** key in the app — the whole
security model relies on the anon key + RLS. (It's nowhere in the codebase.)

Vercel CLI is logged in on this machine and the folder is linked, so
`npx vercel …` works. Deploys happen automatically on `git push` to `main`.

---

## 3. Tech stack

- **Next.js 16** (App Router, Server Components, Server Actions). Note: Next 16
  renamed `middleware` → **`proxy`** (`proxy.ts` at root, `export function proxy`).
- **React 19**, **TypeScript**, **Tailwind CSS v4** (config-in-CSS via `@theme`).
- **Supabase**: Postgres + Auth (email/password) + Storage. Client via
  `@supabase/ssr` (`createServerClient` / `createBrowserClient`).
- **Fonts**: Geist + Geist Mono (`next/font`, self-hosted → CSP-safe).
- Deployed on **Vercel** (Hobby plan).

---

## 4. Original build brief (as given)

Roles (enforced by RLS at the DB level):
- **owner** — everything: all modules, all agents, expenses, personas/accounts.
- **team_lead** — sales floor: all agents' CRM, daily activity, all sales &
  revenue. NOT expenses, NOT personas/accounts. (Read-only on others' data.)
- **agent** — only their own leads, follow-ups, activity, closes.

Data model (UUID PKs, RLS on every table): `users` (extends auth), `leads`,
`follow_ups`, `deals`, `daily_activity` (derived, not stored), `personas`,
`accounts` (extensible `platforms` list, card = **reference label only, never a
real card number**), `expenses`, `training_assets`.

Build order (each tested & gated before the next):
- **Gate 1** — Auth + roles + RLS, proven per-role via direct API. ✅
- **Module 1** — CRM (leads, stages, follow-ups, notes). ✅
- **Module 2** — Sales (deals, revenue by service). ✅
- **Module 3** — Daily Activity (derived counts + duplicate-handle flagging). ✅
- **Module 4** — Personas & Accounts (owner-only, extensible platforms). ✅
- **Module 5** — Expenses (owner-only). ✅
- **Module 6** — Training assets (owner writes, everyone reads). ✅

Security rules (non-negotiable): RLS on every table tested per role; never store
full card numbers or passwords; env vars for keys; service-role key never on the
client; enable 2FA on owner's Supabase + Vercel.

Do NOT build: a passwords module, full card-number storage, extra auth/storage
services or frameworks beyond the stack.

---

## 5. What got built (beyond the 6 modules)

- **Expenses reshaped** to mirror the owner's Google Sheet: sections
  (Subscription, Others, Utilities, Production, Salary, Extras), monthly
  Spending + owner-entered Closing + computed Balance. **Amounts in PKR (Rs)**;
  Sales stays in **USD ($)**.
- **Training** upgraded to rich one-page authoring: write/edit text inline,
  paste YouTube links → embed players, upload images (show inline), videos (get a
  player), docs (download links). Files in a private Storage bucket with signed
  URLs.
- **Profile pictures** — `/profile` page, public `avatars` bucket, each user
  manages only their own; a DB trigger blocks non-owners from changing role/active.
- **Team page** (owner-only) — set names, assign roles, deactivate leavers.
- **Mobile nav** — slide-out drawer (`components/mobile-nav.tsx`).
- **Security hardening** (see §8).
- **Performance** — moved Vercel functions to Tokyo (co-located with the DB).
- **Rebrand** to the real Linear Solutions system (see §7).

---

## 6. Architecture & file map

Auth gate: **`lib/profile.ts` → `requireProfile()`** — every page calls it;
returns `{ supabase, profile }` or redirects to `/login`. Blocks inactive users.
`isFloorRole(role)` = owner|team_lead.

Supabase clients: `lib/supabase/server.ts` (server components/actions),
`lib/supabase/middleware.ts` (session refresh, used by `proxy.ts`).
Shared enums/helpers: `lib/enums.ts` (stages, services, statuses, expense
categories, money formatters). Dates: `lib/dates.ts` (Asia/Karachi time).

Shared UI: `components/ui.tsx` (Card, buttons, inputs, Avatar, Diamond,
EmptyState), `components/shell.tsx` (sidebar + header + BrandMark), plus
`mobile-nav.tsx`, `avatar-upload.tsx`, `training-files.tsx`.

Routes (all under `app/`):
- `/` dashboard · `/login`
- `/leads`, `/leads/new`, `/leads/[id]` (+ `actions.ts`)
- `/sales`, `/sales/new`, `/sales/[id]` (+ `actions.ts`)
- `/activity` (floor-only, derived)
- `/personas`, `/personas/new`, `/personas/[id]`, `/personas/[id]/accounts/new`,
  `/accounts/[id]` (owner-only, + `actions.ts`)
- `/expenses`, `/expenses/[id]` (owner-only, + `actions.ts`)
- `/training`, `/training/new`, `/training/[id]`, `/training/[id]/edit`
  (+ `actions.ts`)
- `/team` (owner-only, + `actions.ts`), `/profile` (+ `actions.ts`)
- `app/actions.ts` = `signOut`

DB migrations (already applied in Supabase; kept as source-of-truth SQL):
`supabase/migrations/0001…0005`. To change the schema you run SQL in the
Supabase SQL editor (there's no automated migration pipeline).

---

## 7. Brand system — "Linear Solutions" (full kit at `E:\Linear Solutions\The Foundation\LINEAR BRAND KIT FINAL\`)

**Exactly three colours, no tints beyond opacity:**
- Ink `#0E0E0D` (canvas/background) · Warm Off-White `#F8F7F4` (type) ·
  Amber `#E87000` (the single accent — used sparingly: primary CTA, active
  state, wins/revenue). Red kept only for destructive actions.
- **Fonts:** Geist + Geist Mono only.
- **Motifs:** keyframe **diamond** (◆ amber = key / ◇ muted = default) as
  bullets, nav markers, dividers; **corner brackets** framing content; thin
  rules; **Geist-Mono tracked uppercase** section labels (e.g. "◆ 01 — PROCESS");
  **ink-dither halftone** stipple texture on the canvas.
- **Logo:** camera-frame (off-white corner brackets) + amber keyframe diamond
  (inline SVG in `shell.tsx` `BrandMark` and `login/page.tsx`).

Implementation trick: `app/globals.css` remaps Tailwind colour families in one
`@theme` block — `violet/green/amber → brand amber`, and
`sky/blue/indigo/teal/pink/etc → neutral grey` — so the whole app collapses to
the 3-colour system from a **single control point**. The ink-dither is a body
`background-image` (two offset radial-gradient dot grids). App is **dark-only**
(a light/dark toggle would be a small add). Note: the brand's raster assets
(Saturn V rocket etc.) are **low-res web exports (~919px)** — a hi-res/vector
version would be needed for large hero imagery. A rocket hero was tried on the
login and **removed** (owner didn't like it); the corner-bracket frame + section
notation stayed.

---

## 8. Security model

- **RLS on every table** (owner/team_lead/agent), proven per-role at Gate 1 and
  again post-launch (anon gets nothing on all tables).
- **`active` enforced at the DB level** (migration 0005): `is_active()` +
  RESTRICTIVE "active users only" policies on all 11 tables — a deactivated
  user's token is useless against the raw API, not just the UI.
  `requireProfile` also signs out + redirects inactive users.
- **Off-boarding rule:** deactivate on the Team page (instant app lockout,
  reversible) AND delete their login in Supabase → Auth → Users for full removal.
- **CSP + security headers** in `next.config.ts` (`headers()`): images/network
  limited to self + Supabase, frames to YouTube-nocookie, `frame-ancestors none`,
  X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
- **Session refresh** via `proxy.ts` (keeps people logged in mid-shift).
- Card fields are **reference labels only** — a server-side guard rejects
  anything that looks like a full card number.
- Profile self-edits **cannot** change role/active (DB trigger).
- **TODO for owner:** turn on **2FA** on the Supabase and Vercel accounts.

---

## 9. Common tasks / how-to

**Run locally:** `npm --prefix "…/helm-lite" run dev` (or `run build` then
`run start`). `.env.local` holds the Supabase URL + anon key.

**Deploy:** just `git push` to `main` (Vercel auto-builds). Or `npx vercel …`.

**Add a teammate:** Supabase → Auth → Users → Add user → Create new user (email +
password, Auto Confirm on). Then in the app's **Team** page set their name + role.

**Remove a teammate:** Team page → untick Active (instant lockout) AND/OR
Supabase → Auth → Users → ⋮ → Delete user (full removal).

**Change the schema / run SQL:** Supabase → SQL Editor → New query → paste → Run.
(This is how the owner applies migrations — they paste the SQL and click Run,
because the assistant often can't drive the dashboard, see §10.)

**Wipe data / reset:** truncate the content tables + delete non-owner users (see
the migrations/handoff history for the exact SQL). Already done once — the app is
currently empty with only the owner.

---

## 10. Environment gotchas (important for the assistant)

- **PowerShell 5.1 prepends a UTF-8 BOM** when piping strings into files/CLIs
  (corrupted `vercel env` values once). Use `cmd /c "… < file"` with an ASCII
  file, or write files with `-Encoding Ascii`.
- **Supabase dashboard won't render for the browser tools when its window is
  hidden/minimized** (it's an SPA that stops drawing when backgrounded), and the
  **Claude-in-Chrome extension is blocked from *.vercel.app** domains. Net effect:
  the assistant usually **can't drive the Supabase dashboard** — so DB changes are
  delivered as **SQL for the owner to paste + Run**, and Auth user changes are
  done by the owner clicking in the dashboard.
- The in-app **preview browser's screenshot** was flaky/timing-out — visual
  design review was done via **the owner pasting screenshots**.
- **Next 16**: `middleware` is deprecated → use `proxy.ts` / `export function
  proxy`. The repo's `AGENTS.md` warns the Next version differs from training data.
- **Windows line-endings**: git shows `LF will be replaced by CRLF` warnings —
  harmless.
- Dev server **port 3000** can be held by a stale `next start`; kill it if a new
  start fails.

---

## 11. Current state & possible next steps

**State:** Live, complete, secured, on-brand. Database **empty**; **only the
owner** (Zohaib Rao) exists. Owner is entering real content now.

**Outstanding niceties (optional, if asked):**
- Friendlier inline validation errors (some failed saves show a generic error
  page instead of a nice message).
- Literal "reply" tracking (Activity currently maps "replies" → follow-ups logged).
- A light/dark theme toggle (app is dark-only).
- Hi-res/vector brand imagery for hero moments.
- Importing the owner's historical expense-sheet rows.
- Carrying the brand motifs deeper (corner brackets on more cards, section
  notation labels, timeline dividers).

Building is **done**. Next real work is content + any small tweaks that surface
from daily use.
