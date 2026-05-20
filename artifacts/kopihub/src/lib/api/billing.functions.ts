import { supabase } from "@/integrations/supabase/client";

async function rpcWithSchemaRetry(fnName: string, args: Record<string, unknown>) {
  const first = await supabase.rpc(fnName as any, args as any);
  if (!first.error || first.error.code !== "PGRST202") return first;

  try { await supabase.rpc("reload_postgrest_schema" as any); } catch { /* ignore */ }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return supabase.rpc(fnName as any, args as any);
}

export async function createPlanInvoice({ data }: { data: { planCode: string } }) {
  const { data: result, error } = await supabase.rpc("create_plan_invoice" as any, { _plan_code: data.planCode });
  if (error) throw error;
  return result;
}

export async function submitPaymentProof({ data }: { data: { invoiceId: string; proofUrl: string; method?: string } }) {
  const { error } = await supabase.from("plan_invoices" as any).update({ payment_proof_url: data.proofUrl, payment_method: data.method ?? null, status: "awaiting_review" }).eq("id", data.invoiceId);
  if (error) throw error;
  return { ok: true };
}

export async function approveInvoice({ data }: { data: { invoiceId: string } }) {
  const { error } = await rpcWithSchemaRetry("approve_invoice", { _invoice_id: data.invoiceId });
  if (error) throw error;
  return { ok: true };
}

export async function rejectInvoice({ data }: { data: { invoiceId: string; reason?: string } }) {
  const { error } = await rpcWithSchemaRetry("reject_invoice", { _invoice_id: data.invoiceId, _reason: data.reason ?? null });
  if (error) throw error;
  return { ok: true };
}

export async function cancelPlanInvoice({ data }: { data: { invoiceId: string } }) {
  const { error } = await supabase.from("plan_invoices" as any).update({ status: "cancelled" }).eq("id", data.invoiceId);
  if (error) throw error;
  return { ok: true };
}

export async function getProofSignedUrl({ data }: { data: { invoiceId: string } }) {
  const { data: row } = await supabase.from("plan_invoices" as any).select("payment_proof_url").eq("id", data.invoiceId).maybeSingle();
  return { url: (row as any)?.payment_proof_url ?? null };
}
