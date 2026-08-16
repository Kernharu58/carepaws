# lykasAdmin — CarePaws shelter console

React + Vite + TypeScript admin panel for shelter staff and admins.

> **Build status:** delivered in slices, same as the backend. This README's "What's implemented" section tracks what's actually wired up.

## What's implemented so far

- ✅ **Foundation** — Vite + TS + Tailwind (exact §2.3 tokens) project setup, axios service layer with automatic refresh-token rotation matching the backend's short-lived-access-token scheme, AuthContext + ToastContext, role-gated routing (`ProtectedRoute`), the shared UI component library (Button, Modal, ConfirmModal, Alert, FormUI, TextArea, StatusBadge, StateDisplays, SharedUI table/pagination primitives), and `useListQuery` — one hook implementing the backend's §8.2 list-query contract, reused by every list page instead of each page reinventing fetch/pagination state.
- ✅ **Auth pages** — Login (email/password + Google OAuth), ForgotPassword, ResetPassword, VerifyEmail.
- ✅ **Dashboard** — backed by `/api/dashboard`.
- ✅ **PetManagement** — the canonical pet CRUD/detail-management screen, explicitly flagged as an empty 0-line stub in the source project. Full table view including deleted pets, soft-delete → restore → permanent-delete (role-gated to super_admin), and a search-based adopt flow.
- ✅ **AdoptionForm** — the reusable form component (`components/adoption/AdoptionForm.tsx`) and its page (`pages/AdoptionForm.tsx`), also explicitly flagged as an empty stub. Staff can search for a pet and an applicant and record a walk-in application on that applicant's behalf.
- ✅ **Adoptions** — the applications list, with a detail view (`ApplicationDetailModal`) covering status decisions (approve/reject), pipeline-stage transitions with history, a vetting-status panel that lets staff schedule an interview or home visit and submit a risk assessment inline (closing the loop — the panel used to only display vetting results with no way to create them), and internal staff notes.
- ✅ **ManagePets** — a lighter browsable gallery (cards, quick add/edit) alongside the more comprehensive PetManagement workspace.
- ⬜ Every other §7.2 page (Analytics, Adopter Profiles & Risk, Interviews/HomeVisits as standalone list pages, Document Review, Fosters, Monitoring, Health, Events, Shifts, Volunteer, Feedback, Content, Payments, Donations, Chat, Notifications, Accounts, Staff, User Verification, Shelter Management, Audit Logs, Emergency Reports, Settings) — not yet built. `App.tsx`'s router and the sidebar's `navConfig.ts` only reference pages that exist, same practice as the backend's incremental route mounting.

### A backend gap found and fixed while building this

Building `AdoptionForm` surfaced a real bug: the backend's `POST /api/applications` always set `applicant: req.user._id`, which is correct for a self-service adopter but wrong for staff recording a walk-in application on someone else's behalf. Fixed in the backend (`applicationController.js` + `application.schema.js`) to let staff optionally specify `applicant` in the request body, while regular users can never set anyone but themselves — with new backend tests covering both cases.

## Requirements

- Node.js 20+
- A running `lykasServer` backend (see that repo's README)

## Local setup

```bash
cp .env.example .env
# set VITE_API_URL to your backend, VITE_GOOGLE_CLIENT_ID if testing Google sign-in
npm install
npm run dev
```

Opens on `http://localhost:5173` by default.

## Authentication & token storage

The backend returns tokens in the JSON response body rather than httpOnly cookies, so — per §8.1's guidance to avoid localStorage for anything sensitive where possible — this app stores the **access token in memory only** (a module-level variable, cleared on every page reload) and the **refresh token in `sessionStorage`** (cleared when the tab closes, unlike `localStorage`). On load, `AuthContext` silently exchanges any refresh token still in `sessionStorage` for a fresh access token rather than forcing a re-login on every page refresh within the same tab. `services/api.ts`'s response interceptor transparently refreshes once on a 401 and retries the original request.

## Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

Vitest + `@testing-library/react`, jsdom environment. `services/api` is mocked in component tests rather than hitting a real backend — see `tests/pages/PetManagement.test.tsx` and `tests/pages/AdoptionForm.test.tsx` for the pattern. `tests/components/ProtectedRoute.test.tsx` covers the role-gating logic explicitly called out in §11.2.

**A real limitation worth stating plainly:** the sandbox this project was built in has no network access, so `npm install` has never actually been run against this code, and neither has `tsc` or `vitest`. Every file was hand-written and reviewed carefully — including a static check that every `@/...` and relative import resolves to a real file — but that's not the same as a real compile or test run. Please run `npm install && npm run build && npm test` in your own environment before treating this as verified.

## Linting

```bash
npm run lint
```

## Docker

```bash
docker build -t lykas-admin --build-arg VITE_API_URL=https://your-api .
docker run -p 4173:4173 lykas-admin
```

Multi-stage: builds the Vite bundle, then serves it with `serve`. Vite inlines `VITE_*` env vars at **build time** — they must be set when the image is built, not just when the container runs.

## Project structure

- `src/services/api.ts` — axios instance, refresh-token interceptor, shared error-envelope helpers.
- `src/context/` — `AuthContext` (session/role state), `ToastContext` (global action feedback).
- `src/components/ui/` — the shared component library every page is built from, per §7.3's "consistent pattern, not bespoke per page" instruction.
- `src/hooks/useListQuery.ts` — the one hook every list page uses for the backend's §8.2 query contract.
- `src/components/layout/navConfig.ts` — the sidebar's nav data; only lists routes that exist.
