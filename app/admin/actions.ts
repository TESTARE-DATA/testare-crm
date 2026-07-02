"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin, getProfile } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { ROLES, type Role } from "@/lib/auth/roles";
import { getClient } from "@/lib/clients";

// ============================================================================
// Server action del pannello admin (solo superadmin). Creano/eliminano account:
//  - utente in Supabase Auth (email confermata, niente email di invito);
//  - ruolo/tenant in app_metadata (leggibili dal proxy, modificabili SOLO qui);
//  - riga in `profiles` (fonte di verità per la DAL).
// ============================================================================

export type AdminActionState = { error?: string; ok?: string } | undefined;

export async function createAccount(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireSuperadmin();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const clientIdRaw = String(formData.get("clientId") ?? "").trim();
  const athleteIdRaw = String(formData.get("athleteId") ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email non valida." };
  if (password.length < 8) return { error: "La password deve avere almeno 8 caratteri." };
  if (!ROLES.includes(role)) return { error: "Ruolo non valido." };

  // Coerenza ruolo ↔ tenant: la società viene validata contro l'anagrafica.
  const clientId = role === "superadmin" ? null : clientIdRaw || null;
  const athleteId = role === "athlete" ? athleteIdRaw || null : null;
  if (role !== "superadmin") {
    if (!clientId || !getClient(clientId)) return { error: "Seleziona la società." };
  }
  if (role === "athlete" && !athleteId) return { error: "Seleziona l'atleta." };

  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // attivo subito, nessuna email di conferma
    app_metadata: { role, client_id: clientId, athlete_id: athleteId },
    user_metadata: { full_name: fullName || null },
  });
  if (error || !data.user) {
    const msg = error?.message ?? "";
    if (/already.*(registered|exists)/i.test(msg)) return { error: "Esiste già un account con questa email." };
    return { error: "Creazione non riuscita. Riprova." };
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    role,
    client_id: clientId,
    athlete_id: athleteId,
    full_name: fullName || null,
  });
  if (profileError) {
    // Non lasciare utenti auth orfani senza profilo.
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "Creazione profilo non riuscita. Riprova." };
  }

  revalidatePath("/admin");
  return { ok: `Account creato: ${email}` };
}

export async function deleteAccount(formData: FormData): Promise<void> {
  const me = await requireSuperadmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === me.id) return; // mai auto-eliminarsi
  const admin = getAdminClient();
  await admin.auth.admin.deleteUser(userId); // il profilo cade in cascade
  revalidatePath("/admin");
}
