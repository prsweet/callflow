# (always read this in full) This is a readme file for you to get the context of what is happening and you have to act accordingly and you have to make sure that you are following the instructions properly and most important thing you cannot make any edits to the code only i will do that you just have to tell me what to do...

# AI Call Routing System — Project Context

## 📌 Project Idea

**Problem**: Rural areas and small business owners use a single phone number for everything — business, personal, staff coordination. If they have staff, they have to manually forward calls.

**Solution**: An AI-powered call routing system that:
1. Answers calls on a single main business number
2. AI agent listens and classifies intent → Sales / Service / Customer Support
3. Routes the call to the right employee via an app
4. Employees receive **anonymous calls** (no customer number visible), can save chat/notes
5. Call transcripts appear as chat threads
6. Each employee sees only their own chats; can forward with a mandatory reason
7. Admin/Owner has a dashboard: all calls, categories, conversion tracking, employee oversight

---

## 🛠 Tech Stack (Decided)

| Layer | Tech | Why |
|---|---|---|
| **Runtime/Pkg Manager** | Bun | 
| **Language** | TypeScript | 
| **Styling** | TailwindCSS | 
| **Telephony** | Twilio (free trial $15 credit) |
| **AI Agent** | Groq API (free tier) or Gemini | 
| **Transcription** | Deepgram (free 200hrs) or Whisper | Accurate STT |
| **Backend** | Elysia (Bun) | User already knows it, fast, type-safe |
| **ORM** | Prisma | Type-safe DB queries + migrations |
| **Database** | Neon (Postgres) | Free tier, clean Prisma integration, no pooler issues |
| **Auth** | Manual (JWT + bcrypt) | Full control, no vendor lock-in |
| **Realtime** | Elysia WebSockets | Built-in WS support, no external dependency |
| **Frontend** | React (Vite) | Lightweight SPA, no SSR overhead |
| **Charts** | Recharts | React charting library |
| **Hosting** | Vercel (frontend) + Railway/Render (backend) | Free tiers |

---

## 🗓 15-Day Plan

### Days 1–2: Foundation & Research
- [x] Set up accounts: Twilio, Neon, Groq/Gemini, Vercel
- [x] Initialize Vite (React) + Elysia (Bun) project
- [x] Design database schema (Prisma)
- [x] Run Prisma migration on Neon
- [x] Set up manual auth (JWT + bcrypt) — signup, login, JWT middleware built

### Days 3–5: AI Call Routing Agent
- [x] Twilio webhook → server receives call (using cloudflared)
- [ ] AI classifies intent (sales/service/support)
- [ ] Route call to correct employee group
- [ ] Handle edge cases (no available employee, unknown intent)

### Days 6–8: Employee App (PWA)
- [ ] Auth system (role-based: employee vs admin)
- [ ] Receive call notifications
- [ ] Anonymous call display (Customer #ID)
- [ ] Call history (own calls only)

### Days 9–11: Chat/Transcript System
- [ ] Post-call transcription
- [ ] Chat-like transcript view
- [ ] Employee notes/tags on calls
- [ ] Forward call with reason (stored in DB)

### Days 12–13: Admin Dashboard
- [ ] View all calls + employee activity
- [ ] Filter by category
- [ ] Metrics: total calls, per category, conversion rate
- [ ] Forwarding history with reasons

### Days 14–15: Polish & Demo
- [ ] End-to-end testing
- [ ] Bug fixes, UI polish
- [ ] Demo video recording
- [ ] README + architecture documentation

---

## 🔀 Changes Log

| Date | Change | Reason |
|---|---|---|
| 2026-03-27 | Project started | Initial setup |
| 2026-03-27 | Guide-only mode | AI guides, user writes all code themselves for learning |
| 2026-03-27 | Bun + TS + Tailwind | Switched to Bun runtime, TypeScript, TailwindCSS |
| 2026-03-27 | React basics confirmed | User knows components, useState, useEffect, props — enough for this project |
| 2026-03-27 | Next.js initialized | Project at `ai-call-routing-system/` — TS, Tailwind, App Router, Turbopack |
| 2026-03-27 | Prisma over raw SQL | Using Prisma ORM for type-safe queries + migrations; Supabase still used for Auth + Realtime |
| 2026-03-27 | Teaching approach | Guide-and-review style — explain WHY, user writes code, AI reviews |
| 2026-04-01 | Telephony provider confirmed | Sticking with Twilio for ease of use and quick integration (free trial) |
| 2026-04-05 | Dropped Next.js | Switched to Vite (React) frontend + Elysia (Bun) backend — user knows Elysia, no SSR/SEO needed |
| 2026-04-06 | Switched to Neon | Dropped Supabase — simpler Prisma setup, no pooler issues. Auth handled manually, WebSockets for realtime. |

> **Project Path**: `/Users/hello/Desktop/PCode/Projects/callflow/`
> - Frontend: `callflow/frontend/`
> - Backend: `callflow/backend/`

---

## 💡 Decisions Made

1. **PWA over native app** — No money for app store fees, works on all devices
2. **Neon over Supabase** — Simpler Prisma integration, no pooler/direct URL mess. Auth + Realtime handled manually.
3. **Vite + Elysia** — Separate frontend/backend. User knows Elysia. No SSR/SEO needed (internal app).
4. **Anonymous calls** — Employees see Customer #ID, never the real phone number
5. **Prisma** — Type-safe ORM, works with Neon Postgres
7. **Elysia WebSockets** — Native WS support for realtime call notifications
8. **Conversational AI Loop** — AI acts as an IVR bot, asking clarifying questions until it has enough context to route the call, rather than relying on a single speech input.

---

## 🏗 Architecture

```
Customer Call → Twilio Number
                    │
                    ▼ (webhook)
              Elysia Backend (Bun)
                    │
                    ▼
              AI Agent (Groq/Gemini)
              classifies intent
                    │
            ┌───────┼───────┐
            ▼       ▼       ▼
          Sales  Service  Support
            │       │       │
            ▼       ▼       ▼
        React App / PWA (anonymous call + transcript)
                    │
                    ▼
          Prisma → Neon Postgres (calls, transcripts, analytics)
                    │
                    ▼
            Admin Dashboard (owner view)
```

### Folder Structure
```
callflow/
├── frontend/          # Vite + React + TS + Tailwind
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── App.tsx
│   └── package.json
├── backend/           # Elysia + Bun + Prisma
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── lib/
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
└── README.md
```
