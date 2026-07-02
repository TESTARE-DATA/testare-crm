// ============================================================================
// Modello dei ruoli TESTÀRE CRM.
//  - superadmin : staff TESTÀRE, vede/gestisce TUTTE le società (client_id null)
//  - staff      : staff di UNA società, vede solo il proprio client_id
//  - athlete    : atleta, vede solo la propria scheda (client_id + athlete_id)
// Il profilo vive nella tabella `profiles` (una riga per utente auth).
// ============================================================================

export type Role = "superadmin" | "staff" | "athlete";

export const ROLES: Role[] = ["superadmin", "staff", "athlete"];

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Super-admin TESTÀRE",
  staff: "Staff società",
  athlete: "Atleta",
};

export interface Profile {
  id: string; // = auth.users.id
  role: Role;
  clientId: string | null; // slug società (es. "torino"); null per superadmin
  athleteId: string | null; // solo per role="athlete"
  fullName: string | null;
  email: string | null;
}

/** Un superadmin vede tutti i clienti; gli altri solo il proprio. */
export function canAccessClient(profile: Profile, clientId: string): boolean {
  if (profile.role === "superadmin") return true;
  return profile.clientId === clientId;
}
