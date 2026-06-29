// ============================================================================
// Letteratura · Prognosi — riferimento clinico EBM per lo staff medico.
// Per gli infortuni più comuni nel calcio maschile élite: RACCOMANDAZIONI di
// rientro (criteri, protocolli) in testata + BENCHMARK osservato (cosa aspettarsi)
// come riferimento. Ogni voce porta FONTE + LIVELLO DI EVIDENZA.
//
// ⚠ Tutti i contenuti derivano da una ricerca EBM verificata (deep-research con
// verifica avversariale). NON includere numeri non verificati. I tempi UEFA sono
// MEDIANE OSSERVATE in club élite, NON target clinici: il rientro è per CRITERI,
// non per calendario (Bern 2016; Panther 2020). Modulo PURO (no import server).
// ============================================================================

/** alta = consensus/coorte di prima fascia · media = review con certezza moderata/single-club ·
 *  principi = nessuna soglia validata, solo principi generali. */
export type Tier = "alta" | "media" | "principi";

export interface Source {
  label: string; // citazione breve
  year: number;
  kind: string; // tipo di studio/documento
  ref?: string; // PMID/DOI per il link
}

export interface PrognosisEntry {
  id: string;
  name: string;
  region: string;
  category: "Muscolare" | "Legamentosa" | "Articolare" | "Commozione";
  /** Epidemiologia (frequenza/burden) — solo dove verificata. */
  frequency?: string;
  /** Cosa aspettarsi: tempi OSSERVATI (non target). */
  benchmark: {
    headline: string; // es. "13 gg (mediana)"
    sub?: string; // es. "media 18 gg · funzionale ~5 gg"
    byGrade?: { grade: string; days: string; note?: string }[];
    tier: Tier;
    source: Source;
    note?: string;
  };
  /** Raccomandazioni di rientro: criteri e/o protocollo a tappe. */
  recommendation: {
    approach: string; // sintesi dell'approccio
    criteria: string[]; // traguardi da soddisfare
    protocol?: { stage: string; detail: string }[]; // protocollo a tappe (es. commozione)
    minTime?: string; // tempo minimo raccomandato (es. LCA ~9 mesi)
    qualitativeOnly?: boolean; // nessuna soglia numerica validata
    tier: Tier;
    sources: Source[];
  };
  /** Classificazione clinica (definisce i gradi, non i giorni). */
  classification?: string;
  caveats: string[];
}

// ---- Fonti riusabili -------------------------------------------------------
const UEFA2020: Source = { label: "Ekstrand et al. — UEFA Elite Club Injury Study (16 anni, 22.942 infortuni)", year: 2020, kind: "Coorte prospettica · calcio maschile élite", ref: "PMID 31182429" };
const UEFA2012: Source = { label: "Ekstrand et al. — UEFA ECIS, 516 lesioni flessori (grado MRI)", year: 2012, kind: "Coorte prospettica + classificazione MRI", ref: "PMID 22144005" };
const BAMIC2021: Source = { label: "Vermeulen/Shamji et al. — BAMIC e rientro nel calcio élite", year: 2021, kind: "Coorte retrospettiva single-club", ref: "PMC8112435" };
const PANTHER2020: Source = { label: "Meredith et al. — Panther Symposium ACL Return-to-Sport Consensus", year: 2020, kind: "Consensus internazionale (Delphi)", ref: "DOI 10.1177/2325967120930829" };
const GRINDEM2016: Source = { label: "Grindem et al. — Delaware-Oslo ACL cohort", year: 2016, kind: "Coorte prospettica (base dei criteri LCA)", ref: "PMC4912389" };
const AMSTERDAM2023: Source = { label: "Patricios et al. — Consensus commozione nello sport, Amsterdam 2022 (CISG)", year: 2023, kind: "Consensus internazionale", ref: "PMID 37316210" };
const BERN2016: Source = { label: "Ardern et al. — Consensus Return-to-Sport, Berna", year: 2016, kind: "Consensus internazionale", ref: "BJSM 2016;50:853" };
const COSTA2026: Source = { label: "Costa et al. — Criteri di rientro dopo lesioni muscolari arti inferiori nel calcio", year: 2026, kind: "Revisione sistematica (135 studi) calcio-specifica", ref: "PMID 41851593" };
const DOHA2015: Source = { label: "Weir et al. — Doha agreement (terminologia pubalgia)", year: 2015, kind: "Consensus (solo terminologia, NO criteri RTP)", ref: "PMC4484366" };
const ZHANG2024: Source = { label: "Zhang et al. — Time course del rischio dopo il rientro (Bundesliga)", year: 2024, kind: "Coorte osservazionale · calcio", ref: "Sports Med 55(1):193" };
const WERNER2019: Source = { label: "Werner et al. — UEFA ECIS, anca/inguine 15 anni", year: 2019, kind: "Coorte prospettica · calcio maschile élite", ref: "PMID 29691289" };

/** Finestra di re-infortunio condivisa (Zhang 2024). */
export const REINJURY_WINDOW =
  "Rischio di nuovo infortunio ~2× nel periodo subito dopo il rientro, che si dimezza in ~4 settimane — ma solo per infortuni lievi/moderati; i gravi restano elevati più a lungo. Definire una finestra di monitoraggio post-rientro.";

/** Cornice trasversale obbligatoria (Bern 2016 · Panther 2020). */
export const RTP_FRAMING = [
  "I tempi qui sotto sono MEDIANE OSSERVATE in club élite con assistenza ottimale: riferimenti di prognosi, NON target clinici.",
  "Il rientro va deciso PER CRITERI, non per calendario: il consensus moderno raccomanda di abbandonare la clearance basata solo sul tempo.",
  "La variabilità individuale è ampia (il grado spiega meno di 1/3 del recupero): ragionare per intervalli, non per numero secco.",
  "Riferimento educativo: non sostituisce il giudizio clinico né la valutazione del singolo caso.",
];

export const TIER_META: Record<Tier, { label: string; short: string; color: string }> = {
  alta: { label: "Evidenza di prima fascia", short: "Prima fascia", color: "#16a34a" },
  media: { label: "Evidenza moderata / single-club", short: "Moderata", color: "#d97706" },
  principi: { label: "Principi generali (nessuna soglia validata)", short: "Principi generali", color: "#64748b" },
};

export const CATEGORY_ICON: Record<PrognosisEntry["category"], string> = {
  Muscolare: "dumbbell",
  Legamentosa: "pulse",
  Articolare: "target",
  Commozione: "medical",
};

// ---- Dataset ---------------------------------------------------------------
export const PROGNOSIS: PrognosisEntry[] = [
  {
    id: "hamstring",
    name: "Lesione dei flessori (hamstring)",
    region: "Coscia posteriore",
    category: "Muscolare",
    frequency: "L'infortunio più frequente nel calcio élite.",
    benchmark: {
      headline: "13 gg (mediana)",
      sub: "media 18 gg · funzionale ~5 gg · strutturale 13 gg",
      byGrade: [
        { grade: "Grado 0 (MRI negativa)", days: "~8 gg" },
        { grade: "Grado 1 (solo edema)", days: "~17 gg" },
        { grade: "Grado 2 (lesione parziale)", days: "~22 gg" },
        { grade: "Grado 3 ((sub)totale)", days: "~73 gg", note: "n piccolo, ampia variabilità" },
      ],
      tier: "alta",
      source: UEFA2012,
      note: "Grado MRI (Peetrons modificata). Il coinvolgimento del tendine intramuscolare ('c' in BAMIC) allunga in modo marcato il rientro (BAMIC 2c ~37 gg).",
    },
    recommendation: {
      approach: "Criteri-based. Rientro quando i traguardi oggettivi sono soddisfatti, non a un giorno fisso.",
      criteria: [
        "Range of motion completo e indolore — massima certezza di evidenza (active knee extension, straight leg raise, Askling H-test)",
        "Simmetria di forza tra arti dei flessori/estensori del ginocchio",
        "Assenza di dolore durante gesti calcio-specifici (sprint, cambi di direzione)",
        "Prontezza soggettiva dell'atleta",
      ],
      tier: "alta",
      sources: [COSTA2026, BAMIC2021],
    },
    classification: "BAMIC (gradi 0–4 + sito a/b/c) e Munich (funzionale 1–2 vs strutturale 3–4): definiscono il grado, non i giorni.",
    caveats: [
      "La simmetria di forza è il criterio più usato ma di evidenza più debole rispetto a ROM e prontezza soggettiva.",
      "Le lesioni con interessamento tendineo ('c') hanno rientro più lungo e maggior rischio: maggiore cautela.",
    ],
  },
  {
    id: "adductor",
    name: "Lesione adduttori / inguine",
    region: "Inguine",
    category: "Muscolare",
    frequency: "Anca/inguine = ~14% degli infortuni; gli adduttori ne sono il 63% (Werner 2019).",
    benchmark: {
      headline: "8 gg (mediana)",
      sub: "media 13,5 gg · dolore inguinale aggregato",
      tier: "alta",
      source: UEFA2020,
    },
    recommendation: {
      approach: "Criteri-based qualitativi (nessuna soglia numerica validata).",
      criteria: [
        "Valutazione del dolore (evidenza moderata)",
        "Completamento di almeno una seduta intera con la squadra",
      ],
      qualitativeOnly: true,
      tier: "media",
      sources: [COSTA2026, WERNER2019],
    },
    classification: "Doha agreement (2015): definisce SOLO la terminologia della pubalgia — non fornisce criteri di rientro né protocolli.",
    caveats: [
      "Il Doha agreement è esplicitamente terminologia, non uno standard di cura.",
      "Nessuna soglia di forza/LSI validata per il rientro.",
    ],
  },
  {
    id: "quadriceps",
    name: "Lesione del quadricipite",
    region: "Coscia anteriore",
    category: "Muscolare",
    benchmark: {
      headline: "13 gg (mediana)",
      sub: "media 19,5 gg · lesione strutturale",
      tier: "alta",
      source: UEFA2020,
    },
    recommendation: {
      approach: "Solo principi generali — nessuna soglia oggettiva validata (evidenza da bassa a molto bassa).",
      criteria: [
        "Corsa indolore",
        "Assenza di dolore riferito dall'atleta",
        "Completamento di una seduta completa",
      ],
      qualitativeOnly: true,
      tier: "principi",
      sources: [COSTA2026],
    },
    caveats: ["Nessun RCT di alta qualità sui criteri di rientro: ragionare per principi generali e giudizio clinico."],
  },
  {
    id: "calf",
    name: "Lesione del polpaccio (gastrocnemio/soleo)",
    region: "Gamba posteriore",
    category: "Muscolare",
    benchmark: {
      headline: "13 gg (mediana)",
      sub: "media 17,4 gg · lesione strutturale",
      tier: "alta",
      source: UEFA2020,
    },
    recommendation: {
      approach: "Solo principi generali — nessuna linea guida universale basata su grading o imaging.",
      criteria: [
        "Funzione indolore e progressione del carico tollerata",
        "Completamento di una seduta completa",
      ],
      qualitativeOnly: true,
      tier: "principi",
      sources: [COSTA2026],
    },
    caveats: ["Evidenza da bassa a molto bassa: nessuna soglia validata."],
  },
  {
    id: "ankle-lateral",
    name: "Distorsione di caviglia (legamento laterale)",
    region: "Caviglia",
    category: "Legamentosa",
    benchmark: {
      headline: "8 gg (mediana)",
      sub: "media 14,9 gg · complessivo, NON per grado",
      tier: "alta",
      source: UEFA2020,
    },
    recommendation: {
      approach: "Principi generali di rientro per criteri (nessun criterio specifico di prima fascia nel set verificato).",
      criteria: [
        "Funzione e appoggio indolori",
        "Stabilità e propriocezione recuperate",
        "Gesti calcio-specifici tollerati",
      ],
      qualitativeOnly: true,
      tier: "principi",
      sources: [BERN2016],
    },
    caveats: ["UEFA fornisce solo la mediana complessiva, non i tempi per grado I/II/III. Verificare criteri specifici su linee guida dedicate prima di formalizzarli."],
  },
  {
    id: "mcl",
    name: "Distorsione del legamento collaterale mediale (MCL)",
    region: "Ginocchio",
    category: "Legamentosa",
    benchmark: {
      headline: "16 gg (mediana)",
      sub: "media 24,6 gg · complessivo, NON per grado",
      tier: "alta",
      source: UEFA2020,
    },
    recommendation: {
      approach: "Principi generali di rientro per criteri (nessun criterio specifico di prima fascia nel set verificato).",
      criteria: [
        "Stabilità valgo recuperata, assenza di dolore",
        "Forza e ROM simmetrici",
        "Gesti calcio-specifici tollerati",
      ],
      qualitativeOnly: true,
      tier: "principi",
      sources: [BERN2016],
    },
    caveats: ["UEFA fornisce solo la mediana complessiva, non i tempi per grado I/II/III."],
  },
  {
    id: "acl",
    name: "Rottura del legamento crociato anteriore (LCA)",
    region: "Ginocchio",
    category: "Legamentosa",
    frequency: "Il rientro più lungo in assoluto (~6× il successivo).",
    benchmark: {
      headline: "205 gg (mediana)",
      sub: "media 210 gg · <15% dei giocatori oltre 270 gg",
      tier: "alta",
      source: UEFA2020,
    },
    recommendation: {
      approach: "Criteri-based + tempo minimo. È l'infortunio con il pacchetto di criteri più concreto.",
      criteria: [
        "Batteria con LSI >90%: forza quadricipite isocinetica (60°/s) + 4 hop test (singolo, crossover, triplo, 6 m a tempo)",
        "Questionari >90: KOS-ADLS + global rating",
        "Prontezza psicologica (es. scala ACL-RSI)",
      ],
      minTime: "Minimo ~9 mesi dall'intervento",
      tier: "alta",
      sources: [PANTHER2020, GRINDEM2016],
    },
    caveats: [
      "La soglia LSI 90% SOVRASTIMA la funzione (l'arto sano è indebolito): preferire una batteria multipiano (OPTIKNEE) come riferimento più severo.",
      "«Batteria superata = −84% reinfortuni» NON è statisticamente significativo (p=0,075): non presentarlo come certezza.",
      "I numeri vengono da una coorte mista (non solo calcio maschile); l'analogo calcio-specifico è Kyritsis 2016 — da citare per soglie sul calcio.",
    ],
  },
  {
    id: "meniscus",
    name: "Lesione meniscale",
    region: "Ginocchio",
    category: "Articolare",
    benchmark: {
      headline: "36 gg (mediana)",
      sub: "media 50 gg · menisco laterale, dato aggregato",
      tier: "alta",
      source: UEFA2020,
    },
    recommendation: {
      approach: "Principi generali — dipende dalla gestione chirurgica (sutura vs meniscectomia), non di prima fascia nel set verificato.",
      criteria: [
        "Funzione articolare e forza recuperate",
        "Assenza di versamento e dolore",
        "Gesti calcio-specifici tollerati",
      ],
      qualitativeOnly: true,
      tier: "principi",
      sources: [BERN2016],
    },
    caveats: ["Solo il dato aggregato (menisco laterale 36 gg). I tempi per sutura vs meniscectomia e mediale vs laterale non sono di prima fascia verificata."],
  },
  {
    id: "concussion",
    name: "Commozione cerebrale (concussion)",
    region: "Capo",
    category: "Commozione",
    benchmark: {
      headline: "5 gg (mediana)",
      sub: "media 8,7 gg · spesso più breve del protocollo a criteri",
      tier: "alta",
      source: UEFA2020,
    },
    recommendation: {
      approach: "Protocollo graduale a tappe (criteri-based, non a tempo fisso).",
      criteria: [
        "Progressione solo se senza sintomi a ogni tappa",
        "Nessun contatto fino alla clearance medica",
        "Minimo ~24h per tappa",
      ],
      protocol: [
        { stage: "1 · Attività quotidiane", detail: "Attività simboliche tollerate senza sintomi" },
        { stage: "2 · Esercizio aerobico leggero", detail: "Camminata/cyclette a bassa intensità" },
        { stage: "3 · Attività sport-specifiche", detail: "Corsa individuale, senza contatto" },
        { stage: "4 · Allenamento non a contatto", detail: "Esercizi con resistenza progressiva" },
        { stage: "5 · Allenamento a contatto pieno", detail: "Dopo clearance medica" },
        { stage: "6 · Ritorno alla competizione", detail: "Rientro in gara" },
      ],
      tier: "alta",
      sources: [AMSTERDAM2023],
    },
    caveats: ["Struttura standard CISG: verificare i tempi minimi esatti per tappa sul documento Amsterdam 2023 (BJSM 57(11):695-711) prima di formalizzarli."],
  },
];

export function prognosisById(id: string): PrognosisEntry | undefined {
  return PROGNOSIS.find((p) => p.id === id);
}
