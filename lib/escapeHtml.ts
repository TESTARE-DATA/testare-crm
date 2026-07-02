// Escape dei caratteri HTML pericolosi. Da usare SEMPRE quando si interpolano
// valori (nomi atleti, note, trattamenti, referti...) dentro stringhe HTML che
// vengono poi iniettate nel DOM o in una finestra di stampa. Impedisce l'XSS:
// un valore come `<img src=x onerror=...>` viene reso come testo, non eseguito.
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
