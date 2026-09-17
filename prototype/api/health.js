export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const configured = Boolean(url && anon);
  let reachable = false;
  if (configured) {
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, { headers: { apikey: anon }, signal: AbortSignal.timeout(3000) });
      reachable = response.status < 500;
    } catch { reachable = false; }
  }
  res.status(200).json({ ok: true, mode: configured ? "supabase-ready" : "local", supabaseConfigured: configured, supabaseReachable: reachable, maxUploadBytes: 10 * 1024 * 1024 });
}
