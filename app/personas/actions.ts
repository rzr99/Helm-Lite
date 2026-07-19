"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return ((formData.get(key) as string) || "").trim();
}

// Never allow anything that looks like a full card number to be stored.
// Card fields are reference labels only, e.g. "Kripicard 6190".
function cardLabel(formData: FormData, key: string) {
  const value = text(formData, key);
  const digitRun = value.replace(/[\s-]/g, "");
  if (/\d{13,}/.test(digitRun)) {
    throw new Error(
      "That looks like a full card number. Store a reference label only, like 'Kripicard 6190'."
    );
  }
  return value || null;
}

export async function createPersona(formData: FormData) {
  const supabase = await createClient();

  const values = {
    persona_name: text(formData, "persona_name"),
    managed_by: text(formData, "managed_by") || null,
    contact_email: text(formData, "contact_email") || null,
    contact_phone: text(formData, "contact_phone") || null,
  };

  if (!values.persona_name) throw new Error("The persona needs a name.");

  const { data, error } = await supabase
    .from("personas")
    .insert(values)
    .select("id")
    .single();

  if (error) throw new Error("Could not save the persona: " + error.message);

  revalidatePath("/personas");
  redirect(`/personas/${data.id}`);
}

export async function updatePersona(personaId: string, formData: FormData) {
  const supabase = await createClient();

  const values = {
    persona_name: text(formData, "persona_name"),
    managed_by: text(formData, "managed_by") || null,
    contact_email: text(formData, "contact_email") || null,
    contact_phone: text(formData, "contact_phone") || null,
  };

  if (!values.persona_name) throw new Error("The persona needs a name.");

  const { error } = await supabase
    .from("personas")
    .update(values)
    .eq("id", personaId);

  if (error) throw new Error("Could not update the persona: " + error.message);

  revalidatePath("/personas");
  revalidatePath(`/personas/${personaId}`);
}

export async function deletePersona(personaId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("personas")
    .delete()
    .eq("id", personaId);

  if (error) throw new Error("Could not delete the persona: " + error.message);

  revalidatePath("/personas");
  redirect("/personas");
}

export async function createAccount(personaId: string, formData: FormData) {
  const supabase = await createClient();

  const values = {
    persona_id: personaId,
    platform: text(formData, "platform"),
    handle: text(formData, "handle"),
    subscription_date: text(formData, "subscription_date") || null,
    renewal_date: text(formData, "renewal_date") || null,
    assigned_card: cardLabel(formData, "assigned_card"),
    assigned_proxy: text(formData, "assigned_proxy") || null,
    status: text(formData, "status") || "active",
  };

  if (!values.handle) throw new Error("The account needs a handle.");
  if (!values.platform) throw new Error("Pick a platform.");

  const { error } = await supabase.from("accounts").insert(values);

  if (error) throw new Error("Could not save the account: " + error.message);

  revalidatePath(`/personas/${personaId}`);
  redirect(`/personas/${personaId}`);
}

export async function updateAccount(
  accountId: string,
  personaId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const values = {
    platform: text(formData, "platform"),
    handle: text(formData, "handle"),
    subscription_date: text(formData, "subscription_date") || null,
    renewal_date: text(formData, "renewal_date") || null,
    assigned_card: cardLabel(formData, "assigned_card"),
    assigned_proxy: text(formData, "assigned_proxy") || null,
    status: text(formData, "status") || "active",
  };

  if (!values.handle) throw new Error("The account needs a handle.");

  const { error } = await supabase
    .from("accounts")
    .update(values)
    .eq("id", accountId);

  if (error) throw new Error("Could not update the account: " + error.message);

  revalidatePath(`/personas/${personaId}`);
  revalidatePath(`/accounts/${accountId}`);
}

export async function deleteAccount(accountId: string, personaId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId);

  if (error) throw new Error("Could not delete the account: " + error.message);

  revalidatePath(`/personas/${personaId}`);
  redirect(`/personas/${personaId}`);
}

export async function addPlatform(formData: FormData) {
  const supabase = await createClient();

  const name = text(formData, "name").toLowerCase();
  if (!name) throw new Error("Type a platform name first.");

  const { error } = await supabase.from("platforms").insert({ name });

  if (error) throw new Error("Could not add the platform: " + error.message);

  revalidatePath("/personas");
}
