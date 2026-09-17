export default function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  res.status(200).json({ configured: Boolean(url && anonKey), url: url || null, anonKey: anonKey || null });
}
