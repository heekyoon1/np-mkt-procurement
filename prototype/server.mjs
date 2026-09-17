import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(root, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}
const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT || 4173);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/api/auth-config") {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ configured: Boolean(url && anonKey), url: url || null, anonKey: anonKey || null }));
    return;
  }
  if (req.method === "GET" && req.url === "/api/health") {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
    const health = { ok: true, mode: supabaseConfigured ? "supabase-ready" : "local", supabaseConfigured, supabaseReachable: false, maxUploadBytes: 10 * 1024 * 1024 };
    if (supabaseConfigured) {
      try {
        const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/`, { method: "GET", headers: { apikey: supabaseAnonKey }, signal: AbortSignal.timeout(3000) });
        health.supabaseReachable = response.status < 500;
      } catch { health.supabaseReachable = false; }
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(health));
    return;
  }
  if (req.method === "POST" && req.url === "/api/import-contracts") {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!body.fileName || !body.data) throw new Error("파일 데이터가 없습니다.");
        const bytes = Buffer.from(body.data, "base64");
        if (bytes.length > 10 * 1024 * 1024) throw new Error("파일당 최대 10MB까지 업로드할 수 있습니다.");
        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "np-mkt-contract-"));
        const tempFile = path.join(tempDir, body.fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, "_"));
        await fs.promises.writeFile(tempFile, bytes);
        const bundledPython = "C:\\Users\\IT Business\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
        const python = process.env.NP_MKT_PYTHON || (fs.existsSync(bundledPython) ? bundledPython : "python");
        const worker = path.join(root, "contract_worker.py");
        const { stdout } = await execFileAsync(python, [worker, tempFile], { maxBuffer: 10 * 1024 * 1024 });
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(stdout);
      } catch (error) { res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify({ ok: false, error: error.message })); }
    });
    return;
  }
  if (req.method === "POST" && req.url === "/api/import-cd") {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!body.fileName || !body.data) throw new Error("파일 데이터가 없습니다.");
        const bytes = Buffer.from(body.data, "base64");
        if (bytes.length > 10 * 1024 * 1024) throw new Error("파일당 최대 10MB까지 업로드할 수 있습니다.");
        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "np-mkt-import-"));
        const tempFile = path.join(tempDir, body.fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, "_"));
        await fs.promises.writeFile(tempFile, bytes);
        const bundledPython = "C:\\Users\\IT Business\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
        const python = process.env.NP_MKT_PYTHON || (fs.existsSync(bundledPython) ? bundledPython : "python");
        const worker = path.join(root, "import_worker.py");
        const { stdout } = await execFileAsync(python, [worker, tempFile], { maxBuffer: 20 * 1024 * 1024 });
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(stdout);
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: error.message }));
      }
    });
    return;
  }
  const requestPath = decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.join(root, requestPath === "/" ? "index.html" : requestPath);
  if (!filePath.startsWith(root)) { res.writeHead(403); res.end("Forbidden"); return; }
  fs.readFile(filePath, (error, data) => {
    if (error) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1", () => console.log(`NP MKT prototype running at http://127.0.0.1:${port}`));
