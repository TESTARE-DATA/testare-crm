const PALETTE = ["#0f766e", "#7c3aed", "#b91c1c", "#1d4ed8", "#c2410c", "#0e7490", "#4d7c0f", "#9d174d"];

/** Avatar atleta: foto se disponibile, altrimenti iniziali su colore deterministico. */
export function Avatar({
  firstName,
  lastName,
  photoUrl,
  size = 40,
  shirtNumber,
}: {
  firstName: string;
  lastName: string;
  photoUrl?: string;
  size?: number;
  shirtNumber?: number;
}) {
  const initials = (firstName[0] ?? "") + (lastName[0] ?? "");
  const idx = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % PALETTE.length;

  if (photoUrl) {
    return (
      // Foto da upload (data-URL) o URL esterno: <img> evita config remotePatterns.
      // object-position alto: le foto-busto riempiono il cerchio SENZA tagliare la testa.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        className="shrink-0 rounded-full"
        style={{ width: size, height: size, objectFit: "cover", objectPosition: "center top" }}
      />
    );
  }

  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: PALETTE[idx], fontSize: size * 0.38 }}
    >
      {initials.toUpperCase()}
      {shirtNumber != null && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border-2 border-surface bg-foreground font-bold text-white"
          style={{ width: size * 0.42, height: size * 0.42, fontSize: size * 0.22 }}
        >
          {shirtNumber}
        </span>
      )}
    </span>
  );
}
