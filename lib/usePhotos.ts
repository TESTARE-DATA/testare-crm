"use client";

import { useCallback, useEffect, useState } from "react";
import { dbRead, dbUpsert, dbRemove } from "@/lib/db/actions";

// ============================================================================
// Foto atleti caricate dall'utente (athleteId → data-URL), persistite su DB
// (collezione "athlete-photos:<clientId>", una riga per atleta). Stessa
// interfaccia di prima: { photos, setPhoto, removePhoto, ready }, così i
// componenti che la usano restano invariati.
// NB: le immagini sono salvate come data-URL in jsonb; in futuro si possono
// spostare su Supabase Storage senza cambiare questa interfaccia.
// ============================================================================

type PhotoRow = { id: string; url: string };
type Photos = Record<string, string>;

export function usePhotos(clientId: string) {
  const [photos, setPhotos] = useState<Photos>({});
  const [ready, setReady] = useState(false);
  const key = `athlete-photos:${clientId}`;

  useEffect(() => {
    let alive = true;
    setReady(false);
    dbRead<PhotoRow>(key)
      .then((rows) => { if (alive) { setPhotos(Object.fromEntries(rows.map((r) => [r.id, r.url]))); setReady(true); } })
      .catch(() => { if (alive) { setPhotos({}); setReady(true); } });
    return () => { alive = false; };
  }, [key]);

  const setPhoto = useCallback((athleteId: string, dataUrl: string) => {
    setPhotos((p) => ({ ...p, [athleteId]: dataUrl }));
    dbUpsert(key, { id: athleteId, url: dataUrl }).catch(() => {});
  }, [key]);

  const removePhoto = useCallback((athleteId: string) => {
    setPhotos((p) => { const n = { ...p }; delete n[athleteId]; return n; });
    dbRemove(key, athleteId).catch(() => {});
  }, [key]);

  return { photos, setPhoto, removePhoto, ready };
}

/** Legge un file immagine come data-URL (ridimensionato lato client a max 512px). */
export function fileToDataUrl(file: File, max = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        // Sfondo bianco: i PNG con trasparenza, salvati in JPEG, avrebbero
        // altrimenti lo sfondo NERO. Bianco si fonde con le card chiare.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
