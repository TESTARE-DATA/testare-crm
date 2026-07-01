"use client";

// ============================================================================
// Storage locale dei FILE caricati dall'utente (report Test HTML/PDF, ecc.).
// localStorage NON basta: un singolo PDF supera facilmente la quota (~5MB) e la
// scrittura fallisce in silenzio, facendo "sparire" il file al cambio pagina.
// IndexedDB regge file grandi e li mantiene tra le sessioni. Qui teniamo solo i
// BLOB, indicizzati per id; i metadati leggeri restano in localStorage (store.ts).
// Quando arriverà il DB, questi blob diventeranno file su storage remoto.
// ============================================================================

const DB_NAME = "testare-files";
const STORE = "files";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB non disponibile"));
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Salva (o sovrascrive) il blob per l'id dato. */
export async function putFile(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Recupera il blob per l'id, o undefined se assente. */
export async function getFile(id: string): Promise<Blob | undefined> {
  const db = await openDb();
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(id);
      r.onsuccess = () => resolve(r.result as Blob | undefined);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}

/** Elimina il blob per l'id (no-op se assente). */
export async function deleteFile(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
