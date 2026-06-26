@AGENTS.md

# TESTÀRE CRM

Piattaforma di gestione per società di calcio. TESTÀRE è il partner informatico;
ogni società sportiva (Torino FC, Empoli FC) è un **cliente**.

## Architettura
- **Next.js 16** (App Router, Turbopack), TypeScript, Tailwind v4.
- `lib/types.ts` — modello dati condiviso. Tutte le entità sono collegate via ID
  (atleta → carico / area-medica / test / eventi). Principio: **tutto si parla**.
- `lib/clients.ts` — anagrafica clienti + palette colori per il branding.
- `lib/data.ts` — dati mock deterministici + API di accesso (`getAthletes`, `getLoad`,
  `getClientStats`, ...). Da sostituire con un DB vero mantenendo le stesse funzioni.
- `lib/nav.ts` — elenco e ordine delle sezioni del cliente.
- `components/BrandScope.tsx` — imposta le variabili CSS `--brand-*` sui colori del
  cliente; tutto ciò che usa le classi `brand-*` si rebrandizza da solo.
- `components/Sidebar.tsx` — menu contestuale: globale (Dashboard + clienti) oppure
  per-cliente (sezioni brandizzate).

## Routing
- `/` — Dashboard globale (tutti i clienti).
- `/clienti/[clientId]` — panoramica cliente (hub verso le sezioni).
- `/clienti/[clientId]/rosa` + `/rosa/[athleteId]` — lista per reparto (foto) + scheda
  atleta (anagrafica, antropometria, panoramica con KPI radar 0–100).
- `/clienti/[clientId]/calendario` — griglia 30 giorni, eventi AM/PM, 7 tipi di seduta,
  assegnazione squadra/gruppo (vedi `lib/sessions.ts`).
- `/clienti/[clientId]/area-tecnica` — gruppo con `/campo-live`, `/esercitazioni`, `/template`.
  Campo Live è un editor SVG interattivo: salva un `Exercise` (domain `tattico`) con `drill`
  in localStorage → appare in Esercitazioni.
- Altre: `/area-medica`, `/carico` (GPS+HR), `/rd-data-analysis`, `/test`, `/importa-dati`.

## Stato lato client
`lib/store.ts` (`useLocalCollection`) persiste in localStorage le entità CREATE dall'utente
(atleti, eventi, esercitazioni da Campo Live), merge-ate con i dati seed server. Chiavi:
`athletes:<id>`, `events:<id>`, `drills:<id>`. Diventeranno chiamate API col DB.

## KPI atleta
`Athlete.kpi` = { forza, potenza, reattività, simmetria } 0–100, derivate (mock) dai test in
`lib/data.ts`. La mappatura test→KPI definitiva la fornisce l'utente.

## Branding
Colori in `CLIENTS[].colors`. Per brandizzare una nuova area, usare le classi
`brand-bg`, `brand-text`, `brand-soft-bg`, `brand-accent-text` (NON colori hardcoded).

## Convenzioni
- Pagine sezione = Server Component `async`; `params` è una `Promise` (Next 16).
- Usare i componenti in `components/ui.tsx` (PageHeader, StatCard, Panel, Badge, CrossLink).
- Aggiungere una sezione: voce in `lib/nav.ts` + cartella in `app/clienti/[clientId]/<slug>/`.
