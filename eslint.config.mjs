import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Regole nuove di eslint-plugin-react-hooks v6 (React 19): segnalano pattern
    // INTENZIONALI e SSR-safe usati negli hook di persistenza (sincronizzazione
    // client-only dopo il mount, ref nei custom hook) e in piccoli helper di
    // render. Sono scelte volute e verificate: degradate a warning per non far
    // fallire la CI, senza nascondere del tutto il segnale.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    // Parser delle risposte dell'API esterna football-data.org: lo shape JSON
    // non è tipizzato a monte e qui si accede in modo difensivo (?. + ??).
    files: ["lib/campionato.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worktree stale di Claude Code: artefatti di build, non sorgente del progetto.
    ".claude/**",
  ]),
]);

export default eslintConfig;
