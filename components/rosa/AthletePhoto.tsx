"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { usePhotos, fileToDataUrl } from "@/lib/usePhotos";

/** Avatar atleta con pulsante per caricare/cambiare la foto (override locale). */
export function AthletePhoto({
  clientId,
  athleteId,
  firstName,
  lastName,
  shirtNumber,
  seedPhotoUrl,
  size = 92,
  editable = true,
}: {
  clientId: string;
  athleteId: string;
  firstName: string;
  lastName: string;
  shirtNumber?: number;
  seedPhotoUrl?: string;
  size?: number;
  editable?: boolean;
}) {
  const { photos, setPhoto, removePhoto, ready } = usePhotos(clientId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const photo = (ready ? photos[athleteId] : undefined) ?? seedPhotoUrl;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      setPhoto(athleteId, await fileToDataUrl(file));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Avatar firstName={firstName} lastName={lastName} photoUrl={photo} shirtNumber={shirtNumber} size={size} />
      {editable && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            title={photo ? "Cambia foto" : "Aggiungi foto"}
            className="brand-bg brand-on absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface shadow-sm transition-transform hover:scale-105"
          >
            <Icon name={busy ? "stopwatch" : "upload"} size={15} />
          </button>
          {photos[athleteId] && (
            <button
              onClick={() => removePhoto(athleteId)}
              title="Rimuovi foto caricata"
              className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-foreground text-white shadow-sm"
            >
              <span className="text-[11px] leading-none">✕</span>
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
        </>
      )}
    </div>
  );
}
