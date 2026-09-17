const STORAGE_KEY = "np-mkt-prototype-state-v1";
const roles = {
  requester: { label: "요청자", name: "이수진", team: "GC영업부" },
  lead: { label: "팀장", name: "김춘수", team: "NP MKT" },
  buyer: { label: "Buyer", name: "김희균", team: "NP MKT" },
  admin: { label: "관리자", name: "NP MKT 관리자", team: "NP MKT" },
};
const buyerMap = { 네트워크: "김희균", 서버: "신민경", NAS: "신민경", 데스크탑: "이한식", 노트북: "이한식", PC: "이한식", "문서자동화": "김희균", "문서보안": "김정모", "화상회의": "김정모", "인쇄 후가공": "이동규", 카드리더기: "이동규", 범용SW: "김진영" };
const buyerCategoryAliases = { "network": "네트워크", "네트워크": "네트워크", "server": "서버", "서버": "서버", "nas": "NAS", "desktop": "데스크탑", "데스크탑": "데스크탑", "laptop": "노트북", "notebook": "노트북", "노트북": "노트북", "pc": "PC", "software": "범용SW", "general sw": "범용SW", "범용sw": "범용SW", "document automation": "문서자동화", "문서자동화": "문서자동화", "document security": "문서보안", "문서보안": "문서보안", "video conference": "화상회의", "화상회의": "화상회의", "finisher": "인쇄 후가공", "인쇄 후가공": "인쇄 후가공", "card reader": "카드리더기", "카드리더기": "카드리더기" };
const pricePolicy = { overhead: 1.0315, guideMargin: 0.27, listMargin: 0.31, dealerMargin: 0.2 };
const statusSteps = ["접수/구매진행", "견적완료", "발주중", "쉽컴펌 완료"];

const initialState = {
  role: "buyer",
  view: "dashboard",
  selectedId: "REQ-2026-0001",
  requests: [
    { id: "REQ-2026-0001", receivedAt: "2026-08-18", requester: "이수진", team: "GC영업부", customer: "한국후지필름 디스플레이", deliveryMonth: "2026-09", deliveryAddress: "서울 강남구 테헤란로 123", contact: "이수진 / 010-1234-5678", contractType: "비단가계약", warranty: "1년", install: "예", training: "예", status: "견적완료", approval: "승인", buyer: "김희균", items: [{ product: "FortiGate UTM V50", category: "네트워크", qty: 1, cost: 1850000, vendor: "두루안", quoteValid: "2026-08-31", selected: true }], history: [{ status: "접수/구매진행", actor: "이수진", at: "2026-08-18 09:40", note: "구매요청 접수" }, { status: "접수/구매진행", actor: "김춘수", at: "2026-08-18 10:05", note: "팀장 승인" }, { status: "견적완료", actor: "김희균", at: "2026-08-18 11:25", note: "견적 및 가격 등록" }] },
    { id: "REQ-2026-0002", receivedAt: "2026-08-17", requester: "박정훈", team: "NP MKT", customer: "사내", deliveryMonth: "2026-08", deliveryAddress: "서울 중구 본사", contact: "박정훈 / 010-7788-1200", contractType: "단가계약", warranty: "3년", install: "아니오", training: "아니오", status: "발주중", approval: "승인", buyer: "이한식", items: [{ product: "노트북 Latitude", category: "노트북", qty: 3, cost: 1220000, vendor: "에티버스", quoteValid: "2026-08-25", selected: true }], history: [{ status: "접수/구매진행", actor: "박정훈", at: "2026-08-17 14:10", note: "구매요청 접수" }, { status: "발주중", actor: "이한식", at: "2026-08-18 09:15", note: "발주 완료 처리" }] },
    { id: "REQ-2026-0003", receivedAt: "2026-08-18", requester: "김영업", team: "DX Creation 마케팅부", customer: "고객A", deliveryMonth: "2026-09", deliveryAddress: "경기 성남시 판교", contact: "김영업 / 010-5555-2222", contractType: "유지보수", warranty: "1년", install: "예", training: "예", status: "접수/구매진행", approval: "대기", buyer: "김희균", items: [{ product: "M365 Copilot", category: "범용SW", qty: 50, cost: 360000, vendor: "Microsoft Korea", quoteValid: "2026-08-30", selected: false }], history: [{ status: "접수/구매진행", actor: "김영업", at: "2026-08-18 13:05", note: "구매요청 접수" }] },
  ],
  contracts: [
    { id: "CON-0001", vendor: "Microsoft Korea", product: "M365 Copilot", type: "SaaS", end: "2026-12-31", cycle: "연간", buyer: "김희균", amount: 18000000, state: "정상" },
    { id: "CON-0002", vendor: "Zoom", product: "Zoom Workplace", type: "구독", end: "2026-09-30", cycle: "월간", buyer: "김희균", amount: 1728, state: "30일 이내" },
    { id: "CON-0003", vendor: "Tungsten Automation", product: "Kofax RPA Maintenance", type: "유지보수", end: "2026-09-15", cycle: "연간", buyer: "신민경", amount: 2693, state: "30일 이내" },
  ],
  cdTransactions: [],
  importBatches: [],
  importWarnings: [],
};

const AUTH_KEY = "np-mkt-prototype-auth-v1";
const SUPABASE_SESSION_KEY = "np-mkt-supabase-session-v1";
const initialUsers = [{ name: "김희균", email: "buyer@np-mkt.local", password: "demo1234", role: "buyer" }];
let authState = loadAuth();
let currentUser = authState.currentUser;
let authConfig = { configured: false };
function normalizedRole(value) { return ["requester", "lead", "buyer", "admin"].includes(value) ? value : "requester"; }
function normalizeAuthState(saved) {
  const users = Array.isArray(saved?.users) ? saved.users.map((item) => ({
    name: String(item?.name || "").trim() || "이름 미입력",
    email: String(item?.email || "").trim().toLowerCase(),
    password: String(item?.password || ""),
    role: normalizedRole(item?.role),
  })).filter((item) => item.email && item.password) : [];
  initialUsers.forEach((demo) => { if (!users.some((item) => item.email === demo.email)) users.push(structuredClone(demo)); });
  const sessionEmail = String(saved?.currentUser?.email || "").trim().toLowerCase();
  const sessionUser = users.find((item) => item.email === sessionEmail) || null;
  return { users, currentUser: sessionUser ? { name: sessionUser.name, email: sessionUser.email, role: sessionUser.role } : null };
}
function loadAuth() { try { return normalizeAuthState(JSON.parse(localStorage.getItem(AUTH_KEY))); } catch { return normalizeAuthState(null); } }
function saveAuth() { localStorage.setItem(AUTH_KEY, JSON.stringify(authState)); }
function supabaseAuthEnabled() { return Boolean(authConfig?.configured && authConfig.url && authConfig.anonKey); }
async function supabaseAuthRequest(path, options = {}) {
  const response = await fetch(`${authConfig.url.replace(/\/$/, "")}${path}`, {
    ...options,
    headers: { apikey: authConfig.anonKey, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.msg || payload?.message || payload?.error_description || "인증 처리에 실패했습니다.");
  return payload;
}
async function profileForSession(session) {
  const userId = session?.user?.id;
  if (!userId || !session?.access_token) throw new Error("로그인 세션이 올바르지 않습니다.");
  const rows = await supabaseAuthRequest(`/rest/v1/profiles?select=id,name,email,role,is_active&id=eq.${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const profile = Array.isArray(rows) ? rows[0] : null;
  if (!profile) throw new Error("사용자 프로필을 찾을 수 없습니다. 잠시 후 다시 로그인해 주세요.");
  if (profile.is_active === false) throw new Error("비활성화된 계정입니다. 관리자에게 문의해 주세요.");
  return { name: profile.name || session.user.email, email: profile.email || session.user.email, role: normalizedRole(profile.role) };
}
function saveSupabaseSession(session) { localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(session)); }
function clearSupabaseSession() { localStorage.removeItem(SUPABASE_SESSION_KEY); }
async function loginWithSupabase(email, password) {
  const session = await supabaseAuthRequest("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  const profile = await profileForSession(session);
  saveSupabaseSession(session);
  return profile;
}
async function registerWithSupabase(name, email, password, requestedRole = "requester") {
  const result = await supabaseAuthRequest("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password, data: { name, requested_role: requestedRole } }) });
  if (!result.session) return null;
  const profile = await profileForSession(result.session);
  saveSupabaseSession(result.session);
  return profile;
}
async function bootstrapAuth() {
  try {
    const response = await fetch("/api/auth-config", { cache: "no-store" });
    authConfig = await response.json();
  } catch { authConfig = { configured: false }; }
  if (supabaseAuthEnabled()) {
    currentUser = null;
    authState.currentUser = null;
    try {
      const session = JSON.parse(localStorage.getItem(SUPABASE_SESSION_KEY) || "null");
      if (session?.access_token && (!session.expires_at || session.expires_at * 1000 > Date.now())) currentUser = await profileForSession(session);
    } catch { clearSupabaseSession(); }
  }
  render();
}
async function completeLogin(user) {
  currentUser = user;
  authState.currentUser = user;
  state.role = user.role;
  state.view = "dashboard";
  saveAuth();
  saveState();
  render();
}
function renderAuth(mode = "login", error = "") {
  const remote = supabaseAuthEnabled();
  document.querySelector("#app").innerHTML = `<div class="auth-shell"><div class="auth-card"><div class="auth-brand"><div class="brand-mark">NP</div><div><strong>NP MKT</strong><span>구매업무 통합시스템</span></div></div><h1>${mode === "login" ? "로그인" : "회원가입"}</h1><p>${remote ? "Supabase 인증 기반으로 계정을 확인합니다." : "개발용 로컬 계정으로 로그인합니다."}</p><div class="auth-tabs"><button class="auth-tab ${mode === "login" ? "active" : ""}" data-auth-tab="login">로그인</button><button class="auth-tab ${mode === "signup" ? "active" : ""}" data-auth-tab="signup">회원가입</button></div><form class="auth-form" id="authForm"><div class="auth-field ${mode === "signup" ? "" : "hidden"}"><label>이름</label><input name="name" placeholder="이름" ${mode === "signup" ? "required" : ""} /></div>${mode === "signup" ? `<div class="auth-field"><label>업무 권한 선택</label><select name="roleRequest"><option value="requester">요청자</option><option value="buyer">Buyer 권한 요청</option></select><small>Buyer는 팀장·관리자 승인 후 적용됩니다.</small></div>` : ""}<div class="auth-field"><label>회사 이메일</label><input name="email" type="email" placeholder="name@company.com" required /></div><div class="auth-field"><label>비밀번호</label><input name="password" type="password" placeholder="비밀번호" minlength="6" required /></div>${mode === "signup" ? `<div class="auth-field"><label>비밀번호 확인</label><input name="passwordConfirm" type="password" placeholder="비밀번호 확인" minlength="6" required /></div>` : ""}<div class="auth-error">${esc(error)}</div><button class="btn btn-primary auth-submit">${mode === "login" ? "로그인" : "회원가입"}</button></form>${mode === "login" ? `<div class="auth-hint">${remote ? "기존 브라우저 로컬 계정은 사용할 수 없습니다. 회원가입에서 새 계정을 생성해 주세요." : "프로토타입 데모 계정: buyer@np-mkt.local / demo1234"}</div>` : `<div class="auth-hint">요청자는 즉시 이용할 수 있으며, Buyer 선택은 승인 요청으로 기록됩니다.</div>`}</div></div>`;
  document.querySelectorAll("[data-auth-tab]").forEach((tab) => tab.addEventListener("click", () => renderAuth(tab.dataset.authTab)));
  document.querySelector("#authForm").addEventListener("submit", async (event) => { event.preventDefault(); const form = new FormData(event.target); const email = String(form.get("email")).trim().toLowerCase(); const password = String(form.get("password")); try { if (mode === "login") { const user = remote ? await loginWithSupabase(email, password) : authState.users.find((item) => item.email === email && item.password === password); if (!user) throw new Error("이메일 또는 비밀번호를 확인해 주세요."); await completeLogin({ name: user.name, email: user.email, role: normalizedRole(user.role) }); return; } if (password !== String(form.get("passwordConfirm"))) throw new Error("비밀번호가 일치하지 않습니다."); if (!remote && authState.users.some((item) => item.email === email)) throw new Error("이미 등록된 이메일입니다."); const name = String(form.get("name")).trim(); const requestedRole = String(form.get("roleRequest")) === "buyer" ? "buyer" : "requester"; if (remote) { const user = await registerWithSupabase(name, email, password, requestedRole); if (!user) { renderAuth("login", "가입은 완료됐습니다. 입력한 이메일과 비밀번호로 로그인해 주세요."); return; } await completeLogin(user); return; } const user = { name, email, password, role: "requester" }; authState.users.push(user); await completeLogin(user); } catch (submitError) { renderAuth(mode, submitError.message || "인증 처리에 실패했습니다."); } });
}
let state = loadState();
if (currentUser) state.role = normalizedRole(currentUser.role);
state.cdTransactions = (state.cdTransactions || []).map(normalizeCdTransaction);
state.importBatches = state.importBatches || [];
state.importWarnings = state.importWarnings || [];
state.maintenancePayments = state.maintenancePayments || [];
state.shipments = state.shipments || [];
state.contractImportHistory = state.contractImportHistory || [];
state.buyerCategoryMappings = state.buyerCategoryMappings || {};
state.categoryAliases = state.categoryAliases || {};
if (JSON.stringify(state.cdTransactions).includes("�")) { state.cdTransactions = []; state.importBatches = []; saveState(); }
function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(initialState); } catch { return structuredClone(initialState); } }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function esc(value = "") { return String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }
function finiteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const raw = String(value).trim();
  if (!raw || raw === "-") return fallback;
  const negative = /^\(.*\)$/.test(raw);
  const parsed = Number(raw.replace(/[(),₩원\s]/g, "").replace(/%$/, ""));
  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : fallback;
}
function normalizedRate(value) {
  if (value === null || value === undefined || value === "") return 0;
  const raw = String(value).trim();
  const rate = finiteNumber(raw, 0);
  return raw.includes("%") || Math.abs(rate) > 1 ? rate / 100 : rate;
}
function normalizeCdTransaction(row = {}) {
  return {
    ...row,
    quantity: finiteNumber(row.quantity),
    unitPrice: finiteNumber(row.unitPrice),
    purchaseAmount: finiteNumber(row.purchaseAmount),
    costDownAmount: finiteNumber(row.costDownAmount),
    costDownRate: normalizedRate(row.costDownRate),
  };
}
function money(value, currency = "KRW") { if (value === null || value === undefined || value === "") return "미표시"; return `${currency === "KRW" ? "₩" : currency + " "}${Math.round(finiteNumber(value)).toLocaleString("ko-KR")}`; }
function canonicalBuyerCategory(value) { const raw = String(value || "").trim(); const key = raw.normalize("NFKC").toLocaleLowerCase("ko-KR").trim(); return state.categoryAliases?.[key] || buyerCategoryAliases[key] || raw; }
function resolveBuyerForCategory(value) { const category = canonicalBuyerCategory(value); return state.buyerCategoryMappings?.[category] || buyerMap[category] || null; }
function statusClass(status) { if (status === "쉽컴펌 완료" || status === "완료") return "status-mint"; if (status === "견적완료" || status === "발주중") return "status-gold"; if (status === "반려" || status === "Buyer 결정 필요") return "status-red"; return "status-blue"; }
function activeRequest() { return state.requests.find((r) => r.id === state.selectedId) || state.requests[0]; }
function calcPrices(cost, category) { const listMargin = ["범용SW", "서버", "NAS", "네트워크", "PC", "노트북"].includes(category) ? pricePolicy.listMargin : null; const op = Number(cost || 0) * pricePolicy.overhead; const guide = Math.ceil((Number(cost || 0) / (1 - pricePolicy.guideMargin)) / 1000) * 1000; const list = listMargin === null ? null : Math.ceil((Number(cost || 0) / (1 - listMargin)) / 1000) * 1000; return { op, guide, list }; }
function render() { document.querySelector("#app").innerHTML = layout(); if (state.view === "forecast") document.querySelector(".content").innerHTML = forecastView(); if (state.view === "business") document.querySelector(".content").innerHTML = businessModelView(); bindEvents(); enhanceForecastNavigation(); enhanceBusinessNavigation(); refreshConnectionStatus(); }

function enhanceForecastNavigation() {
  const nav = document.querySelector(".nav");
  if (!nav || nav.querySelector("[data-view='forecast']")) return;
  const button = document.createElement("button");
  button.dataset.view = "forecast";
  button.textContent = "⌁　구매 예측";
  button.className = state.view === "forecast" ? "active" : "";
  button.addEventListener("click", () => { state.view = "forecast"; render(); });
  const anchor = nav.querySelector("[data-view='ai']");
  anchor ? nav.insertBefore(button, anchor) : nav.appendChild(button);
  if (state.view === "forecast") document.querySelector(".crumb").textContent = "NP InsightFlow / 구매 예측";
}

function enhanceBusinessNavigation() {
  const nav = document.querySelector(".nav");
  if (!nav || nav.querySelector("[data-view='business']")) return;
  const button = document.createElement("button");
  button.dataset.view = "business";
  button.textContent = "◉　사업기회 추천";
  button.className = state.view === "business" ? "active" : "";
  button.addEventListener("click", () => { state.view = "business"; render(); });
  const anchor = nav.querySelector("[data-view='ai']");
  anchor ? nav.insertBefore(button, anchor) : nav.appendChild(button);
  if (state.view === "business") document.querySelector(".crumb").textContent = "NP InsightFlow / 사업기회 추천";
}

async function refreshConnectionStatus() {
  let target = document.querySelector("[data-connection-status]");
  if (!target) {
    const foot = document.querySelector(".sidebar-foot");
    if (!foot) return;
    target = document.createElement("span");
    target.dataset.connectionStatus = "true";
    target.className = "connection-status is-local";
    foot.appendChild(target);
  }
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const health = await response.json();
    target.textContent = health.supabaseReachable ? "Supabase 연결됨" : health.supabaseConfigured ? "Supabase 연결 확인 필요" : "로컬 저장 모드";
    target.className = `connection-status ${health.supabaseReachable ? "is-ready" : "is-local"}`;
    target.title = health.supabaseReachable ? "Supabase API에 연결할 수 있습니다." : health.supabaseConfigured ? "환경변수는 있으나 Supabase API 연결에 실패했습니다." : "Supabase 환경변수 설정 전에는 브라우저 로컬 저장소를 사용합니다.";
  } catch {
    target.textContent = "로컬 저장 모드";
    target.className = "connection-status is-local";
  }
}

function layout() {
  const role = roles[normalizedRole(currentUser?.role)] || roles.requester;
  const profile = currentUser || role;
  return `<div class="shell"><aside class="sidebar"><div class="brand"><div class="brand-mark">NP</div><div><strong>NP MKT</strong><span>구매업무 통합시스템</span></div></div><nav class="nav"><button class="${state.view === "dashboard" ? "active" : ""}" data-view="dashboard">⌂　대시보드</button><button class="${state.view === "requests" || state.view === "detail" ? "active" : ""}" data-view="requests">▤　구매요청</button><button class="${state.view === "analysis" ? "active" : ""}" data-view="analysis">◈　구매 분석</button><button class="${state.view === "costdown" ? "active" : ""}" data-view="costdown">↘　Cost Down</button><button class="${state.view === "pricing" ? "active" : ""}" data-view="pricing">₩　단가·업체 분석</button><button class="${state.view === "recommend" ? "active" : ""}" data-view="recommend">★　업체 추천</button><button class="${state.view === "mail" ? "active" : ""}" data-view="mail">✉　견적 메일</button><button class="${state.view === "suppliers" ? "active" : ""}" data-view="suppliers">⌘　업체 관리</button><button class="${state.view === "ai" ? "active" : ""}" data-view="ai">✦　AI 검색</button><button class="${state.view === "contracts" ? "active" : ""}" data-view="contracts">◷　계약·지불관리</button><button class="${state.view === "imports" ? "active" : ""}" data-view="imports">⇧　CD 업로드</button></nav><div class="sidebar-foot">로컬 프로토타입 v0.1<br/>Supabase/Vercel 연결 전 검증용</div></aside><main class="main"><header class="topbar"><span class="crumb">NP MKT / ${state.view === "dashboard" ? "대시보드" : state.view === "requests" ? "구매요청" : state.view === "detail" ? "구매요청 상세" : state.view === "analysis" ? "구매 분석" : state.view === "costdown" ? "Cost Down 분석" : state.view === "pricing" ? "단가·업체 분석" : state.view === "recommend" ? "업체 추천" : state.view === "mail" ? "견적 메일" : state.view === "suppliers" ? "업체 관리" : state.view === "ai" ? "AI 검색" : state.view === "imports" ? "CD 업로드" : "계약·지불관리"}</span><div class="top-actions"><span class="role-chip">${esc(role.label)}</span><div class="profile"><div class="avatar">${esc(profile.name.slice(0, 2))}</div>${esc(profile.name)}</div></div></header><section class="content">${state.view === "dashboard" ? dashboardView() : state.view === "requests" ? requestsView() : state.view === "detail" ? detailView() : state.view === "analysis" ? analysisView() : state.view === "costdown" ? costdownView() : state.view === "pricing" ? pricingView() : state.view === "recommend" ? recommendView() : state.view === "mail" ? mailView() : state.view === "suppliers" ? suppliersView() : state.view === "ai" ? aiView() : state.view === "imports" ? importsView() : contractsView()}</section></main></div>`;
}

function dashboardView() {
  const counts = statusSteps.map((s) => state.requests.filter((r) => r.status === s).length);
  return `<div class="page-head"><div><h1>구매업무 대시보드</h1><p>요청 접수부터 쉽컴펌까지 현재 업무 흐름을 한눈에 확인합니다.</p></div><button class="btn btn-primary" data-action="new-request">+ 구매요청 등록</button></div><div class="cards"><div class="metric"><div class="label">전체 구매요청</div><div class="value">${state.requests.length}</div><div class="note">로컬 데모 데이터 포함</div></div><div class="metric"><div class="label">팀장 승인 대기</div><div class="value">${state.requests.filter((r) => r.approval === "대기").length}</div><div class="note">팀장 승인함에서 처리</div></div><div class="metric"><div class="label">견적·발주 진행</div><div class="value">${state.requests.filter((r) => ["견적완료", "발주중"].includes(r.status)).length}</div><div class="note">Buyer 처리 대상</div></div><div class="metric"><div class="label">만기 30일 이내</div><div class="value">${state.contracts.filter((c) => c.state === "30일 이내").length}</div><div class="note">Buyer에게 알림</div></div></div><div class="grid-2"><div><div class="panel"><div class="panel-head"><h2>최근 구매요청</h2><button class="btn btn-ghost" data-view="requests">전체보기 →</button></div>${requestTable(state.requests.slice(0, 5))}</div><div class="panel"><div class="panel-head"><h2>진행 단계</h2><span>전체 요청 ${state.requests.length}건</span></div><div class="progress"><div class="progress-bar" style="width:${Math.min(100, Math.max(12, (counts[3] / Math.max(1, state.requests.length)) * 100))}%"></div></div><div class="steps">${statusSteps.map((s, i) => `<div class="step ${counts[i] ? "done" : i === 0 ? "active" : ""}" data-dashboard-step="${i}" title="클릭하면 해당 단계 목록을 봅니다">${s}<br/><b>${counts[i]}건</b></div>`).join("")}</div></div></div><div><div class="panel"><div class="panel-head"><h2>오늘의 처리 알림</h2><span>2026-08-18</span></div><div class="activity"><div class="activity-item"><div class="activity-dot"></div><div><strong>팀장 승인 대기 ${state.requests.filter((r) => r.approval === "대기").length}건</strong><p>요청자 조직의 팀장이 승인하면 Buyer 견적 단계로 진행할 수 있습니다.</p></div></div><div class="activity-item"><div class="activity-dot"></div><div><strong>계약 만기 임박 ${state.contracts.filter((c) => c.state !== "정상").length}건</strong><p>매월 20일 기준 지불·갱신 대상을 확인하세요.</p></div></div><div class="activity-item"><div class="activity-dot"></div><div><strong>메일 발송 모드: 미리보기</strong><p>Microsoft Graph 없이 메일 본문을 확인하는 프로토타입 모드입니다.</p></div></div></div></div><div class="panel"><div class="panel-head"><h2>운영원가 정책</h2><span>v0.1</span></div><div class="notice">원가 입력 → 운영원가 3.15% 가산 → Guide Price 자동 계산. List Price율이 없는 카테고리는 List Price를 표시하지 않습니다.</div></div></div></div>`;
}

function requestTable(rows) { if (!rows.length) return `<div class="empty">표시할 구매요청이 없습니다.</div>`; return `<table class="table"><thead><tr><th>요청번호</th><th>요청자</th><th>상품</th><th>Buyer</th><th>Status</th><th>접수일</th></tr></thead><tbody>${rows.map((r) => `<tr class="click-row" data-request-id="${r.id}"><td><strong>${r.id}</strong></td><td>${esc(r.requester)}</td><td>${esc(r.items[0]?.product || "-")}${r.items.length > 1 ? ` 외 ${r.items.length - 1}` : ""}</td><td>${esc(r.buyer)}</td><td><span class="status ${statusClass(r.status)}">${esc(r.status)}</span></td><td>${r.receivedAt}</td></tr>`).join("")}</tbody></table>`; }
function requestsView() { return `<div class="page-head"><div><h1>구매요청</h1><p>요청자·팀장·Buyer 역할에 따라 같은 요청을 단계별로 처리합니다.</p></div><div class="toolbar"><input class="search" id="requestSearch" placeholder="요청번호·상품·요청자 검색"/><button class="btn btn-primary" data-action="new-request">+ 구매요청 등록</button></div></div><div class="panel"><div class="panel-head"><h2>요청 목록</h2><span>${state.requests.length}건</span></div><div id="requestTableWrap">${requestTable(state.requests)}</div></div>`; }

function detailView() {
  const r = activeRequest(); const item = r.items[0]; const prices = calcPrices(item.cost, item.category); const role = state.role; const canChange = ["buyer", "admin"].includes(role); const canApprove = role === "lead" && r.approval === "대기"; const stepIndex = statusSteps.indexOf(r.status); const priceVisible = ["buyer", "admin", "lead"].includes(role);
  return `<div class="page-head"><div><button class="btn btn-ghost" data-view="requests">← 요청 목록</button><h1 style="margin-top:10px">${r.id}</h1><p>${esc(item.product)} · ${esc(r.requester)} · ${esc(r.customer)}</p></div><div class="toolbar"><span class="status ${statusClass(r.status)}">${esc(r.status)}</span>${r.approval === "대기" ? `<span class="status status-red">팀장 승인 대기</span>` : `<span class="status status-mint">팀장 승인 ${r.approval}</span>`}</div></div><div class="detail-layout"><div class="detail-card"><div class="detail-title"><div><h2>${esc(item.product)}</h2><p>${esc(item.category)} · ${esc(item.vendor)} · 수량 ${item.qty}</p></div><span class="status ${statusClass(r.status)}">${esc(r.status)}</span></div><div class="info-grid"><div><span class="info-label">요청자</span><span class="info-value">${esc(r.requester)}</span></div><div><span class="info-label">접수날짜</span><span class="info-value">${r.receivedAt}</span></div><div><span class="info-label">담당 Buyer</span><span class="info-value">${esc(r.buyer)}</span></div><div><span class="info-label">납품월</span><span class="info-value">${r.deliveryMonth}</span></div><div><span class="info-label">고객명</span><span class="info-value">${esc(r.customer)}</span></div><div><span class="info-label">담당자/연락처</span><span class="info-value">${esc(r.contact)}</span></div><div><span class="info-label">계약 유형</span><span class="info-value">${esc(r.contractType)}</span></div><div><span class="info-label">보증기간</span><span class="info-value">${esc(r.warranty)}</span></div><div><span class="info-label">설치 지원</span><span class="info-value">${esc(r.install)}</span></div><div><span class="info-label">교육 지원</span><span class="info-value">${esc(r.training)}</span></div><div style="grid-column: span 2"><span class="info-label">납품주소</span><span class="info-value">${esc(r.deliveryAddress)}</span></div></div><div class="section-title"><h3>가격정보</h3><span style="font-size:10px;color:var(--muted)">${role === "requester" ? "요청자 공개 가격" : role === "lead" ? "팀장 승인용 가격" : "Buyer 가격관리"}</span></div><div class="price-grid">${priceVisible ? `<div class="price-box private"><div class="price-label">원가 · ${role === "lead" ? "승인 화면 공개" : "권한 보유"}</div><strong>${money(item.cost)}</strong></div>` : `<div class="price-box private"><div class="price-label">원가</div><strong>*</strong></div>`}<div class="price-box"><div class="price-label">운영원가</div><strong>${money(prices.op)}</strong></div><div class="price-box"><div class="price-label">Guide Price</div><strong>${money(prices.guide)}</strong></div><div class="price-box"><div class="price-label">List Price</div><strong>${prices.list === null ? "미표시" : money(prices.list)}</strong></div></div><div class="section-title"><h3>업무 진행</h3><span style="font-size:10px;color:var(--muted)">${r.history.length}건의 이력</span></div><div class="progress"><div class="progress-bar" style="width:${Math.max(10, ((stepIndex + 1) / statusSteps.length) * 100)}%"></div></div><div class="steps">${statusSteps.map((s, i) => `<div class="step ${i < stepIndex ? "done" : i === stepIndex ? "active" : ""}">${s}</div>`).join("")}</div>${canApprove ? `<div class="action-row"><button class="btn btn-danger" data-action="reject">반려</button><button class="btn btn-primary" data-action="approve">팀장 승인</button></div>` : ""}${canChange ? `<div class="action-row"><button class="btn btn-secondary" data-action="mail-preview">메일 미리보기</button>${r.status === "접수/구매진행" && r.approval === "승인" ? `<button class="btn btn-primary" data-action="set-status" data-status="견적완료">견적완료 처리</button>` : ""}${r.status === "견적완료" ? `<button class="btn btn-primary" data-action="set-status" data-status="발주중">발주중 처리</button>` : ""}${r.status === "발주중" ? `<button class="btn btn-primary" data-action="set-status" data-status="쉽컴펌 완료">쉽컴펌 완료</button>` : ""}</div>` : ""}</div><aside><div class="panel"><div class="panel-head"><h2>상태 변경 이력</h2></div><div class="timeline">${r.history.map((h) => `<div class="timeline-item"><div class="timeline-rail"></div><div><strong>${esc(h.status)} · ${esc(h.actor)}</strong><span>${h.at} · ${esc(h.note)}</span></div></div>`).join("")}</div></div><div class="panel"><div class="panel-head"><h2>메일 알림</h2><span>Outlook</span></div><div class="mail-preview"><div class="mail-subject">[NP MKT 구매] ${r.id} · ${esc(item.product)} · ${esc(r.status)}</div><div>수신자: ${esc(r.requester)}<br/>Buyer: ${esc(r.buyer)}<br/>가격: 운영원가 ${money(prices.op)} · Guide ${money(prices.guide)} · List ${prices.list === null ? "미표시" : money(prices.list)}<br/>원가: *<br/><br/>Microsoft Graph 없이 발송 미리보기 모드입니다.</div></div></div></aside></div>`;
}

function contractsViewLegacy() { return `<div class="page-head"><div><h1>계약·지불관리</h1><p>구독·유지보수 계약과 매월 20일 기준 지불대상을 확인합니다.</p></div><label class="btn btn-secondary contract-upload-label"><input id="contractFileInput" type="file" accept=".xlsx,.xlsm" hidden/>계약 Excel 업로드</label><button class="btn btn-primary" data-action="generate-payments">이번 달 지불대상 생성</button></div><div class="cards"><div class="metric"><div class="label">계약 전체</div><div class="value">${state.contracts.length}</div><div class="note">구독·유지보수</div></div><div class="metric"><div class="label">30일 이내 만기</div><div class="value">${state.contracts.filter((c) => c.state === "30일 이내").length}</div><div class="note">Buyer 알림 대상</div></div><div class="metric"><div class="label">지불 기준일</div><div class="value">20일</div><div class="note">매월 자동 후보 생성</div></div><div class="metric"><div class="label">메일 모드</div><div class="value" style="font-size:20px">미리보기</div><div class="note">회사 승인 경로 연결 전</div></div></div><div class="panel"><div class="panel-head"><h2>계약 목록</h2><span>만기알림 수신자: Buyer</span></div><table class="table"><thead><tr><th>계약ID</th><th>업체</th><th>제품</th><th>구분</th><th>종료일</th><th>청구주기</th><th>Buyer</th><th>상태</th></tr></thead><tbody>${state.contracts.map((c) => `<tr><td><strong>${c.id}</strong></td><td>${esc(c.vendor)}</td><td>${esc(c.product)}</td><td>${esc(c.type)}</td><td>${c.end}</td><td>${c.cycle}</td><td>${esc(c.buyer)}</td><td><span class="status ${c.state === "정상" ? "status-mint" : "status-red"}">${c.state}</span></td></tr>`).join("")}</tbody></table></div><div class="panel"><div class="panel-head"><h2>월별 지불대상</h2><span>2026-08 · 매월 20일 기준</span></div><table class="table"><thead><tr><th>지불대상</th><th>업체</th><th>제품</th><th>예정금액</th><th>증빙</th><th>처리상태</th><th>담당 Buyer</th></tr></thead><tbody><tr><td>PAY-2026-08-001</td><td>Microsoft Korea</td><td>M365 Copilot</td><td class="num">₩18,000,000</td><td>대기</td><td><span class="status status-gold">검토중</span></td><td>김희균</td></tr><tr><td>PAY-2026-08-002</td><td>Zoom</td><td>Zoom Workplace</td><td class="num">USD 1,440</td><td>미수령</td><td><span class="status status-red">자료요청</span></td><td>김희균</td></tr></tbody></table></div>`; }

function analysisView() {
  const rows = state.cdTransactions || [];
  if (!rows.length) return `<div class="page-head"><div><h1>구매 분석</h1><p>CD집계표 업로드 데이터를 기반으로 구매 현황을 분석합니다.</p></div></div><div class="panel"><div class="empty">분석할 데이터가 없습니다. CD 업로드 메뉴에서 원본 파일을 업로드해 주세요.</div></div>`;
  const fy = (date) => { const d = new Date(date); if (Number.isNaN(d.getTime())) return "미분류"; const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `FY${String(year).slice(-2)}`; };
  const fyOptions = [...new Set(rows.map((r) => fy(r.taxInvoiceDate)).filter((v) => v !== "미분류"))].sort().reverse();
  const buyers = [...new Set(rows.map((r) => r.buyer).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
  const categories = [...new Set(rows.map((r) => r.categoryLarge).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
  return `<div class="page-head"><div><h1>구매 분석</h1><p>세금계산서날짜 기준 · FY 4월~3월 · 원본 근거 행을 함께 확인합니다.</p></div><span class="status status-mint">누적 ${rows.length.toLocaleString("ko-KR")}건</span></div><div class="panel"><div class="analysis-filters"><select id="analysisFy"><option value="">전체 FY</option>${fyOptions.map((v) => `<option>${v}</option>`).join("")}</select><select id="analysisBuyer"><option value="">전체 Buyer</option>${buyers.map((v) => `<option>${esc(v)}</option>`).join("")}</select><select id="analysisCategory"><option value="">전체 대분류</option>${categories.map((v) => `<option>${esc(v)}</option>`).join("")}</select><input id="analysisSearch" class="search" placeholder="모델명·업체명·구매용도 검색"/><button class="btn btn-primary" id="analysisApply">조회</button><button class="btn btn-secondary" id="analysisReset">초기화</button></div></div><div id="analysisBody"></div>`;
}

function pricingView() { const rows = state.cdTransactions || []; return `<div class="page-head"><div><h1>예상 단가·업체 분석</h1><p>동일 모델의 과거 단가와 업체별 거래 실적을 비교합니다.</p></div><span class="status status-mint">세금계산서날짜 기준</span></div><div class="panel"><div class="analysis-filters"><input id="pricingSearch" class="search" placeholder="모델명·업체명·카테고리 검색"/><button class="btn btn-primary" id="pricingApply">조회</button><button class="btn btn-secondary" id="pricingReset">초기화</button></div></div><div id="pricingBody">${rows.length ? "" : `<div class="panel"><div class="empty">분석할 데이터가 없습니다. CD 업로드 메뉴에서 원본 파일을 업로드해 주세요.</div></div>`}</div>`; }
function bindPricingEvents() { const refresh = () => { const term = (document.querySelector("#pricingSearch")?.value || "").toLowerCase(); const rows = (state.cdTransactions || []).filter((r) => `${r.modelName || ""} ${r.supplierName || ""} ${r.categoryLarge || ""}`.toLowerCase().includes(term)); const models = new Map(); rows.filter((r) => r.modelName).forEach((r) => { const key = r.modelName; const item = models.get(key) || []; item.push(r); models.set(key, item); }); const suppliers = new Map(); rows.filter((r) => r.supplierName).forEach((r) => { const key = r.supplierName; const item = suppliers.get(key) || []; item.push(r); suppliers.set(key, item); }); const priceRows = [...models.entries()].map(([model, items]) => { const prices = items.map((r) => Number(r.unitPrice || 0)).filter((v) => v > 0); const recent = items.slice().sort((a, b) => new Date(b.taxInvoiceDate) - new Date(a.taxInvoiceDate))[0]; return { model, min: Math.min(...prices), avg: prices.length ? prices.reduce((s, v) => s + v, 0) / prices.length : 0, recent: recent?.unitPrice || 0, date: recent?.taxInvoiceDate || "-", count: items.length }; }).sort((a, b) => b.count - a.count); const supplierRows = [...suppliers.entries()].map(([supplier, items]) => { const amount = items.reduce((s, r) => s + Number(r.purchaseAmount || 0), 0); const prices = items.map((r) => Number(r.unitPrice || 0)).filter((v) => v > 0); return { supplier, amount, count: items.length, avg: prices.length ? prices.reduce((s, v) => s + v, 0) / prices.length : 0, last: items.slice().sort((a, b) => new Date(b.taxInvoiceDate) - new Date(a.taxInvoiceDate))[0]?.taxInvoiceDate || "-" }; }).sort((a, b) => b.amount - a.amount); const body = document.querySelector("#pricingBody"); if (!body) return; body.innerHTML = `<div class="cards"><div class="metric"><div class="label">검색 결과</div><div class="value">${rows.length.toLocaleString("ko-KR")}</div><div class="note">구매 이력 행</div></div><div class="metric"><div class="label">모델 수</div><div class="value">${models.size.toLocaleString("ko-KR")}</div><div class="note">단가 비교 가능 모델</div></div><div class="metric"><div class="label">업체 수</div><div class="value">${suppliers.size.toLocaleString("ko-KR")}</div><div class="note">거래 업체</div></div><div class="metric"><div class="label">유지보수 이력</div><div class="value">${rows.filter((r) => String(r.purchasePurpose || "").includes("유지보수")).length.toLocaleString("ko-KR")}</div><div class="note">자동 유지보수 가능 후보</div></div></div><div class="panel"><div class="panel-head"><h2>모델별 예상 단가</h2><span>최저가 · 평균가 · 최근가 · 최대 100건</span></div>${priceRows.length ? `<table class="table"><thead><tr><th>모델명</th><th>거래건수</th><th>최저가</th><th>평균가</th><th>최근가</th><th>최근 구매일</th></tr></thead><tbody>${priceRows.slice(0,100).map((r) => `<tr><td>${esc(r.model)}</td><td>${r.count}</td><td class="num">${money(r.min)}</td><td class="num">${money(r.avg)}</td><td class="num">${money(r.recent)}</td><td>${r.date || "-"}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">동일 모델 단가를 비교할 수 있는 모델명이 없습니다.</div>`}</div><div class="panel"><div class="panel-head"><h2>업체별 거래 분석</h2><span>구매금액 상위 100개</span></div>${supplierRows.length ? `<table class="table"><thead><tr><th>업체</th><th>거래건수</th><th>구매금액</th><th>평균단가</th><th>최근 거래일</th></tr></thead><tbody>${supplierRows.slice(0,100).map((r) => `<tr><td>${esc(r.supplier)}</td><td>${r.count}</td><td class="num">${money(r.amount)}</td><td class="num">${money(r.avg)}</td><td>${r.last || "-"}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">업체 데이터가 없습니다.</div>`}</div>`; }; document.querySelector("#pricingApply")?.addEventListener("click", refresh); document.querySelector("#pricingSearch")?.addEventListener("keydown", (e) => { if (e.key === "Enter") refresh(); }); document.querySelector("#pricingReset")?.addEventListener("click", () => { const e = document.querySelector("#pricingSearch"); if (e) e.value = ""; refresh(); }); refresh(); }

function bindPricingEventsV2() { const refresh = () => { const rawTerm = (document.querySelector("#pricingSearch")?.value || "").normalize("NFKC").toLocaleLowerCase("ko-KR").trim(); const term = (pricingSearchAliases[rawTerm] || rawTerm).toLocaleLowerCase("ko-KR"); const rows = (state.cdTransactions || []).filter((r) => `${r.modelName || ""} ${r.supplierName || ""} ${r.categoryLarge || ""} ${r.categorySmall || ""} ${r.buyer || ""} ${r.purchasePurpose || ""} ${r.poNumber || ""}`.normalize("NFKC").toLocaleLowerCase("ko-KR").includes(term)); const suppliers = new Map(); rows.filter((r) => r.supplierName).forEach((r) => { const a = suppliers.get(r.supplierName) || []; a.push(r); suppliers.set(r.supplierName, a); }); const models = new Map(); rows.filter((r) => r.modelName).forEach((r) => { const a = models.get(r.modelName) || []; a.push(r); models.set(r.modelName, a); }); const modelRows = [...models].map(([name, items]) => { const ps = items.map((r) => Number(r.unitPrice || 0)).filter((v) => v > 0); const recent = items.slice().sort((a, b) => new Date(b.taxInvoiceDate) - new Date(a.taxInvoiceDate))[0]; return { name, count: items.length, min: Math.min(...ps), avg: ps.reduce((s, v) => s + v, 0) / (ps.length || 1), recent: recent?.unitPrice || 0, date: recent?.taxInvoiceDate || "-" }; }); const supplierRows = [...suppliers].map(([name, items]) => ({ name, count: items.length, amount: items.reduce((s, r) => s + Number(r.purchaseAmount || 0), 0), avg: items.reduce((s, r) => s + Number(r.unitPrice || 0), 0) / items.length, date: items.slice().sort((a, b) => new Date(b.taxInvoiceDate) - new Date(a.taxInvoiceDate))[0]?.taxInvoiceDate || "-" })).sort((a, b) => b.amount - a.amount); const body = document.querySelector("#pricingBody"); if (!body) return; body.innerHTML = `<div class="cards"><div class="metric"><div class="label">검색 결과</div><div class="value">${rows.length.toLocaleString("ko-KR")}</div><div class="note">구매 이력 행</div></div><div class="metric"><div class="label">모델 수</div><div class="value">${models.size.toLocaleString("ko-KR")}</div><div class="note">단가 비교 가능 모델</div></div><div class="metric"><div class="label">업체 수</div><div class="value">${suppliers.size.toLocaleString("ko-KR")}</div><div class="note">거래 업체</div></div><div class="metric"><div class="label">유지보수 이력</div><div class="value">${rows.filter((r) => String(r.purchasePurpose || "").includes("유지보수")).length.toLocaleString("ko-KR")}</div><div class="note">검색 결과 기준</div></div></div><div class="panel"><div class="panel-head"><h2>모델별 예상 단가</h2><span>최저가 · 평균가 · 최근가</span></div>${modelRows.length ? `<table class="table"><thead><tr><th>모델명</th><th>거래건수</th><th>최저가</th><th>평균가</th><th>최근가</th><th>최근 구매일</th></tr></thead><tbody>${modelRows.slice(0,100).map((r) => `<tr><td>${esc(r.name)}</td><td>${r.count}</td><td class="num">${money(r.min)}</td><td class="num">${money(r.avg)}</td><td class="num">${money(r.recent)}</td><td>${r.date}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">조건에 맞는 모델 단가가 없습니다.</div>`}</div><div class="panel"><div class="panel-head"><h2>업체별 거래 분석</h2><span>구매금액 상위 100개</span></div>${supplierRows.length ? `<table class="table"><thead><tr><th>업체</th><th>거래건수</th><th>구매금액</th><th>평균단가</th><th>최근 거래일</th></tr></thead><tbody>${supplierRows.slice(0,100).map((r) => `<tr><td>${esc(r.name)}</td><td>${r.count}</td><td class="num">${money(r.amount)}</td><td class="num">${money(r.avg)}</td><td>${r.date}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">조건에 맞는 업체가 없습니다.</div>`}</div>`; }; document.querySelector("#pricingApply")?.addEventListener("click", refresh); document.querySelector("#pricingSearch")?.addEventListener("keydown", (e) => { if (e.key === "Enter") refresh(); }); document.querySelector("#pricingReset")?.addEventListener("click", () => { const e = document.querySelector("#pricingSearch"); if (e) e.value = ""; refresh(); }); refresh(); }

function costdownView() { const rows = state.cdTransactions || []; if (!rows.length) return `<div class="page-head"><div><h1>Cost Down 분석</h1><p>원본 CD 금액·절감률을 기준으로 절감 성과를 분석합니다.</p></div></div><div class="panel"><div class="empty">분석할 데이터가 없습니다. CD 업로드 메뉴에서 원본 파일을 업로드해 주세요.</div></div>`; const fy = [...new Set(rows.map((r) => fyLabel(r.taxInvoiceDate)).filter(Boolean))].sort().reverse(); const buyers = [...new Set(rows.map((r) => r.buyer).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko")); const cats = [...new Set(rows.map((r) => r.categoryLarge).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko")); return `<div class="page-head"><div><h1>Cost Down 분석</h1><p>세금계산서날짜 기준 · 원본 Cost Down 금액·절감률을 그대로 사용합니다.</p></div><span class="status status-mint">누적 ${rows.length.toLocaleString("ko-KR")}건</span></div><div class="panel"><div class="analysis-filters"><select id="cdFy"><option value="">전체 FY</option>${fy.map((v) => `<option>${v}</option>`).join("")}</select><select id="cdBuyer"><option value="">전체 Buyer</option>${buyers.map((v) => `<option>${esc(v)}</option>`).join("")}</select><select id="cdCategory"><option value="">전체 대분류</option>${cats.map((v) => `<option>${esc(v)}</option>`).join("")}</select><button class="btn btn-primary" id="cdApply">조회</button><button class="btn btn-secondary" id="cdReset">초기화</button></div></div><div id="costdownBody"></div>`; }
function fyLabel(date) { const d = new Date(date); if (Number.isNaN(d.getTime())) return "미분류"; return `FY${String(d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1).slice(-2)}`; }
function bindCostdownEvents() { const refresh = (announce = false) => { renderCostdownBodyFixed(); const count = document.querySelector("#cdResultCount")?.textContent || "0건"; if (announce) toast(`Cost Down 조회 완료: ${count}`); }; document.querySelector("#cdApply")?.addEventListener("click", () => refresh(true)); document.querySelector("#cdReset")?.addEventListener("click", () => { ["#cdFy", "#cdBuyer", "#cdCategory"].forEach((s) => { const e = document.querySelector(s); if (e) e.value = ""; }); refresh(true); }); refresh(); }
function renderCostdownBody() { const fy = document.querySelector("#cdFy")?.value || ""; const buyer = document.querySelector("#cdBuyer")?.value || ""; const category = document.querySelector("#cdCategory")?.value || ""; const rows = (state.cdTransactions || []).filter((r) => (!fy || fyLabel(r.taxInvoiceDate) === fy) && (!buyer || r.buyer === buyer) && (!category || r.categoryLarge === category)); const purchase = rows.reduce((s, r) => s + Number(r.purchaseAmount || 0), 0); const saving = rows.reduce((s, r) => s + Number(r.costDownAmount || 0), 0); const rate = purchase ? saving / purchase * 100 : 0; const savingRows = rows.filter((r) => Number(r.costDownAmount || 0) > 0); const group = (key) => { const m = new Map(); rows.forEach((r) => { const d = new Date(r.taxInvoiceDate); const k = key === "taxInvoiceDate" ? (Number.isNaN(d.getTime()) ? "미분류" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`) : (r[key] || "미분류"); const v = m.get(k) || { saving: 0, purchase: 0, count: 0 }; v.saving += Number(r.costDownAmount || 0); v.purchase += Number(r.purchaseAmount || 0); v.count += 1; m.set(k, v); }); return [...m.entries()].sort((a, b) => b[1].saving - a[1].saving); }; const list = (items) => { const max = items[0]?.[1].saving || 1; return items.slice(0, 8).map(([name, v]) => `<div class="analysis-row"><span title="${esc(name)}">${esc(name)}</span><div class="analysis-track"><i style="width:${Math.max(v.saving ? 2 : 0, v.saving / max * 100)}%"></i></div><b>${money(v.saving)}</b><em>${v.purchase ? (v.saving / v.purchase * 100).toFixed(1) : "0.0"}%</em></div>`).join("") || `<div class="empty">조건에 맞는 데이터가 없습니다.</div>`; const body = document.querySelector("#costdownBody"); if (!body) return; body.innerHTML = `<div class="cards"><div class="metric analysis-metric" data-cd-focus title="클릭하면 절감 근거 행으로 이동"><div class="label">절감액</div><div class="value" title="${money(saving)}">${money(saving)}</div><div class="note">원본 Cost Down 금액</div></div><div class="metric"><div class="label">절감률</div><div class="value">${rate.toFixed(1)}%</div><div class="note">절감액 ÷ 구매금액</div></div><div class="metric"><div class="label">구매금액</div><div class="value" title="${money(purchase)}">${money(purchase)}</div><div class="note">필터 결과</div></div><div class="metric"><div class="label">절감 발생 건수</div><div class="value">${savingRows.length.toLocaleString("ko-KR")}</div><div class="note">전체 ${rows.length.toLocaleString("ko-KR")}건 중</div></div></div><div class="analysis-grid"><div class="panel"><div class="panel-head"><h2>월별 절감액</h2><span>절감액 기준</span></div>${list(group("taxInvoiceDate"))}</div><div class="panel"><div class="panel-head"><h2>대분류별 절감액</h2><span>절감액 · 절감률</span></div>${list(group("categoryLarge"))}</div><div class="panel"><div class="panel-head"><h2>Buyer별 절감액</h2><span>절감액 · 절감률</span></div>${list(group("buyer"))}</div><div class="panel"><div class="panel-head"><h2>업체별 절감액</h2><span>절감액 · 절감률</span></div>${list(group("supplierName"))}</div></div><div class="panel" id="costdownEvidence"><div class="panel-head"><h2>절감 근거 행</h2><span id="cdResultCount">${savingRows.length.toLocaleString("ko-KR")}건 조회됨 · Cost Down 발생 건 최대 100건</span></div>${historyTable(savingRows.slice(0, 100))}</div>`; document.querySelector("[data-cd-focus]")?.addEventListener("click", () => document.querySelector("#costdownEvidence")?.scrollIntoView({ behavior: "smooth", block: "start" })); }
}

function renderCostdownBodyFixed() {
  const fy = document.querySelector("#cdFy")?.value || "";
  const buyer = document.querySelector("#cdBuyer")?.value || "";
  const category = document.querySelector("#cdCategory")?.value || "";
  const rows = (state.cdTransactions || []).filter((r) => (!fy || fyLabel(r.taxInvoiceDate) === fy) && (!buyer || r.buyer === buyer) && (!category || r.categoryLarge === category));
  const purchase = rows.reduce((s, r) => s + Number(r.purchaseAmount || 0), 0);
  const saving = rows.reduce((s, r) => s + Number(r.costDownAmount || 0), 0);
  const savingRows = rows.filter((r) => Number(r.costDownAmount || 0) > 0);
  const rate = purchase ? saving / purchase * 100 : 0;
  const body = document.querySelector("#costdownBody");
  if (!body) return;
  body.innerHTML = `<div class="cards"><div class="metric analysis-metric" data-cd-list="saving" title="클릭하면 절감액 리스트로 이동"><div class="label">절감액</div><div class="value" title="${money(saving)}">${money(saving)}</div><div class="note">절감 발생 행 · 목록 보기</div></div><div class="metric analysis-metric" data-cd-list="rate" title="클릭하면 절감률 순 리스트로 이동"><div class="label">절감률</div><div class="value">${rate.toFixed(1)}%</div><div class="note">절감률 높은 순 · 목록 보기</div></div><div class="metric analysis-metric" data-cd-list="purchase" title="클릭하면 전체 구매 리스트로 이동"><div class="label">구매금액</div><div class="value" title="${money(purchase)}">${money(purchase)}</div><div class="note">필터 결과 · 목록 보기</div></div><div class="metric analysis-metric" data-cd-list="saving" title="클릭하면 절감 발생 리스트로 이동"><div class="label">절감 발생 건수</div><div class="value">${savingRows.length.toLocaleString("ko-KR")}</div><div class="note">전체 ${rows.length.toLocaleString("ko-KR")}건 중 · 목록 보기</div></div></div><div class="panel" id="costdownEvidence"><div class="panel-head"><h2 id="cdEvidenceTitle">절감 근거 행</h2><span id="cdResultCount">${savingRows.length.toLocaleString("ko-KR")}건 조회됨 · 최대 100건 표시</span></div><div id="cdEvidenceTable">${historyTable(savingRows.slice(0, 100))}</div></div>`;
  const lists = { saving: savingRows, rate: rows.slice().sort((a, b) => Number(b.costDownRate || 0) - Number(a.costDownRate || 0)), purchase: rows };
  const titles = { saving: "절감 근거 행", rate: "절감률 순 근거 행", purchase: "구매금액 근거 행" };
  document.querySelectorAll("[data-cd-list]").forEach((card) => card.addEventListener("click", () => { const key = card.dataset.cdList; const selected = lists[key] || savingRows; document.querySelector("#cdEvidenceTitle").textContent = titles[key]; document.querySelector("#cdResultCount").textContent = `${selected.length.toLocaleString("ko-KR")}건 조회됨 · 최대 100건 표시`; document.querySelector("#cdEvidenceTable").innerHTML = historyTable(selected.slice(0, 100)); document.querySelector("#costdownEvidence")?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
}

function renderAnalysisBody() {
  const all = state.cdTransactions || [];
  const fy = (date) => { const d = new Date(date); if (Number.isNaN(d.getTime())) return "미분류"; return `FY${String(d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1).slice(-2)}`; };
  const fyValue = document.querySelector("#analysisFy")?.value || ""; const buyer = document.querySelector("#analysisBuyer")?.value || ""; const category = document.querySelector("#analysisCategory")?.value || ""; const term = (document.querySelector("#analysisSearch")?.value || "").toLowerCase();
  const rows = all.filter((r) => (!fyValue || fy(r.taxInvoiceDate) === fyValue) && (!buyer || r.buyer === buyer) && (!category || r.categoryLarge === category) && `${r.modelName || ""} ${r.supplierName || ""} ${r.purchasePurpose || ""} ${r.poNumber || ""}`.toLowerCase().includes(term));
  const amount = rows.reduce((s, r) => s + Number(r.purchaseAmount || 0), 0); const qty = rows.reduce((s, r) => s + Number(r.quantity || 0), 0); const costDown = rows.reduce((s, r) => s + Number(r.costDownAmount || 0), 0);
  const group = (key) => { const map = new Map(); rows.forEach((r) => { const k = r[key] || "미분류"; const v = map.get(k) || { amount: 0, count: 0 }; v.amount += Number(r.purchaseAmount || 0); v.count += 1; map.set(k, v); }); return [...map.entries()].sort((a, b) => b[1].amount - a[1].amount); };
  const monthly = group("taxInvoiceDate").reduce((map, item) => { const date = item[0]; const d = new Date(date); const key = Number.isNaN(d.getTime()) ? "미분류" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; map.set(key, (map.get(key) || { amount: 0, count: 0 })); map.get(key).amount += item[1].amount; map.get(key).count += item[1].count; return map; }, new Map());
  const bars = (items) => { const max = items[0]?.[1].amount || 1; return items.slice(0, 8).map(([name, v]) => `<div class="analysis-row"><span title="${esc(name)}">${esc(name)}</span><div class="analysis-track"><i style="width:${Math.max(2, v.amount / max * 100)}%"></i></div><b>${money(v.amount)}</b><em>${v.count}건</em></div>`).join("") || `<div class="empty">조건에 맞는 데이터가 없습니다.</div>`; };
  const body = document.querySelector("#analysisBody"); if (!body) return;
  body.innerHTML = `<div class="cards"><div class="metric analysis-metric" data-analysis-focus title="클릭하면 근거 행으로 이동"><div class="label">구매금액</div><div class="value" title="${money(amount)}">${money(amount)}</div><div class="note">필터 결과 · 클릭하여 목록 보기</div></div><div class="metric analysis-metric" data-analysis-focus title="클릭하면 근거 행으로 이동"><div class="label">구매 건수</div><div class="value">${rows.length.toLocaleString("ko-KR")}</div><div class="note">원본 행 기준 · 목록 보기</div></div><div class="metric analysis-metric" data-analysis-focus title="클릭하면 근거 행으로 이동"><div class="label">수량</div><div class="value">${qty.toLocaleString("ko-KR")}</div><div class="note">수량 합계 · 목록 보기</div></div><div class="metric analysis-metric" data-analysis-focus title="클릭하면 근거 행으로 이동"><div class="label">Cost Down</div><div class="value" title="${money(costDown)}">${money(costDown)}</div><div class="note">원본 값 기준 · 목록 보기</div></div></div><div class="analysis-grid"><div class="panel"><div class="panel-head"><h2>월별 구매금액</h2><span>${rows.length}건</span></div>${bars([...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0])))}</div><div class="panel"><div class="panel-head"><h2>대분류별 구매금액</h2><span>상위 8개</span></div>${bars(group("categoryLarge"))}</div><div class="panel"><div class="panel-head"><h2>Buyer별 구매금액</h2><span>상위 8명</span></div>${bars(group("buyer"))}</div><div class="panel"><div class="panel-head"><h2>업체별 구매금액</h2><span>상위 8개</span></div>${bars(group("supplierName"))}</div></div><div class="panel" id="analysisEvidence"><div class="panel-head"><h2>근거 행</h2><span id="analysisResultCount">${rows.length.toLocaleString("ko-KR")}건 조회됨 · 최대 100건 표시</span></div>${historyTable(rows.slice(0, 100))}</div>`;
  document.querySelectorAll("[data-analysis-focus]").forEach((card) => card.addEventListener("click", () => document.querySelector("#analysisEvidence")?.scrollIntoView({ behavior: "smooth", block: "start" })));
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((el) => el.addEventListener("click", () => { state.view = el.dataset.view; render(); }));
  document.querySelectorAll("[data-request-id]").forEach((el) => el.addEventListener("click", () => { state.selectedId = el.dataset.requestId; state.view = "detail"; render(); }));
  document.querySelector("#requestSearch")?.addEventListener("input", (e) => { const term = e.target.value.toLowerCase(); document.querySelector("#requestTableWrap").innerHTML = requestTable(state.requests.filter((r) => `${r.id} ${r.requester} ${r.items.map((i) => i.product).join(" ")}`.toLowerCase().includes(term))); document.querySelectorAll("[data-request-id]").forEach((el) => el.addEventListener("click", () => { state.selectedId = el.dataset.requestId; state.view = "detail"; render(); })); });
  document.querySelector("#cdImportForm")?.addEventListener("submit", handleCdImport);
  document.querySelector("#contractFileInput")?.addEventListener("change", handleContractImport);
  document.querySelectorAll("[data-action]").forEach((el) => el.addEventListener("click", () => handleAction(el.dataset.action, el.dataset)));
  document.querySelectorAll("[data-contract-list]").forEach((el) => el.addEventListener("click", () => document.querySelector(`#${el.dataset.contractList}`)?.scrollIntoView({ behavior: "smooth", block: "start" })));
  if (state.view === "contracts") { enhanceShipmentsPanel(); enhanceContractPanels(); }
  if (state.view === "imports") { enhanceForecastReadiness(); }
  if (state.view === "forecast") { bindForecastEvents(); }
  if (state.view === "business") { bindBusinessModelEvents(); }
  if (state.view === "dashboard") { enhanceInsightDashboard(); }
}

function enhanceContractPanels() {
  const content = document.querySelector(".content");
  if (!content || content.dataset.contractPanelsEnhanced === "true") return;
  const contracts = state.contracts || [];
  const panels = [...content.querySelectorAll(".panel")];
  const paymentPanel = panels.find((p) => p.textContent.includes("월별 지급 대상"));
  const shipmentPanel = document.querySelector("#shipmentsList");
  const contractPanel = panels.find((p) => p.textContent.includes("유지보수 계약 목록"));
  const historyPanel = panels.find((p) => p.textContent.includes("업로드 이력"));
  const pageHead = content.querySelector(".page-head");
  const cards = content.querySelector(".cards");
  [paymentPanel, shipmentPanel, contractPanel, historyPanel].filter(Boolean).forEach((p) => content.appendChild(p));
  if (pageHead) content.prepend(pageHead);
  if (cards) pageHead?.after(cards);
  content.dataset.contractPanelsEnhanced = "true";
  // 인수증·송장·AP 전표는 Ariba에서 처리하므로 이 화면에서는 상태만 관리합니다.
  if (paymentPanel) {
    const paymentTable = paymentPanel.querySelector("table");
    paymentTable?.querySelectorAll("tr").forEach((row) => {
      row.cells[5]?.remove();
      row.cells[4]?.remove();
    });
  }
  addPanelFilters(paymentPanel, "payment");
  enhancePaymentActions(paymentPanel);
  addPanelFilters(shipmentPanel, "shipment");
  addPanelFilters(contractPanel, "contract");
  enhanceContractActions(contractPanel);
  enhanceExpiryAlerts(content, contracts || []);
  enhancePaymentHistory(content);
}

function enhancePaymentHistory(content) {
  if (!content || document.querySelector("#paymentHistory")) return;
  const history = state.paymentHistory || [];
  const panel = document.createElement("div"); panel.className = "panel"; panel.id = "paymentHistory";
  panel.innerHTML = `<div class="panel-head"><h2>지급 처리 이력</h2><span>${history.length}건</span></div>${history.length ? `<table class="table"><thead><tr><th>처리일시</th><th>지급 건</th><th>변경 전</th><th>변경 후</th><th>처리자</th><th>변경 내용</th></tr></thead><tbody>${history.slice().reverse().slice(0,100).map((h) => `<tr><td>${esc(h.changedAt)}</td><td>${esc(h.paymentId || "-")}</td><td>${esc(h.beforeStatus || "-")}</td><td><span class="status ${statusClass(h.afterStatus)}">${esc(h.afterStatus || "-")}</span></td><td>${esc(h.changedBy || "-")}</td><td>${esc(h.detail || "상태 변경")}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">지급 처리 이력이 없습니다.</div>`}`;
  content.appendChild(panel);
}

function enhanceExpiryAlerts(content, contracts) {
  if (!content || document.querySelector("#expiryAlerts")) return;
  const today = new Date();
  const alerts = contracts.map((c) => { const end = new Date(c.endDate || c.end); const days = Number.isNaN(end.getTime()) ? null : Math.ceil((end - today) / 86400000); return { c, days }; }).filter((x) => x.days !== null && x.days >= 0 && x.days <= 60).sort((a, b) => a.days - b.days);
  const panel = document.createElement("div"); panel.className = "panel"; panel.id = "expiryAlerts";
  panel.innerHTML = `<div class="panel-head"><h2>계약 만료 알림 대상</h2><span>D-60 · D-30 · 수신자: 담당 Buyer</span></div>${alerts.length ? `<div class="table-scroll"><table class="table"><thead><tr><th>계약 ID</th><th>업체</th><th>제품/설명</th><th>종료일</th><th>남은 일수</th><th>Buyer</th><th>알림 상태</th></tr></thead><tbody>${alerts.map(({ c, days }) => { const alertKey = `${c.contractId || c.id}-${days <= 30 ? "D30" : "D60"}`; const sent = (state.alertHistory || []).some((a) => a.key === alertKey); return `<tr><td>${esc(c.contractId || c.id || "-")}</td><td>${esc(c.vendor || c.supplierName || "-")}</td><td class="wrap-cell">${esc(c.product || "-")}</td><td>${esc(c.endDate || c.end || "-")}</td><td><span class="status ${days <= 30 ? "status-red" : "status-gold"}">D-${days}</span></td><td>${esc(c.buyer || "Buyer 지정 필요")}</td><td>${sent ? "발송 이력 있음" : "발송 대기"}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty">D-60 이내 계약 만료 대상이 없습니다.</div>`}<div class="notice">알림은 계약별 D-60과 D-30 기준으로 각 1회만 기록합니다. Outlook 자동 발송 연결 전에는 발송 대기 상태로 관리됩니다.</div>`;
  content.appendChild(panel);
}

function enhanceContractActions(panel) {
  if (!panel || panel.dataset.contractActionsEnhanced === "true") return;
  const table = panel.querySelector("table");
  if (!table) return;
  const canEdit = ["buyer", "admin"].includes(state.role);
  if (canEdit) {
    table.querySelector("thead tr")?.insertAdjacentHTML("beforeend", "<th>관리</th>");
    [...table.querySelectorAll("tbody tr")].forEach((row, index) => row.insertAdjacentHTML("beforeend", `<td><button class="btn btn-secondary contract-edit" data-contract-index="${index}">계약 수정</button></td>`));
    panel.querySelectorAll(".contract-edit").forEach((button) => button.addEventListener("click", () => openContractEditor(Number(button.dataset.contractIndex))));
  }
  panel.dataset.contractActionsEnhanced = "true";
}

function openContractEditor(index) {
  const contract = (state.contracts || [])[index];
  if (!contract) return;
  const modal = document.createElement("div");
  modal.innerHTML = `<div style="position:fixed;inset:0;background:rgba(20,43,68,.36);display:grid;place-items:center;z-index:10"><div class="detail-card" style="width:600px;max-width:calc(100vw - 32px)"><div class="detail-title"><div><h2>계약 정보 수정</h2><p>${esc(contract.contractId || contract.id || "계약")} · ${esc(contract.vendor || contract.supplierName || "업체 미정")}</p></div><button class="btn btn-secondary" data-close>닫기</button></div><form id="contractEditForm"><div class="form-grid" style="margin-top:20px"><div class="field"><label>계약 종료일</label><input name="endDate" type="date" value="${esc(String(contract.endDate || contract.end || "").slice(0,10))}" /></div><div class="field"><label>지급월도</label><input name="billingCycle" value="${esc(contract.billingCycle || contract.cycle || "")}" placeholder="예: 매월 / 03월/06월/09월/12월" /></div><div class="field"><label>통화</label><select name="currency"><option>KRW</option><option>USD</option><option>EUR</option><option>JPY</option><option>CNY</option></select></div><div class="field"><label>환율</label><input name="exchangeRate" type="number" min="0" step="0.0001" value="${esc(contract.exchangeRate || "")}" placeholder="사용자 직접 입력" /></div><div class="field full"><label>변경 사유</label><input name="reason" required placeholder="계약 연장, 지급월도 변경 등" /></div></div><div class="action-row"><button type="button" class="btn btn-secondary" data-close>취소</button><button class="btn btn-primary">저장</button></div></form></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector("[name=currency]").value = contract.currency || "KRW";
  modal.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => modal.remove()));
  modal.querySelector("#contractEditForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const before = { endDate: contract.endDate || contract.end, billingCycle: contract.billingCycle || contract.cycle, currency: contract.currency || "KRW", exchangeRate: contract.exchangeRate || "" };
    contract.endDate = String(form.get("endDate") || ""); contract.end = contract.endDate; contract.billingCycle = String(form.get("billingCycle") || ""); contract.cycle = contract.billingCycle; contract.currency = String(form.get("currency")); contract.exchangeRate = Number(form.get("exchangeRate")) || null; contract.updatedAt = new Date().toLocaleString("ko-KR"); contract.updatedBy = roles[state.role].name;
    state.contractChangeHistory = state.contractChangeHistory || []; state.contractChangeHistory.push({ contractId: contract.contractId || contract.id, changedAt: contract.updatedAt, changedBy: contract.updatedBy, reason: String(form.get("reason")), before, after: { endDate: contract.endDate, billingCycle: contract.billingCycle, currency: contract.currency, exchangeRate: contract.exchangeRate } });
    saveState(); modal.remove(); render(); toast("계약 정보와 변경 이력을 저장했습니다.");
  });
}

function enhancePaymentActions(panel) {
  if (!panel || panel.dataset.paymentActionsEnhanced === "true") return;
  const table = panel.querySelector("table");
  if (!table) return;
  const canEdit = state.role === "buyer";
  const head = table.querySelector("thead tr");
  if (canEdit) head?.insertAdjacentHTML("beforeend", "<th>처리</th>");
  [...table.querySelectorAll("tbody tr")].forEach((row, index) => { if (canEdit) row.insertAdjacentHTML("beforeend", `<td><button class="btn btn-secondary payment-edit" data-payment-index="${index}">상태 변경</button></td>`); });
  panel.querySelectorAll(".payment-edit").forEach((button) => button.addEventListener("click", () => openPaymentEditor(Number(button.dataset.paymentIndex))));
  panel.dataset.paymentActionsEnhanced = "true";
}

function openPaymentEditorLegacy(index) {
  const candidate = paymentCandidateRows()[index];
  if (!candidate) return;
  state.maintenancePayments = state.maintenancePayments || [];
  const payment = state.maintenancePayments.find((p) => p.contractId === (candidate.contractId || candidate.id)) || {};
  const modal = document.createElement("div");
  modal.innerHTML = `<div style="position:fixed;inset:0;background:rgba(20,43,68,.36);display:grid;place-items:center;z-index:10"><div class="detail-card" style="width:560px;max-width:calc(100vw - 32px)"><div class="detail-title"><div><h2>지급 처리 입력</h2><p>${esc(candidate.supplierName || candidate.vendor || "업체 미정")} · ${esc(candidate.product || "")}</p></div><button class="btn btn-secondary" data-close>닫기</button></div><form id="paymentEditForm"><div class="form-grid" style="margin-top:20px"><div class="field"><label>처리 상태</label><select name="status"><option>인수증 발행</option><option>인수증 승인</option><option>인보이스 발행</option><option>인보이스 승인</option><option>AP 전표 완료</option></select></div><div class="field"><label>인수증 번호</label><input name="receiptNumber" value="${esc(payment.receiptNumber || "")}" placeholder="인수증 번호" /></div><div class="field"><label>인보이스 번호</label><input name="invoiceNumber" value="${esc(payment.invoiceNumber || "")}" placeholder="인보이스/세금계산서 번호" /></div><div class="field"><label>AP 전표번호</label><input name="apSlipNumber" value="${esc(payment.apSlipNumber || "")}" placeholder="AP 전표번호" /></div><div class="field full"><label>증빙 첨부</label><input name="evidence" type="file" accept=".pdf,.xlsx,.xls,.xlsm,.doc,.docx,.png,.jpg,.jpeg" /><small>인수증·인보이스·AP 증빙 / 파일당 최대 10MB</small></div></div><div class="action-row"><button type="button" class="btn btn-secondary" data-close>취소</button><button class="btn btn-primary">저장</button></div></form></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector("[name=status]").value = payment.paymentStatus || "인수증 발행";
  modal.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => modal.remove()));
  modal.querySelector("#paymentEditForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const evidence = event.target.querySelector("[name=evidence]")?.files?.[0];
    if (evidence && evidence.size > 10 * 1024 * 1024) { toast("증빙 파일은 파일당 최대 10MB까지 첨부할 수 있습니다."); return; }
    const key = `${candidate.key || candidate.id}::${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const existing = state.maintenancePayments.find((p) => p.contractId === (candidate.contractId || candidate.id)) || { key, id: `PAY-${Date.now()}`, contractId: candidate.contractId || candidate.id, supplierName: candidate.vendor || candidate.supplierName, product: candidate.product, paymentMonth: candidate.billingCycle || candidate.cycle };
    const beforeStatus = existing.paymentStatus || "지급 예정";
    const afterStatus = String(form.get("status"));
    Object.assign(existing, { paymentStatus: afterStatus, receiptNumber: String(form.get("receiptNumber") || "").trim(), invoiceNumber: String(form.get("invoiceNumber") || "").trim(), apSlipNumber: String(form.get("apSlipNumber") || "").trim(), updatedBy: roles[state.role].name, updatedAt: new Date().toLocaleString("ko-KR"), evidence: evidence ? { name: evidence.name, size: evidence.size, type: evidence.type } : existing.evidence || null });
    state.paymentHistory = state.paymentHistory || [];
    state.paymentHistory.push({ paymentId: existing.id, changedAt: existing.updatedAt, changedBy: existing.updatedBy, beforeStatus, afterStatus, detail: `인수증 ${existing.receiptNumber || "-"} · 인보이스 ${existing.invoiceNumber || "-"} · AP ${existing.apSlipNumber || "-"}${existing.evidence ? ` · 증빙 ${existing.evidence.name}` : ""}` });
    if (!state.maintenancePayments.includes(existing)) state.maintenancePayments.push(existing);
    saveState(); modal.remove(); render(); toast("지급 처리 정보가 저장되었습니다.");
  });
}

function addPanelFilters(panel, kind) {
  if (!panel || panel.querySelector(".list-filter-bar")) return;
  const table = panel.querySelector("table");
  if (!table) return;
  const bar = document.createElement("div");
  bar.className = "analysis-filters list-filter-bar";
  if (kind === "payment") {
    const statuses = [...new Set([...table.querySelectorAll("tbody tr")].map((row) => row.cells[4]?.innerText.trim()).filter(Boolean))];
    bar.innerHTML = `<input class="search list-search" placeholder="업체·제품·계약ID 검색"/><select class="list-status"><option value="">전체 상태</option>${statuses.map((v) => `<option>${esc(v)}</option>`).join("")}</select><select class="list-sort"><option value="default">기본순</option><option value="amount-desc">금액 높은순</option><option value="amount-asc">금액 낮은순</option></select><button class="btn btn-primary list-apply">조회</button><button class="btn btn-secondary list-reset">초기화</button>`;
  } else if (kind === "shipment") {
    const statuses = [...new Set([...table.querySelectorAll("tbody tr")].map((row) => row.cells[8]?.innerText.trim()).filter(Boolean))];
    bar.innerHTML = `<input class="search list-search" placeholder="PO·납품처·품목코드 검색"/><select class="list-status"><option value="">전체 상태</option>${statuses.map((v) => `<option>${esc(v)}</option>`).join("")}</select><select class="list-sort"><option value="default">기본순</option><option value="amount-desc">금액 높은순</option><option value="amount-asc">금액 낮은순</option><option value="date-desc">입고일 최신순</option></select><button class="btn btn-primary list-apply">조회</button><button class="btn btn-secondary list-reset">초기화</button>`;
  } else {
    const buyers = [...new Set([...table.querySelectorAll("tbody tr")].map((row) => row.cells[7]?.innerText.trim()).filter(Boolean))];
    bar.innerHTML = `<input class="search list-search" placeholder="PO·계약ID·업체·제품 검색"/><select class="list-buyer"><option value="">전체 Buyer</option>${buyers.map((v) => `<option>${esc(v)}</option>`).join("")}</select><select class="list-sort"><option value="default">기본순</option><option value="end-asc">종료일 빠른순</option><option value="amount-desc">금액 높은순</option><option value="amount-asc">금액 낮은순</option></select><button class="btn btn-primary list-apply">조회</button><button class="btn btn-secondary list-reset">초기화</button>`;
  }
  panel.querySelector(".panel-head")?.after(bar);
  const refresh = () => {
    const query = bar.querySelector(".list-search")?.value.trim().toLocaleLowerCase("ko-KR") || "";
    const filter = bar.querySelector(".list-status, .list-buyer")?.value || "";
    const sort = bar.querySelector(".list-sort")?.value || "default";
    const tbody = table.querySelector("tbody");
    const rows = [...tbody.querySelectorAll("tr")];
    rows.forEach((row) => { const haystack = row.innerText.toLocaleLowerCase("ko-KR"); const statusOrBuyer = kind === "payment" ? row.cells[4]?.innerText.trim() : kind === "shipment" ? row.cells[8]?.innerText.trim() : row.cells[7]?.innerText.trim(); row.hidden = Boolean((query && !haystack.includes(query)) || (filter && statusOrBuyer !== filter)); });
    const visible = rows.filter((row) => !row.hidden);
    visible.sort((a, b) => {
        if (sort === "amount-desc" || sort === "amount-asc") { const col = kind === "payment" ? 3 : kind === "shipment" ? 5 : 6; const av = Number((a.cells[col]?.innerText || "").replace(/[^0-9.-]/g, "")) || 0; const bv = Number((b.cells[col]?.innerText || "").replace(/[^0-9.-]/g, "")) || 0; return sort === "amount-desc" ? bv - av : av - bv; }
        if (sort === "date-desc") return String(b.cells[7]?.innerText || "").localeCompare(String(a.cells[7]?.innerText || ""));
      if (sort === "end-asc") return String(a.cells[4]?.innerText || "").localeCompare(String(b.cells[4]?.innerText || ""));
      return 0;
    });
    visible.forEach((row) => tbody.appendChild(row));
    const count = panel.querySelector(".panel-head span");
    if (count) count.textContent = `${visible.length}건 · 필터 결과`;
  };
  bar.querySelector(".list-apply")?.addEventListener("click", refresh);
  bar.querySelector(".list-search")?.addEventListener("keydown", (event) => { if (event.key === "Enter") refresh(); });
  bar.querySelector(".list-reset")?.addEventListener("click", () => { bar.querySelector(".list-search").value = ""; const select = bar.querySelector(".list-status, .list-buyer"); if (select) select.value = ""; bar.querySelector(".list-sort").value = "default"; refresh(); });
}

function enhanceShipmentsPanel() {
  if (document.querySelector("#shipmentsList")) return;
  const host = document.querySelector(".content");
  if (!host) return;
  const rows = state.shipments || [];
  const canEdit = ["buyer", "admin"].includes(state.role);
  const statusOptions = ["발주완료", "출고대기", "쉽컴펌 완료"];
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "shipmentsList";
  panel.innerHTML = `<div class="panel-head"><h2>Ship Confirm 목록</h2><span>부분 출고 ${rows.length.toLocaleString("ko-KR")}행 · ${canEdit ? "Buyer·관리자 수정 가능" : "조회 전용"}</span></div>${rows.length ? `<div class="table-scroll"><table class="table"><thead><tr><th>PO 번호</th><th>납품처</th><th>품목코드</th><th>수량</th><th>단가</th><th>금액</th><th>시리얼번호</th><th>입고일</th><th>상태</th></tr></thead><tbody>${rows.slice(0,100).map((s, i) => `<tr><td>${esc(s.poNumber || "-")}</td><td>${esc(s.deliveryPlace || "-")}</td><td class="wrap-cell">${esc(s.itemCode || "-")}</td><td class="num">${s.quantity ?? "-"}</td><td class="num">${s.unitPrice == null ? "-" : money(s.unitPrice)}</td><td class="num">${s.amount == null ? "-" : money(s.amount)}</td><td>${esc(s.serialNumber || "-")}</td><td>${esc(s.receivedDate || "-")}</td><td>${canEdit ? `<select class="shipment-status-select" data-shipment-index="${i}">${statusOptions.map((v) => `<option ${s.shipmentStatus === v ? "selected" : ""}>${v}</option>`).join("")}</select>` : `<span class="status ${statusClass(s.shipmentStatus)}">${esc(s.shipmentStatus || "출고대기")}</span>`}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">첨부파일을 업로드하면 Ship Confirm 목록이 표시됩니다.</div>`}`;
  host.appendChild(panel);
  panel.querySelectorAll(".shipment-status-select").forEach((select) => select.addEventListener("change", () => { const row = state.shipments[Number(select.dataset.shipmentIndex)]; if (!row) return; row.shipmentStatus = select.value; row.updatedAt = new Date().toLocaleString("ko-KR"); row.updatedBy = roles[state.role].name; saveState(); toast(`Ship Confirm 상태를 ${select.value}(으)로 변경했습니다.`); }));
}

async function handleCdImport(event) {
  event.preventDefault();
  const input = document.querySelector("#cdFileInput");
  const file = input?.files?.[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { toast("파일당 최대 10MB까지 업로드할 수 있습니다."); return; }
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const response = await fetch("/api/import-cd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, data: btoa(binary) }) });
  const result = await response.json();
  if (!result.ok) { toast(result.missing ? `필수 컬럼 누락: ${result.missing.join(", ")}` : result.error || "파일을 읽지 못했습니다."); return; }
  const rows = (result.rows || []).map(normalizeCdTransaction);
  const skippedTemplateRows = Number(result.skippedTemplateRows || 0);
  const byPo = new Map();
  state.cdTransactions = state.cdTransactions || [];
  state.cdTransactions.forEach((row) => { if (row.poNumber) byPo.set(row.poNumber, row); });
  let newRows = 0;
  let updatedRows = 0;
  let warningRows = 0;
  rows.forEach((row) => {
    if (!row.poNumber) warningRows += 1;
    if (row.poNumber && byPo.has(row.poNumber)) {
      const index = state.cdTransactions.findIndex((item) => item.poNumber === row.poNumber);
      state.cdTransactions[index] = { ...state.cdTransactions[index], ...row, sourceFile: file.name };
      updatedRows += 1;
    } else {
      state.cdTransactions.push({ ...row, sourceFile: file.name });
      if (row.poNumber) byPo.set(row.poNumber, row);
      newRows += 1;
    }
  });
  state.importBatches = state.importBatches || [];
  state.importBatches.push({ fileName: file.name, uploadedAt: new Date().toLocaleString("ko-KR"), totalRows: rows.length, newRows, updatedRows, warningRows, skippedTemplateRows, status: "반영완료" });
  saveState();
  render();
  toast(`업로드 완료: 실제 구매 ${rows.length}건 · 신규 ${newRows}건, 갱신 ${updatedRows}건, PO 누락 ${warningRows}건${skippedTemplateRows ? ` · 템플릿 행 ${skippedTemplateRows}건 제외` : ""}`);
}
async function handleContractImportLegacy(event) { const file = event.target.files?.[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { toast("파일당 최대 10MB까지 업로드할 수 있습니다."); return; } const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ""; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); const response = await fetch("/api/import-contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, data: btoa(binary) }) }); const result = await response.json(); if (!result.ok) { toast(result.missing ? `필수 컬럼 누락: ${result.missing.join(", ")}` : result.error || "계약 파일을 읽지 못했습니다."); return; } state.contracts = (result.rows || []).map((r, i) => ({ id: `CON-IMPORT-${String(i + 1).padStart(4, "0")}`, vendor: r.supplierName || "미입력", product: r.product || "미입력", type: r.type || "기타", end: r.endDate || "미입력", cycle: r.billingCycle || "기타", buyer: r.owner || "Buyer 지정 필요", amount: Number(r.totalAmount || 0), state: "정상", sourceFile: file.name })); state.contractImportHistory = state.contractImportHistory || []; state.contractImportHistory.push({ fileName: file.name, uploadedAt: new Date().toLocaleString("ko-KR"), rows: state.contracts.length }); saveState(); render(); toast(`계약 데이터 ${state.contracts.length}건을 반영했습니다.`); }

// 첨부 AP/계약관리 파일의 실제 시트 구조를 반영한 1단계 업로드 처리
async function handleContractImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { toast("파일당 최대 10MB까지 업로드할 수 있습니다."); return; }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const response = await fetch("/api/import-contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, data: btoa(binary) }) });
  const result = await response.json();
  if (!result.ok) { toast(result.missing ? `필수 컬럼 누락: ${result.missing.join(", ")}` : result.error || "계약 파일을 읽지 못했습니다."); return; }
  const contracts = result.contracts || [];
  const existing = new Map((state.contracts || []).map((c) => [c.key || `${c.poNumber || ""}::${c.contractId || c.id || ""}`, c]));
  let newRows = 0; let updatedRows = 0;
  contracts.forEach((r, index) => {
    const key = `${r.poNumber || ""}::${r.contractId || `ROW-${r.sourceRow || index + 1}`}`;
    const prior = existing.get(key);
    const normalized = { ...(prior || {}), ...r, key, id: prior?.id || `CON-${String((state.contracts || []).length + index + 1).padStart(4, "0")}`, vendor: r.supplierName || prior?.vendor || "미입력", product: r.product || prior?.product || "미입력", type: r.type || prior?.type || "유지보수", end: r.endDate || prior?.end || "미입력", cycle: r.billingCycle || prior?.cycle || "미입력", buyer: r.owner || prior?.buyer || "Buyer 지정 필요", amount: Number(r.amountExclVat ?? r.amountInclVat ?? prior?.amount ?? 0), state: prior?.state || "정상", sourceFile: file.name };
    if (prior) { const indexOf = state.contracts.findIndex((c) => c.key === key); if (indexOf >= 0) state.contracts[indexOf] = normalized; else state.contracts.push(normalized); updatedRows += 1; } else { state.contracts.push(normalized); newRows += 1; }
  });
  state.maintenancePayments = state.maintenancePayments || [];
  (result.payments || []).forEach((p, index) => { const key = `${p.contractId || ""}::${p.paymentMonth || ""}::${p.sourceRow || index}`; const prior = state.maintenancePayments.find((x) => x.key === key); const normalized = { ...(prior || {}), ...p, key, id: prior?.id || `PAY-IMPORT-${String(state.maintenancePayments.length + index + 1).padStart(4, "0")}`, paymentStatus: prior?.paymentStatus || p.paymentStatus || "인수증 발행", sourceFile: file.name }; if (prior) Object.assign(prior, normalized); else state.maintenancePayments.push(normalized); });
  state.shipments = state.shipments || [];
  (result.shipments || []).forEach((s, index) => { const key = `${s.poNumber || ""}::${s.itemCode || ""}::${s.serialNumber || ""}::${s.sourceRow || index}`; const prior = state.shipments.find((x) => x.key === key); const normalized = { ...(prior || {}), ...s, key, id: prior?.id || `SHP-IMPORT-${String(state.shipments.length + index + 1).padStart(4, "0")}`, sourceFile: file.name }; if (prior) Object.assign(prior, normalized); else state.shipments.push(normalized); });
  state.contractImportHistory.push({ fileName: file.name, uploadedAt: new Date().toLocaleString("ko-KR"), rows: contracts.length, payments: (result.payments || []).length, shipments: (result.shipments || []).length, newRows, updatedRows, warnings: (result.warnings || []).length, status: "반영완료" });
  saveState(); render(); toast(`계약 ${contracts.length}건 · 지급 ${result.payments?.length || 0}건 · Ship Confirm ${result.shipments?.length || 0}건 반영 (신규 ${newRows}, 갱신 ${updatedRows})`);
}

function handleAction(action, data) {
  if (action === "new-request") { openRequestModal(); return; }
  if (action === "show-toast") { toast(data.message); return; }
  if (action === "generate-payments") { generatePaymentCandidates(); return; }
  const r = activeRequest();
  if (action === "approve") { r.approval = "승인"; r.history.push({ status: r.status, actor: "김진영", at: now(), note: "팀장 승인" }); saveState(); render(); toast("팀장 승인이 완료되었습니다."); return; }
  if (action === "reject") { r.approval = "반려"; r.history.push({ status: r.status, actor: "김진영", at: now(), note: "팀장 반려" }); saveState(); render(); toast("반려 처리되었습니다."); return; }
  if (action === "set-status") { r.status = data.status; r.history.push({ status: r.status, actor: roles[state.role].name, at: now(), note: `${data.status} 처리` }); saveState(); render(); toast(`${data.status} 상태로 변경되었습니다.`); return; }
  if (action === "mail-preview") { toast("메일 미리보기는 상세 화면 하단 카드에서 확인할 수 있습니다."); return; }
}
function paymentCandidateRows() {
  const nowDate = new Date();
  const year = nowDate.getFullYear();
  const month = nowDate.getMonth() + 1;
  const monthText = `${String(month).padStart(2, "0")}월`;
  return (state.contracts || []).filter((c) => {
    const cycle = String(c.billingCycle || c.cycle || "").replace(/\s/g, "");
    const end = c.endDate || c.customerContractEnd || c.end;
    const endDate = end ? new Date(end) : null;
    const expired = endDate && !Number.isNaN(endDate.getTime()) && endDate < new Date(year, month - 1, 1);
    return c.isBrightRow !== false && !expired && !cycle.includes("지급완료") && (cycle.includes("매월") || cycle.includes(monthText));
  });
}

function generatePaymentCandidates() {
  const nowDate = new Date();
  const year = nowDate.getFullYear();
  const month = nowDate.getMonth() + 1;
  const monthText = `${String(month).padStart(2, "0")}월`;
  const isCurrentMonth = (value) => {
    const text = String(value || "").replace(/\s/g, "");
    if (!text || text.includes("대상외") || text.includes("지급완료")) return false;
    if (text.includes("매월") || text.includes(monthText)) {
      const explicitYear = text.match(/(20\d{2})년/);
      return !explicitYear || Number(explicitYear[1]) === year;
    }
    return false;
  };
  const isExpired = (contract) => {
    const end = contract.endDate || contract.customerContractEnd || contract.end;
    const date = end ? new Date(end) : null;
    return date && !Number.isNaN(date.getTime()) && date < new Date(year, month - 1, 1);
  };
  state.maintenancePayments = [];
  let candidates = (state.contracts || []).filter((c) => c.isBrightRow !== false && !isExpired(c) && isCurrentMonth(c.billingCycle || c.cycle)).map((c, i) => ({
      id: `PAY-${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`,
      key: `${c.key || c.id}::${year}-${String(month).padStart(2, "0")}`,
      contractId: c.contractId || c.id,
      supplierName: c.vendor || c.supplierName,
      product: c.product,
      paymentMonth: "매월",
      amountExclVat: c.monthlyAmount || c.amount || 0,
      amountInclVat: Math.round(Number(c.monthlyAmount || c.amount || 0) * 1.1),
      paymentStatus: "인수증 발행",
      generatedAt: new Date().toLocaleString("ko-KR"),
    }));
  candidates.forEach((candidate) => state.maintenancePayments.push(candidate));
  candidates.forEach((p) => { p.generatedAt = new Date().toLocaleString("ko-KR"); p.generationBasis = `${year}-${String(month).padStart(2, "0")} · 매월 20일`; if (!p.paymentStatus) p.paymentStatus = "인수증 발행"; });
  state.lastPaymentGeneration = { year, month, generatedAt: new Date().toLocaleString("ko-KR"), count: candidates.length };
  saveState(); render();
  toast(`${year}-${String(month).padStart(2, "0")} 지급 대상 ${candidates.length}건을 생성했습니다. (기준일: 매월 20일)`);
}
function now() { return "2026-08-18 " + new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }); }
function openPaymentEditor(index) {
  const candidate = paymentCandidateRows()[index];
  if (!candidate) return;
  const existing = (state.maintenancePayments || []).find((p) => p.contractId === (candidate.contractId || candidate.id)) || {};
  const modal = document.createElement("div");
  modal.innerHTML = `<div style="position:fixed;inset:0;background:rgba(20,43,68,.36);display:grid;place-items:center;z-index:10"><div class="detail-card" style="width:520px;max-width:calc(100vw - 32px)"><div class="detail-title"><div><h2>지급 상태 변경</h2><p>${esc(candidate.supplierName || candidate.vendor || "업체 미정")} · ${esc(candidate.product || "")}</p></div><button class="btn btn-secondary" data-close>닫기</button></div><div class="notice">인수증과 송장은 Ariba에서 처리합니다. 이 화면에서는 지급 진행 상태만 관리합니다.</div><form id="paymentStatusForm"><div class="field" style="margin-top:18px"><label>처리 상태</label><select name="status"><option>인수증 발행</option><option>인수증 승인</option><option>인보이스 발행</option><option>인보이스 승인</option><option>AP 전표 완료</option></select></div><div class="action-row"><button type="button" class="btn btn-secondary" data-close>취소</button><button class="btn btn-primary">상태 저장</button></div></form></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector("[name=status]").value = existing.paymentStatus || "인수증 발행";
  modal.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => modal.remove()));
  modal.querySelector("#paymentStatusForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const afterStatus = String(new FormData(event.target).get("status"));
    state.maintenancePayments = state.maintenancePayments || [];
    let payment = state.maintenancePayments.find((p) => p.contractId === (candidate.contractId || candidate.id));
    if (!payment) { payment = { id: `PAY-${Date.now()}`, contractId: candidate.contractId || candidate.id, supplierName: candidate.vendor || candidate.supplierName, product: candidate.product, paymentMonth: candidate.billingCycle || candidate.cycle }; state.maintenancePayments.push(payment); }
    const beforeStatus = payment.paymentStatus || "지급 예정";
    payment.paymentStatus = afterStatus; payment.updatedBy = roles[state.role].name; payment.updatedAt = new Date().toLocaleString("ko-KR");
    state.paymentHistory = state.paymentHistory || []; state.paymentHistory.push({ paymentId: payment.id, changedAt: payment.updatedAt, changedBy: payment.updatedBy, beforeStatus, afterStatus, detail: "Ariba 연계 상태 변경" });
    saveState(); modal.remove(); render(); toast("지급 상태가 저장되었습니다.");
  });
}
function toast(message) { const existing = document.querySelector(".toast"); existing?.remove(); const el = document.createElement("div"); el.className = "toast"; el.textContent = message; document.body.appendChild(el); setTimeout(() => el.remove(), 2600); }
function openRequestModal() { const modal = document.createElement("div"); modal.innerHTML = `<div style="position:fixed;inset:0;background:rgba(20,43,68,.36);display:grid;place-items:center;z-index:10"><div class="detail-card" style="width:680px;max-height:90vh;overflow:auto"><div class="detail-title"><div><h2>구매요청 등록</h2><p>요청자와 접수날짜는 자동 입력됩니다.</p></div><button class="btn btn-secondary" data-close>닫기</button></div><form id="newRequestForm"><div class="form-grid" style="margin-top:20px"><div class="field"><label>요청자</label><input value="${roles[state.role].name}" readonly /></div><div class="field"><label>접수날짜</label><input value="2026-08-18" readonly /></div><div class="field"><label>고객명 *</label><input name="customer" required placeholder="고객명" /></div><div class="field"><label>납품월 *</label><input name="deliveryMonth" type="month" value="2026-09" required /></div><div class="field"><label>상품 *</label><input name="product" required placeholder="예: FortiGate UTM V50" /></div><div class="field"><label>카테고리 *</label><select name="category"><option>네트워크</option><option>서버</option><option>NAS</option><option>노트북</option><option>데스크탑</option><option>범용SW</option><option>문서자동화</option><option>화상회의</option><option>카드리더기</option></select></div><div class="field"><label>수량 *</label><input name="qty" type="number" value="1" min="1" required /></div><div class="field"><label>원가 *</label><input name="cost" type="number" value="1000000" min="0" required /><small>Buyer 입력 후 운영원가·Guide·List 자동 계산</small></div><div class="field"><label>담당자명 *</label><input name="contactName" required placeholder="고객 담당자" /></div><div class="field"><label>연락처 *</label><input name="phone" required placeholder="010-0000-0000" /></div><div class="field full"><label>납품주소 *</label><input name="address" required placeholder="납품 주소" /></div><div class="field"><label>계약 유형 *</label><select name="contractType"><option>비단가계약</option><option>단가계약</option><option>유지보수</option></select></div><div class="field"><label>보증기간</label><select name="warranty"><option>1년</option><option>2년</option><option>3년</option><option>해당없음</option></select></div></div><div class="action-row"><button type="button" class="btn btn-secondary" data-close>취소</button><button class="btn btn-primary">요청 등록</button></div></form></div></div>`; document.body.appendChild(modal); modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => modal.remove())); modal.querySelector("#newRequestForm").addEventListener("submit", (event) => { event.preventDefault(); const f = new FormData(event.target); const category = f.get("category"); const product = f.get("product"); const buyer = buyerMap[category] || "Buyer 결정 필요"; const newReq = { id: `REQ-2026-${String(state.requests.length + 1).padStart(4, "0")}`, receivedAt: "2026-08-18", requester: roles[state.role].name, team: roles[state.role].team, customer: f.get("customer"), deliveryMonth: f.get("deliveryMonth"), deliveryAddress: f.get("address"), contact: `${f.get("contactName")} / ${f.get("phone")}`, contractType: f.get("contractType"), warranty: f.get("warranty"), install: "미입력", training: "미입력", status: "접수/구매진행", approval: "대기", buyer, items: [{ product, category, qty: Number(f.get("qty")), cost: Number(f.get("cost")), vendor: "미정", quoteValid: "", selected: false }], history: [{ status: "접수/구매진행", actor: roles[state.role].name, at: now(), note: "구매요청 접수" }] }; state.requests.unshift(newReq); state.selectedId = newReq.id; state.view = "detail"; saveState(); modal.remove(); render(); toast("구매요청이 접수되었습니다. 팀장 승인을 기다려 주세요."); }); }

function enhanceInsightDashboard() {
  const content = document.querySelector(".content");
  if (!content || document.querySelector("#insightDashboard")) return;
  const rows = (state.cdTransactions || []).filter((row) => !Number.isNaN(new Date(row.taxInvoiceDate).getTime()) && Number(row.purchaseAmount) > 0);
  const monthKey = (value) => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
  const grouped = new Map();
  rows.forEach((row) => { const key = monthKey(row.taxInvoiceDate); grouped.set(key, (grouped.get(key) || 0) + Number(row.purchaseAmount || 0)); });
  const months = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const recent = months.slice(-3).map((item) => item[1]);
  const previous = months.slice(-6, -3).map((item) => item[1]);
  const recentAvg = average(recent);
  const trend = average(previous) ? Math.max(.8, Math.min(1.2, recentAvg / average(previous))) : 1;
  const forecast = recentAvg * trend;
  const statusMap = state.businessRecommendationStatus || {};
  const statuses = Object.values(statusMap);
  const adopted = statuses.filter((item) => item.status === "채택").length;
  const reviewing = statuses.filter((item) => item.status === "검토중").length;
  const targetSaving = statuses.filter((item) => item.status === "채택").reduce((sum, item) => sum + Number(item.targetSaving || 0), 0);
  const completedExecution = statuses.filter((item) => item.status === "채택" && item.executionStatus === "완료");
  const actualSaving = completedExecution.reduce((sum, item) => sum + Number(item.actualSaving || 0), 0);
  const achievement = targetSaving ? actualSaving / targetSaving * 100 : 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const activeExecution = statuses.filter((item) => item.status === "채택" && !["완료", "보류"].includes(item.executionStatus || "계획"));
  const dueSoon = activeExecution.filter((item) => { const due = new Date(`${item.dueDate || ""}T00:00:00`); return !Number.isNaN(due.getTime()) && due <= new Date(today.getTime() + 14 * 86400000); });
  const forecastActualPairs = (state.forecastPurchaseDrafts || []).map((draft) => { const request = (state.requests || []).find((item) => item.id === draft.requestId); const poNumber = String(request?.poNumber || "").trim(); const matched = poNumber ? (state.cdTransactions || []).filter((row) => String(row.poNumber || "").trim() === poNumber) : []; return { expected: Number(draft.expectedAmount || 0), actual: matched.reduce((sum, row) => sum + Number(row.purchaseAmount || 0), 0), matched: matched.length > 0 }; }).filter((item) => item.matched && item.expected > 0);
  const forecastExpected = forecastActualPairs.reduce((sum, item) => sum + item.expected, 0);
  const forecastActual = forecastActualPairs.reduce((sum, item) => sum + item.actual, 0);
  const forecastAccuracy = forecastExpected ? Math.max(0, 100 - Math.abs(forecastActual - forecastExpected) / forecastExpected * 100) : null;
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "insightDashboard";
  panel.innerHTML = `<div class="panel-head"><h2>NP InsightFlow · 구매 인텔리전스</h2><span>예측·사업기회 요약</span></div><div class="cards insight-cards"><button class="metric insight-card" data-insight-view="forecast"><div class="label">다음 달 예상 구매금액</div><div class="value" title="${money(forecast)}">${rows.length ? money(forecast) : "데이터 없음"}</div><div class="note">최근 3개월 추세 · 구매 예측 보기</div></button><button class="metric insight-card" data-insight-view="forecast"><div class="label">예측 신뢰 데이터</div><div class="value">${rows.length.toLocaleString("ko-KR")}</div><div class="note">날짜·금액 입력 행 · 구매 예측 보기</div></button><button class="metric insight-card" data-insight-view="forecast"><div class="label">예측 정확도</div><div class="value">${forecastAccuracy === null ? "계산 대기" : `${forecastAccuracy.toFixed(1)}%`}</div><div class="note">CD 실제 매칭 ${forecastActualPairs.length}건</div></button><button class="metric insight-card" data-insight-view="business"><div class="label">검토중 사업기회</div><div class="value">${reviewing}</div><div class="note">Buyer 검토 진행 · 추천 보기</div></button><button class="metric insight-card" data-insight-view="business"><div class="label">실행 중 사업기회</div><div class="value">${activeExecution.length}</div><div class="note">채택 후 완료 전 과제</div></button><button class="metric insight-card" data-insight-view="business"><div class="label">완료 실행 과제</div><div class="value">${completedExecution.length}</div><div class="note">실제 절감액 입력 기준</div></button><button class="metric insight-card" data-insight-view="business"><div class="label">실제 절감 성과</div><div class="value" title="${money(actualSaving)}">${money(actualSaving)}</div><div class="note">목표 대비 ${achievement.toFixed(1)}%</div></button><button class="metric insight-card" data-insight-view="business"><div class="label">14일 내 완료일</div><div class="value">${dueSoon.length}</div><div class="note">완료일 경과·임박 과제</div></button></div>`;
  content.appendChild(panel);
  const targetNote = document.createElement("div");
  targetNote.className = "notice insight-target-note";
  targetNote.textContent = `채택 실행 후보의 목표 절감액: ${money(targetSaving)} · 실제 절감 성과: ${money(actualSaving)} (${achievement.toFixed(1)}%) · 실행 중 ${activeExecution.length}건 / 완료일 임박 ${dueSoon.length}건`;
  panel.appendChild(targetNote);
  if (dueSoon.length) {
    const duePanel = document.createElement("div");
    duePanel.className = "panel";
    duePanel.id = "executionDueAlerts";
    duePanel.innerHTML = `<div class="panel-head"><h2>완료일 임박 실행 과제</h2><span>경과 및 14일 이내 · ${dueSoon.length}건</span></div><table class="table"><thead><tr><th>사업기회</th><th>담당 Buyer</th><th>실행 상태</th><th>목표 완료일</th><th>남은 기간</th><th>목표 절감액</th><th></th></tr></thead><tbody>${dueSoon.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map((item) => { const due = new Date(`${item.dueDate}T00:00:00`); const days = Math.ceil((due - today) / 86400000); const [category, model] = String(Object.entries(statusMap).find(([, value]) => value === item)?.[0] || "-").split("::"); return `<tr><td><strong>${esc(category)}</strong><br/><small>${esc(model || "사업기회")}</small></td><td>${esc(item.executionOwner || "미지정")}</td><td>${esc(item.executionStatus || "계획")}</td><td>${esc(item.dueDate)}</td><td><span class="status ${days < 0 ? "status-red" : "status-gold"}">${days < 0 ? `${Math.abs(days)}일 경과` : `D-${days}`}</span></td><td class="num">${money(item.targetSaving || 0)}</td><td><button class="btn btn-ghost execution-due-open">과제 보기 →</button></td></tr>`; }).join("")}</tbody></table>`;
    content.appendChild(duePanel);
    duePanel.querySelectorAll(".execution-due-open").forEach((button) => button.addEventListener("click", () => { state.view = "business"; render(); }));
  }
  const forecastLinkGaps = (state.forecastPurchaseDrafts || []).map((draft) => ({ draft, request: (state.requests || []).find((item) => item.id === draft.requestId) })).filter((item) => item.request).map((item) => { const poNumber = String(item.request.poNumber || "").trim(); const matched = poNumber ? (state.cdTransactions || []).some((row) => String(row.poNumber || "").trim() === poNumber) : false; return { ...item, poNumber, matched }; }).filter((item) => !item.matched);
  if (forecastLinkGaps.length) {
    const gapPanel = document.createElement("div");
    gapPanel.className = "panel";
    gapPanel.id = "forecastLinkGaps";
    gapPanel.innerHTML = `<div class="panel-head"><h2>예측 정확도 데이터 보완 대상</h2><div class="toolbar"><span>PO·CD 미연계 ${forecastLinkGaps.length}건</span>${["buyer", "admin"].includes(state.role) ? `<button class="btn btn-secondary" id="forecastGapMailDraft">Outlook 알림 초안 생성</button>` : ""}</div></div><table class="table"><thead><tr><th>정식 구매요청</th><th>품목</th><th>현재 Status</th><th>발주 PO 번호</th><th>보완 필요 사항</th><th></th></tr></thead><tbody>${forecastLinkGaps.slice(0, 20).map((item) => `<tr><td><strong>${esc(item.request.id)}</strong></td><td>${esc(item.draft.product)}</td><td><span class="status ${statusClass(item.request.status)}">${esc(item.request.status)}</span></td><td>${esc(item.poNumber || "미등록")}</td><td>${item.poNumber ? "CD집계표 실제 구매이력 업로드 확인" : "발주 PO 번호 등록"}</td><td><button class="btn btn-ghost forecast-gap-open" data-request-id="${esc(item.request.id)}">요청 보기 →</button></td></tr>`).join("")}</tbody></table><div class="notice">PO 번호를 등록하고 CD집계표에 동일 PO 번호의 세금계산서 구매이력이 반영되면 예측 정확도에 자동 포함됩니다.</div>`;
    content.appendChild(gapPanel);
    gapPanel.querySelectorAll(".forecast-gap-open").forEach((button) => button.addEventListener("click", () => { state.selectedId = button.dataset.requestId; state.view = "detail"; render(); }));
    gapPanel.querySelector("#forecastGapMailDraft")?.addEventListener("click", () => { const subject = `[NP InsightFlow] 예측 정확도 데이터 보완 요청 · ${forecastLinkGaps.length}건`; const body = `안녕하세요.\n\n구매 예측 정확도 검증을 위해 아래 구매요청의 발주 PO 번호 또는 CD집계표 실제 구매이력을 확인해 주세요.\n\n${forecastLinkGaps.map((item, index) => `${index + 1}. ${item.request.id} · ${item.draft.product}\n   - 현재 Status: ${item.request.status}\n   - 발주 PO 번호: ${item.poNumber || "미등록"}\n   - 조치: ${item.poNumber ? "CD집계표 실제 구매이력 업로드 확인" : "발주 PO 번호 등록"}`).join("\n\n")}\n\n확인 후 시스템에 반영 부탁드립니다.\n감사합니다.\nNP MKT 구매팀`; state.mailDrafts = state.mailDrafts || []; state.mailDrafts.push({ createdAt: new Date().toLocaleString("ko-KR"), supplier: "내부 Buyer", subject, body }); saveState(); toast("Outlook 알림 초안을 생성했습니다. 견적 메일 메뉴에서 본문을 확인·복사할 수 있습니다."); });
  }
  panel.querySelectorAll("[data-insight-view]").forEach((button) => button.addEventListener("click", () => { state.view = button.dataset.insightView; render(); }));
}

function forecastView() {
  const rows = state.cdTransactions || [];
  const buyers = [...new Set(rows.map((row) => row.buyer).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
  const categories = [...new Set(rows.map((row) => row.categoryLarge).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
  return `<div class="page-head"><div><h1>구매 예측</h1><p>최근 구매 추세와 반복 구매 패턴을 이용해 다음 구매금액을 예측합니다.</p></div><span class="status status-blue">예측 v1 · 데이터 기반</span></div><div class="panel"><div class="analysis-filters"><select id="forecastBuyer"><option value="">전체 Buyer</option>${buyers.map((value) => `<option>${esc(value)}</option>`).join("")}</select><select id="forecastCategory"><option value="">전체 대분류</option>${categories.map((value) => `<option>${esc(value)}</option>`).join("")}</select><button class="btn btn-primary" id="forecastApply">예측 계산</button><button class="btn btn-secondary" id="forecastReset">초기화</button></div></div><div id="forecastBody"></div>`;
}

function bindForecastEvents() {
  const refresh = (announce = false) => { renderForecastBody(); if (announce) toast("구매 예측을 계산했습니다."); };
  document.querySelector("#forecastApply")?.addEventListener("click", () => refresh(true));
  document.querySelector("#forecastBuyer")?.addEventListener("change", () => refresh());
  document.querySelector("#forecastCategory")?.addEventListener("change", () => refresh());
  document.querySelector("#forecastReset")?.addEventListener("click", () => { document.querySelector("#forecastBuyer").value = ""; document.querySelector("#forecastCategory").value = ""; refresh(true); });
  refresh();
}

function renderForecastBody() {
  const buyer = document.querySelector("#forecastBuyer")?.value || "";
  const category = document.querySelector("#forecastCategory")?.value || "";
  const rows = (state.cdTransactions || []).filter((row) => { const d = new Date(row.taxInvoiceDate); return !Number.isNaN(d.getTime()) && Number(row.purchaseAmount) > 0 && (!buyer || row.buyer === buyer) && (!category || row.categoryLarge === category); });
  const body = document.querySelector("#forecastBody");
  if (!body) return;
  if (!rows.length) { body.innerHTML = `<div class="panel"><div class="empty">예측에 사용할 날짜·구매금액 데이터가 없습니다. CD 업로드에서 데이터 준비도를 먼저 확인해 주세요.</div></div>`; return; }
  const monthKey = (value) => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
  const grouped = new Map();
  rows.forEach((row) => { const key = monthKey(row.taxInvoiceDate); grouped.set(key, (grouped.get(key) || 0) + Number(row.purchaseAmount || 0)); });
  const months = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const recent = months.slice(-3).map((item) => item[1]);
  const previous = months.slice(-6, -3).map((item) => item[1]);
  const avg = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const recentAvg = avg(recent);
  const previousAvg = avg(previous);
  const trend = previousAvg ? Math.max(.8, Math.min(1.2, recentAvg / previousAvg)) : 1;
  const nextAmount = recentAvg * trend;
  const latest = new Date(`${months[months.length - 1][0]}-01T00:00:00`);
  const nextDate = new Date(latest.getFullYear(), latest.getMonth() + 1, 1);
  const nextLabel = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
  let confidence = months.length >= 9 ? "높음" : months.length >= 4 ? "보통" : "낮음";
  const verificationPairs = (state.forecastPurchaseDrafts || []).map((draft) => { const request = (state.requests || []).find((item) => item.id === draft.requestId); const poNumber = String(request?.poNumber || "").trim(); const matched = poNumber ? (state.cdTransactions || []).filter((row) => String(row.poNumber || "").trim() === poNumber) : []; return { expected: Number(draft.expectedAmount || 0), actual: matched.reduce((sum, row) => sum + Number(row.purchaseAmount || 0), 0), matched: matched.length > 0 }; }).filter((item) => item.matched && item.expected > 0);
  const verificationExpected = verificationPairs.reduce((sum, item) => sum + item.expected, 0);
  const verificationActual = verificationPairs.reduce((sum, item) => sum + item.actual, 0);
  const verificationAccuracy = verificationExpected ? Math.max(0, 100 - Math.abs(verificationActual - verificationExpected) / verificationExpected * 100) : null;
  if (verificationPairs.length >= 2 && verificationAccuracy < 70) confidence = "낮음";
  else if (verificationPairs.length >= 2 && verificationAccuracy >= 90 && confidence === "보통") confidence = "높음";
  const confidenceClass = confidence === "높음" ? "status-mint" : confidence === "보통" ? "status-gold" : "status-red";
  const byCategory = new Map();
  rows.forEach((row) => { const key = row.categoryLarge || "미분류"; const list = byCategory.get(key) || []; list.push(row); byCategory.set(key, list); });
  const categoryForecasts = [...byCategory.entries()].map(([name, items]) => { const values = new Map(); items.forEach((row) => { const key = monthKey(row.taxInvoiceDate); values.set(key, (values.get(key) || 0) + Number(row.purchaseAmount || 0)); }); const series = [...values.entries()].sort((a, b) => a[0].localeCompare(b[0])); const value = avg(series.slice(-3).map((item) => item[1])); return { name, value, count: items.length }; }).sort((a, b) => b.value - a.value);
  const max = Math.max(...months.map((item) => item[1]), 1);
  body.innerHTML = `<div class="cards"><div class="metric"><div class="label">${nextLabel} 예상 구매금액</div><div class="value" title="${money(nextAmount)}">${money(nextAmount)}</div><div class="note">최근 3개월 추세 기준</div></div><div class="metric"><div class="label">다음 분기 예상</div><div class="value" title="${money(nextAmount * 3)}">${money(nextAmount * 3)}</div><div class="note">월별 예측 × 3개월</div></div><div class="metric"><div class="label">최근 추세</div><div class="value">${((trend - 1) * 100).toFixed(1)}%</div><div class="note">직전 3개월 대비</div></div><div class="metric"><div class="label">예측 신뢰도</div><div class="value"><span class="status ${confidenceClass}">${confidence}</span></div><div class="note">월별 데이터 ${months.length}개월</div></div></div><div class="analysis-grid"><div class="panel"><div class="panel-head"><h2>월별 구매 추세</h2><span>최근 ${months.length}개월</span></div>${months.slice(-12).map(([name, value]) => `<div class="analysis-row"><span>${name}</span><div class="analysis-track"><i style="width:${Math.max(2, value / max * 100)}%"></i></div><b>${money(value)}</b></div>`).join("")}</div><div class="panel"><div class="panel-head"><h2>카테고리별 다음 달 예상</h2><span>최근 3개월 평균</span></div>${categoryForecasts.slice(0, 8).map((item) => `<div class="analysis-row"><span>${esc(item.name)}</span><div class="analysis-track"><i style="width:${Math.max(2, item.value / Math.max(categoryForecasts[0]?.value || 1, 1) * 100)}%"></i></div><b>${money(item.value)}</b><em>${item.count}건</em></div>`).join("")}</div></div><div class="panel"><div class="panel-head"><h2>예측 산식 및 근거 행</h2><span>${rows.length.toLocaleString("ko-KR")}건</span></div><div class="notice">예상 구매금액 = 최근 3개월 평균 × 최근 3개월과 직전 3개월의 추세 보정치(80%~120%). 데이터가 누적되면 계절성·반복 구매 주기를 추가합니다.</div>${historyTable(rows.slice().sort((a, b) => new Date(b.taxInvoiceDate) - new Date(a.taxInvoiceDate)).slice(0, 50))}</div>`;
  const confidenceNote = body.querySelectorAll(".metric")[3]?.querySelector(".note");
  if (confidenceNote) confidenceNote.textContent = verificationAccuracy === null ? `월별 데이터 ${months.length}개월 · 실제 검증 대기` : `월별 데이터 ${months.length}개월 · CD 실제 정확도 ${verificationAccuracy.toFixed(1)}%`;
  const guideMessage = verificationAccuracy === null ? "실제 정확도를 계산하려면 예측 전환 요청에 발주 PO 번호를 등록하고, 동일 PO 번호의 세금계산서 구매이력을 CD집계표로 업로드해 주세요." : verificationAccuracy < 70 ? "실제 구매금액과 예측 차이가 큽니다. 반복 구매 주기·수량·카테고리 매핑과 PO 매칭 상태를 우선 점검해 주세요." : "실제 구매 결과와 예측값의 정합성이 양호합니다. 새 CD집계표 업로드 시 정확도를 계속 검증해 주세요.";
  const guideAction = verificationAccuracy === null ? "CD 업로드로 이동" : verificationAccuracy < 70 ? "전환 결과 확인" : "CD 업로드로 이동";
  const guideView = verificationAccuracy !== null && verificationAccuracy < 70 ? "forecast" : "imports";
  body.insertAdjacentHTML("beforeend", `<div class="panel" id="forecastConfidenceGuide"><div class="panel-head"><h2>예측 신뢰도 개선 안내</h2><span class="status ${confidenceClass}">${confidence}</span></div><div class="notice">${esc(guideMessage)}</div><div class="action-row"><button class="btn btn-secondary" id="forecastConfidenceGuideAction">${guideAction}</button></div></div>`);
  body.querySelector("#forecastConfidenceGuideAction")?.addEventListener("click", () => { state.view = guideView; render(); });
  renderForecastBacktest(body, months);
  renderRecurringPurchaseCandidates(body, rows);
}

function renderForecastBacktest(host, months) {
  if (months.length < 4) return;
  const [actualMonth, actual] = months[months.length - 1];
  const history = months.slice(0, -1);
  const recent = history.slice(-3).map((item) => item[1]);
  const previous = history.slice(-6, -3).map((item) => item[1]);
  const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const recentAvg = average(recent);
  const trend = average(previous) ? Math.max(.8, Math.min(1.2, recentAvg / average(previous))) : 1;
  const predicted = recentAvg * trend;
  const errorRate = actual ? Math.abs(predicted - actual) / actual * 100 : 0;
  const accuracy = Math.max(0, 100 - errorRate);
  const panel = document.createElement("div");
  panel.className = "panel forecast-backtest";
  panel.innerHTML = `<div class="panel-head"><h2>예측 정확도 검증</h2><span>직전 완료월 백테스트</span></div><div class="readiness-grid"><div><strong>${actualMonth}</strong><span>검증 대상 월</span></div><div><strong>${money(predicted)}</strong><span>당시 예측값</span></div><div><strong>${money(actual)}</strong><span>실제 구매금액</span></div><div><strong>${accuracy.toFixed(1)}%</strong><span>예측 정확도</span></div></div><div class="notice">백테스트는 해당 월을 제외한 과거 데이터만 사용해 계산합니다. 오차율 ${errorRate.toFixed(1)}%를 기준으로 데이터 누적 후 예측 모델을 보정합니다.</div>`;
  host.appendChild(panel);
}

function renderRecurringPurchaseCandidates(host, rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const itemName = String(row.modelName || row.categoryLarge || "").trim();
    const supplier = String(row.supplierName || "업체 미입력").trim();
    if (!itemName) return;
    const key = `${itemName}::${supplier}`;
    const list = grouped.get(key) || [];
    list.push(row);
    grouped.set(key, list);
  });
  const candidates = [...grouped.entries()].map(([key, items]) => {
    const sorted = items.slice().sort((a, b) => new Date(a.taxInvoiceDate) - new Date(b.taxInvoiceDate));
    if (sorted.length < 2) return null;
    const intervals = sorted.slice(1).map((row, index) => (new Date(row.taxInvoiceDate) - new Date(sorted[index].taxInvoiceDate)) / 86400000).filter((value) => value > 0);
    const averageInterval = intervals.length ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length : 0;
    if (!averageInterval || averageInterval > 730) return null;
    const last = sorted[sorted.length - 1];
    const next = new Date(new Date(last.taxInvoiceDate).getTime() + averageInterval * 86400000);
    const amount = sorted.reduce((sum, row) => sum + Number(row.purchaseAmount || 0), 0) / sorted.length;
    const [itemName, supplier] = key.split("::");
    return { itemName, supplier, category: last.categoryLarge || "미분류", count: sorted.length, averageInterval, lastDate: last.taxInvoiceDate, nextDate: next.toISOString().slice(0, 10), amount };
  }).filter(Boolean).sort((a, b) => a.nextDate.localeCompare(b.nextDate) || b.amount - a.amount);
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "recurringPurchaseCandidates";
  panel.innerHTML = `<div class="panel-head"><h2>반복 구매 예상 후보</h2><span>동일 모델·업체 기준</span></div>${candidates.length ? `<table class="table"><thead><tr><th>품목/카테고리</th><th>업체</th><th>과거 구매</th><th>평균 구매간격</th><th>최근 구매일</th><th>다음 예상일</th><th>예상 금액</th></tr></thead><tbody>${candidates.slice(0, 50).map((item) => `<tr><td>${esc(item.itemName)}</td><td>${esc(item.supplier)}</td><td>${item.count}건</td><td>${Math.round(item.averageInterval)}일</td><td>${esc(item.lastDate)}</td><td><span class="status status-gold">${item.nextDate}</span></td><td class="num">${money(item.amount)}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">반복 구매 간격을 계산할 수 있는 품목 데이터가 없습니다.</div>`}<div class="notice">동일 모델명이 없으면 대분류와 업체 조합으로 계산합니다. 실제 구매 예정일은 Buyer가 고객 계약·재고·납기 상황을 확인해 조정합니다.</div>`;
  renderForecastPriorityAlerts(host, candidates);
  host.appendChild(panel);
  enhanceRecurringCandidateActions(panel, candidates.slice(0, 50));
  renderForecastPurchaseDrafts(host);
}

function renderForecastPriorityAlerts(host, candidates) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const keyOf = (item) => `${item.itemName}::${item.supplier}::${item.nextDate}`;
  const statusOf = (item) => state.recurringPurchaseStatus?.[keyOf(item)]?.status || "검토대기";
  const prioritized = candidates.map((item) => ({ ...item, days: Math.ceil((new Date(`${item.nextDate}T00:00:00`) - today) / 86400000), status: statusOf(item) })).filter((item) => item.days <= 60 && item.status !== "보류").sort((a, b) => a.days - b.days || b.amount - a.amount);
  if (!prioritized.length) return;
  const overdue = prioritized.filter((item) => item.days < 0);
  const within30 = prioritized.filter((item) => item.days >= 0 && item.days <= 30);
  const history = (state.recurringPurchaseHistory || []).slice().reverse().slice(0, 5);
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "forecastPriorityAlerts";
  panel.innerHTML = `<div class="panel-head"><h2>반복 구매 실행 우선순위</h2><span>기준일 ${today.toISOString().slice(0, 10)} · 60일 이내</span></div><div class="cards" style="margin:0 0 16px"><div class="metric"><div class="label">예정일 경과</div><div class="value">${overdue.length}</div><div class="note">즉시 고객·계약 확인</div></div><div class="metric"><div class="label">30일 이내</div><div class="value">${within30.length}</div><div class="note">견적·재고 확인 우선</div></div><div class="metric"><div class="label">60일 이내</div><div class="value">${prioritized.length}</div><div class="note">반복 구매 예상 후보</div></div><div class="metric"><div class="label">예상 금액</div><div class="value" style="font-size:clamp(20px,2vw,32px)">${money(prioritized.reduce((sum, item) => sum + item.amount, 0))}</div><div class="note">60일 이내 후보 합계</div></div></div><table class="table"><thead><tr><th>우선순위</th><th>품목</th><th>업체</th><th>예정일</th><th>남은 기간</th><th>예상 금액</th><th>검토 상태</th><th></th></tr></thead><tbody>${prioritized.slice(0, 8).map((item, index) => `<tr><td><strong>${index + 1}</strong></td><td>${esc(item.itemName)}<br/><small>${esc(item.category)}</small></td><td>${esc(item.supplier)}</td><td>${item.nextDate}</td><td><span class="status ${item.days < 0 ? "status-red" : item.days <= 30 ? "status-gold" : "status-blue"}">${item.days < 0 ? `${Math.abs(item.days)}일 경과` : `D-${item.days}`}</span></td><td class="num">${money(item.amount)}</td><td>${esc(item.status)}</td><td><button class="btn btn-ghost priority-candidate-jump" data-priority-key="${esc(keyOf(item))}">후보 보기 →</button></td></tr>`).join("")}</tbody></table>${history.length ? `<div class="section-title"><h3>최근 처리 이력</h3><span>${history.length}건</span></div><div class="timeline">${history.map((item) => `<div class="timeline-item"><div class="timeline-rail"></div><div><strong>${esc(item.type)} · ${esc(item.product)}</strong><span>${esc(item.beforeStatus)} → ${esc(item.afterStatus)} · ${esc(item.actor)} · ${esc(item.at)}</span></div></div>`).join("")}</div>` : ""}<div class="notice">우선순위는 반복 구매 예상일만으로 계산합니다. 실제 실행 전 고객 수요, 계약 조건, 재고와 납기를 Buyer가 확인해야 합니다.</div>`;
  host.appendChild(panel);
  panel.querySelectorAll(".priority-candidate-jump").forEach((button) => button.addEventListener("click", () => { const target = document.querySelector("#recurringPurchaseCandidates"); target?.scrollIntoView({ behavior: "smooth", block: "start" }); toast("반복 구매 후보 목록에서 검토 상태를 변경해 주세요."); }));
}

function enhanceRecurringCandidateActions(panel, candidates) {
  const table = panel?.querySelector("table");
  if (!table || !["buyer", "admin"].includes(state.role)) return;
  table.querySelector("thead tr")?.insertAdjacentHTML("beforeend", "<th>검토 상태</th><th>구매요청 초안</th>");
  state.recurringPurchaseStatus = state.recurringPurchaseStatus || {};
  [...table.querySelectorAll("tbody tr")].forEach((row, index) => {
    const item = candidates[index];
    if (!item) return;
    const key = `${item.itemName}::${item.supplier}::${item.nextDate}`;
    const current = state.recurringPurchaseStatus[key]?.status || "검토대기";
    row.insertAdjacentHTML("beforeend", `<td><select class="recurring-status-select" data-recurring-key="${esc(key)}"><option ${current === "검토대기" ? "selected" : ""}>검토대기</option><option ${current === "검토중" ? "selected" : ""}>검토중</option><option ${current === "구매요청 예정" ? "selected" : ""}>구매요청 예정</option><option ${current === "보류" ? "selected" : ""}>보류</option></select></td><td><button class="btn btn-secondary recurring-draft-create" data-recurring-index="${index}" ${current === "구매요청 예정" ? "" : "disabled"}>초안 생성</button></td>`);
  });
  table.querySelectorAll(".recurring-status-select").forEach((select) => select.addEventListener("change", (event) => { event.stopPropagation(); const key = select.dataset.recurringKey; const candidate = candidates.find((item) => `${item.itemName}::${item.supplier}::${item.nextDate}` === key); const beforeStatus = state.recurringPurchaseStatus[key]?.status || "검토대기"; state.recurringPurchaseStatus[key] = { status: select.value, updatedBy: roles[state.role].name, updatedAt: new Date().toLocaleString("ko-KR") }; state.recurringPurchaseHistory = state.recurringPurchaseHistory || []; state.recurringPurchaseHistory.push({ type: "상태 변경", key, product: candidate?.itemName || "반복 구매 후보", supplier: candidate?.supplier || "-", beforeStatus, afterStatus: select.value, actor: roles[state.role].name, at: new Date().toLocaleString("ko-KR") }); const draftButton = select.closest("tr")?.querySelector(".recurring-draft-create"); if (draftButton) draftButton.disabled = select.value !== "구매요청 예정"; saveState(); toast(`반복 구매 후보를 ${select.value}(으)로 저장했습니다.`); }));
  table.querySelectorAll(".recurring-draft-create").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    const item = candidates[Number(button.dataset.recurringIndex)];
    if (!item) return;
    const key = `${item.itemName}::${item.supplier}::${item.nextDate}`;
    state.forecastPurchaseDrafts = state.forecastPurchaseDrafts || [];
    if (state.forecastPurchaseDrafts.some((draft) => draft.sourceKey === key)) { toast("이미 생성된 구매요청 초안입니다."); return; }
    state.forecastPurchaseDrafts.push({ id: `F-DRAFT-${Date.now()}`, sourceKey: key, product: item.itemName, category: item.category, supplier: item.supplier, expectedDate: item.nextDate, expectedAmount: item.amount, quantity: 1, deliveryMonth: item.nextDate.slice(0, 7), status: "초안", createdBy: roles[state.role].name, createdAt: new Date().toLocaleString("ko-KR") });
    state.recurringPurchaseHistory = state.recurringPurchaseHistory || [];
    state.recurringPurchaseHistory.push({ type: "초안 생성", key, product: item.itemName, supplier: item.supplier, beforeStatus: "구매요청 예정", afterStatus: "초안 생성", actor: roles[state.role].name, at: new Date().toLocaleString("ko-KR") });
    saveState();
    renderForecastPurchaseDrafts(document.querySelector("#forecastBody"));
    toast("구매요청 초안을 생성했습니다.");
  }));
}

function renderForecastPurchaseDrafts(host) {
  if (!host) return;
  document.querySelector("#forecastPurchaseDrafts")?.remove();
  const drafts = state.forecastPurchaseDrafts || [];
  const canManage = ["buyer", "admin"].includes(state.role);
  const readyCount = drafts.filter((draft) => draft.status === "접수 준비완료").length;
  const submitted = drafts.filter((draft) => draft.status === "정식 접수" && draft.requestId);
  const forecastAmount = drafts.reduce((sum, draft) => sum + Number(draft.expectedAmount || 0), 0);
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "forecastPurchaseDrafts";
  panel.innerHTML = `<div class="panel-head"><h2>예측 기반 구매요청 초안</h2><span>${drafts.length}건</span></div>${drafts.length ? `<div class="cards" style="margin:0 0 16px"><div class="metric"><div class="label">생성 초안</div><div class="value">${drafts.length}</div><div class="note">반복 구매 후보 기반</div></div><div class="metric"><div class="label">접수 준비완료</div><div class="value">${readyCount}</div><div class="note">필수 정보 확인 완료</div></div><div class="metric"><div class="label">정식 구매요청 전환</div><div class="value">${submitted.length}</div><div class="note">전환율 ${drafts.length ? (submitted.length / drafts.length * 100).toFixed(1) : 0}%</div></div><div class="metric"><div class="label">초안 예상 금액</div><div class="value" style="font-size:clamp(20px,2vw,32px)">${money(forecastAmount)}</div><div class="note">초안 전체 기준</div></div></div><table class="table"><thead><tr><th>초안번호</th><th>품목/카테고리</th><th>업체</th><th>납품월</th><th>예상 금액</th><th>상태</th><th>정식 구매요청</th><th>작성자</th>${canManage ? "<th>관리</th>" : ""}</tr></thead><tbody>${drafts.slice().reverse().map((draft) => `<tr><td><strong>${esc(draft.id)}</strong></td><td>${esc(draft.product)}<br/><small>${esc(draft.category || "미분류")} · 수량 ${draft.quantity || 1}</small></td><td>${esc(draft.supplier)}</td><td>${esc(draft.deliveryMonth || draft.expectedDate?.slice(0, 7) || "-")}</td><td class="num">${money(draft.expectedAmount)}</td><td><span class="status ${draft.status === "접수 준비완료" || draft.status === "정식 접수" ? "status-mint" : "status-blue"}">${esc(draft.status)}</span></td><td>${draft.requestId ? `<button class="btn btn-ghost forecast-request-link" data-request-id="${esc(draft.requestId)}">${esc(draft.requestId)} →</button>` : "-"}</td><td>${esc(draft.createdBy)} · ${esc(draft.createdAt)}</td>${canManage ? `<td><button class="btn btn-secondary forecast-draft-edit" data-draft-id="${esc(draft.id)}">확인·수정</button></td>` : ""}</tr>`).join("")}</tbody></table>` : `<div class="empty">반복 구매 예상 후보에서 초안을 생성하면 이 목록에 표시됩니다.</div>`}<div class="notice">초안은 실제 구매요청으로 접수되지 않습니다. Buyer가 고객·수량·납품월·계약 조건을 확인한 뒤 <strong>접수 준비완료</strong>로 표시합니다.</div>`;
  host.appendChild(panel);
  panel.querySelectorAll(".forecast-draft-edit").forEach((button) => button.addEventListener("click", () => openForecastPurchaseDraftModal(button.dataset.draftId)));
  panel.querySelectorAll(".forecast-request-link").forEach((button) => button.addEventListener("click", () => { state.selectedId = button.dataset.requestId; state.view = "detail"; render(); }));
  renderForecastOutcomeReport(host);
}

function renderForecastOutcomeReport(host) {
  if (!host) return;
  document.querySelector("#forecastOutcomeReport")?.remove();
  const outcomes = (state.forecastPurchaseDrafts || []).map((draft) => ({ draft, request: (state.requests || []).find((request) => request.id === draft.requestId) })).filter((item) => item.request);
  if (!outcomes.length) return;
  const convertedExpected = outcomes.reduce((sum, item) => sum + Number(item.draft.expectedAmount || 0), 0);
  const requestAmount = (item) => item.request.items.reduce((sum, entry) => sum + Number(entry.cost || 0) * Number(entry.qty || 0), 0);
  const convertedActual = outcomes.reduce((sum, item) => sum + requestAmount(item), 0);
  const completed = outcomes.filter((item) => item.request.status === "쉽컴펌 완료");
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "forecastOutcomeReport";
  panel.innerHTML = `<div class="panel-head"><h2>예측 구매 전환 결과</h2><span>정식 구매요청 전환 ${outcomes.length}건</span></div><div class="cards" style="margin:0 0 16px"><div class="metric"><div class="label">전환 예상 금액</div><div class="value" title="${money(convertedExpected)}">${money(convertedExpected)}</div><div class="note">초안 생성 당시 금액</div></div><div class="metric"><div class="label">요청 등록 금액</div><div class="value" title="${money(convertedActual)}">${money(convertedActual)}</div><div class="note">현재 구매요청 원가 기준</div></div><div class="metric"><div class="label">금액 차이</div><div class="value" title="${money(convertedActual - convertedExpected)}">${money(convertedActual - convertedExpected)}</div><div class="note">요청 등록 금액 − 예상 금액</div></div><div class="metric"><div class="label">쉽컴펌 완료</div><div class="value">${completed.length}</div><div class="note">전환 요청 중 ${outcomes.length}건</div></div></div><table class="table"><thead><tr><th>초안번호</th><th>정식 요청번호</th><th>품목</th><th>예상 금액</th><th>요청 등록 금액</th><th>차이</th><th>현재 Status</th></tr></thead><tbody>${outcomes.slice().reverse().map((item) => { const actual = requestAmount(item); const variance = actual - Number(item.draft.expectedAmount || 0); return `<tr><td>${esc(item.draft.id)}</td><td><button class="btn btn-ghost forecast-outcome-request" data-request-id="${esc(item.request.id)}">${esc(item.request.id)} →</button></td><td>${esc(item.draft.product)}</td><td class="num">${money(item.draft.expectedAmount)}</td><td class="num">${money(actual)}</td><td class="num">${money(variance)}</td><td><span class="status ${statusClass(item.request.status)}">${esc(item.request.status)}</span></td></tr>`; }).join("")}</tbody></table><div class="notice">요청 등록 금액은 현재 구매요청에 등록된 원가 × 수량입니다. 쉽컴펌 완료 후 실제 구매 결과를 CD집계표에 반영하면 예측 정확도 검증에 활용할 수 있습니다.</div>`;
  host.appendChild(panel);
  const outcomeRows = [...panel.querySelectorAll("tbody tr")];
  panel.querySelector("thead tr")?.insertAdjacentHTML("beforeend", "<th>CD 실제 금액</th>");
  let matchedPoCount = 0;
  outcomes.slice().reverse().forEach((item, index) => {
    const poNumber = String(item.request.poNumber || "").trim();
    const matched = poNumber ? (state.cdTransactions || []).filter((row) => String(row.poNumber || "").trim() === poNumber) : [];
    const actual = matched.reduce((sum, row) => sum + Number(row.purchaseAmount || 0), 0);
    if (matched.length) matchedPoCount += 1;
    outcomeRows[index]?.insertAdjacentHTML("beforeend", `<td class="num">${matched.length ? money(actual) : "PO 미매칭"}</td>`);
  });
  const appliedActual = outcomes.reduce((sum, item) => { const poNumber = String(item.request.poNumber || "").trim(); const matched = poNumber ? (state.cdTransactions || []).filter((row) => String(row.poNumber || "").trim() === poNumber) : []; return sum + (matched.length ? matched.reduce((subtotal, row) => subtotal + Number(row.purchaseAmount || 0), 0) : requestAmount(item)); }, 0);
  const metrics = panel.querySelectorAll(".metric");
  if (metrics[1]) { metrics[1].querySelector(".label").textContent = "현재 반영 금액"; metrics[1].querySelector(".value").textContent = money(appliedActual); metrics[1].querySelector(".note").textContent = "CD 실제 금액 우선 적용"; }
  if (metrics[2]) { metrics[2].querySelector(".value").textContent = money(appliedActual - convertedExpected); metrics[2].querySelector(".note").textContent = "현재 반영 금액 − 예상 금액"; }
  const matchedOutcomes = outcomes.map((item) => { const poNumber = String(item.request.poNumber || "").trim(); const matched = poNumber ? (state.cdTransactions || []).filter((row) => String(row.poNumber || "").trim() === poNumber) : []; return { ...item, actual: matched.reduce((sum, row) => sum + Number(row.purchaseAmount || 0), 0), matched: matched.length > 0 }; }).filter((item) => item.matched && Number(item.draft.expectedAmount) > 0);
  const matchedExpected = matchedOutcomes.reduce((sum, item) => sum + Number(item.draft.expectedAmount || 0), 0);
  const matchedActual = matchedOutcomes.reduce((sum, item) => sum + item.actual, 0);
  const accuracy = matchedExpected ? Math.max(0, 100 - Math.abs(matchedActual - matchedExpected) / matchedExpected * 100) : null;
  panel.querySelector(".cards")?.insertAdjacentHTML("beforeend", `<div class="metric"><div class="label">CD 실제 매칭률</div><div class="value">${outcomes.length ? (matchedPoCount / outcomes.length * 100).toFixed(1) : 0}%</div><div class="note">PO 기준 ${matchedPoCount}/${outcomes.length}건</div></div><div class="metric"><div class="label">예측 정확도</div><div class="value">${accuracy === null ? "계산 대기" : `${accuracy.toFixed(1)}%`}</div><div class="note">CD 실제 매칭 ${matchedOutcomes.length}건 기준</div></div>`);
  const categoryAccuracy = new Map();
  matchedOutcomes.forEach((item) => { const category = item.draft.category || "미분류"; const current = categoryAccuracy.get(category) || { count: 0, expected: 0, actual: 0 }; current.count += 1; current.expected += Number(item.draft.expectedAmount || 0); current.actual += item.actual; categoryAccuracy.set(category, current); });
  const categoryRows = [...categoryAccuracy.entries()].map(([category, value]) => ({ category, ...value, accuracy: value.expected ? Math.max(0, 100 - Math.abs(value.actual - value.expected) / value.expected * 100) : 0 })).sort((a, b) => a.accuracy - b.accuracy || b.expected - a.expected);
  if (categoryRows.length) panel.insertAdjacentHTML("beforeend", `<div class="section-title"><h3>카테고리별 예측 정확도</h3><span>CD 실제 매칭 건 기준</span></div><table class="table"><thead><tr><th>대분류</th><th>매칭 건수</th><th>예상 금액</th><th>CD 실제 금액</th><th>차이</th><th>정확도</th></tr></thead><tbody>${categoryRows.map((item) => `<tr><td>${esc(item.category)}</td><td>${item.count}건</td><td class="num">${money(item.expected)}</td><td class="num">${money(item.actual)}</td><td class="num">${money(item.actual - item.expected)}</td><td><span class="status ${item.accuracy >= 90 ? "status-mint" : item.accuracy >= 70 ? "status-gold" : "status-red"}">${item.accuracy.toFixed(1)}%</span></td></tr>`).join("")}</tbody></table>`);
  const outcomeNotice = panel.querySelector(".notice");
  if (outcomeNotice) outcomeNotice.textContent = `전환 요청 ${outcomes.length}건 중 ${matchedPoCount}건이 발주 PO 번호 기준으로 CD집계표와 매칭되었습니다. 매칭된 행의 금액은 실제 세금계산서 구매금액이며, 미매칭 건은 구매요청 등록 금액으로 추적합니다.`;
  const outcomeHead = panel.querySelector(".panel-head");
  outcomeHead?.insertAdjacentHTML("beforeend", `<button class="btn btn-secondary" id="forecastOutcomeCsvExport">Excel용 CSV 다운로드</button><button class="btn btn-secondary" id="forecastAccuracySnapshot">정확도 스냅샷 저장</button><button class="btn btn-secondary" id="forecastAccuracyCsvExport">정확도 CSV 다운로드</button><button class="btn btn-secondary" id="forecastAccuracyMailDraft">정확도 보고 메일 초안</button>`);
  panel.querySelector("#forecastOutcomeCsvExport")?.addEventListener("click", () => { const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`; const header = ["초안번호", "정식 구매요청", "품목", "예상 금액", "요청 등록 금액", "발주 PO 번호", "CD 실제 금액", "금액 차이", "현재 Status"]; const lines = outcomes.map((item) => { const poNumber = String(item.request.poNumber || "").trim(); const matched = poNumber ? (state.cdTransactions || []).filter((row) => String(row.poNumber || "").trim() === poNumber) : []; const cdActual = matched.reduce((sum, row) => sum + Number(row.purchaseAmount || 0), 0); const requestTotal = requestAmount(item); const applied = matched.length ? cdActual : requestTotal; return [item.draft.id, item.request.id, item.draft.product, item.draft.expectedAmount, requestTotal, poNumber, matched.length ? cdActual : "", applied - Number(item.draft.expectedAmount || 0), item.request.status].map(quote).join(","); }); const blob = new Blob([`\uFEFF${header.map(quote).join(",")}\n${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `NP_구매예측_전환결과_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); toast("예측 전환 결과 CSV 보고서를 다운로드했습니다."); });
  panel.querySelector("#forecastAccuracySnapshot")?.addEventListener("click", () => { if (accuracy === null) { toast("PO와 CD 실제 구매이력이 매칭된 예측 건이 있어야 정확도 스냅샷을 저장할 수 있습니다."); return; } state.forecastAccuracySnapshots = state.forecastAccuracySnapshots || []; state.forecastAccuracySnapshots.push({ savedAt: new Date().toLocaleString("ko-KR"), accuracy: Number(accuracy.toFixed(1)), matchRate: Number((matchedPoCount / outcomes.length * 100).toFixed(1)), matchedCount: matchedOutcomes.length, convertedCount: outcomes.length, expectedAmount: matchedExpected, actualAmount: matchedActual, savedBy: roles[state.role].name }); saveState(); renderForecastOutcomeReport(host); toast("예측 정확도 스냅샷을 저장했습니다."); });
  panel.querySelector("#forecastAccuracyCsvExport")?.addEventListener("click", () => { const items = state.forecastAccuracySnapshots || []; if (!items.length) { toast("저장된 예측 정확도 스냅샷이 없습니다."); return; } const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`; const header = ["저장 시각", "예측 정확도", "PO·CD 매칭률", "실제 매칭 건수", "전환 건수", "예상 금액", "실제 금액", "저장자"]; const lines = items.map((item) => [item.savedAt, `${Number(item.accuracy || 0).toFixed(1)}%`, `${Number(item.matchRate || 0).toFixed(1)}%`, item.matchedCount, item.convertedCount, item.expectedAmount, item.actualAmount, item.savedBy].map(quote).join(",")); const blob = new Blob([`\uFEFF${header.map(quote).join(",")}\n${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `NP_구매예측_정확도추이_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); toast("예측 정확도 추이 CSV를 다운로드했습니다."); });
  panel.querySelector("#forecastAccuracyMailDraft")?.addEventListener("click", () => { const subject = "[NP InsightFlow] 구매 예측 정확도 현황 공유"; const body = `안녕하세요.\n\n구매 예측 정확도 현황을 공유드립니다.\n\n- 정식 구매요청 전환: ${outcomes.length}건\n- PO·CD 실제 구매이력 매칭: ${matchedPoCount}건 (${outcomes.length ? (matchedPoCount / outcomes.length * 100).toFixed(1) : 0}%)\n- 예측 정확도: ${accuracy === null ? "계산 대기" : `${accuracy.toFixed(1)}%`}\n- 예측 금액(실제 매칭 기준): ${money(matchedExpected)}\n- 세금계산서 실제 구매금액: ${money(matchedActual)}\n- 쉽컴펌 완료: ${completed.length}건\n\n${accuracy === null ? "PO 번호 등록 및 CD집계표 실제 구매이력 반영 후 정확도 검증이 가능합니다." : "세부 전환 결과와 카테고리별 정확도는 시스템 구매 예측 화면에서 확인할 수 있습니다."}\n\n감사합니다.\nNP MKT 구매팀`; state.mailDrafts = state.mailDrafts || []; state.mailDrafts.push({ createdAt: new Date().toLocaleString("ko-KR"), supplier: "팀장 김춘수 · 담당 Buyer", subject, body, source: "구매 예측 정확도 보고" }); saveState(); toast("예측 정확도 보고 메일 초안을 저장했습니다. 견적 메일 메뉴에서 확인·복사할 수 있습니다."); });
  const snapshots = (state.forecastAccuracySnapshots || []).slice().reverse().slice(0, 10);
  if (snapshots.length) panel.insertAdjacentHTML("beforeend", `<div class="section-title"><h3>예측 정확도 스냅샷</h3><span>최근 ${snapshots.length}건</span></div><table class="table"><thead><tr><th>저장 시각</th><th>정확도</th><th>PO·CD 매칭률</th><th>실제 매칭/전환</th><th>예상 금액</th><th>실제 금액</th><th>저장자</th></tr></thead><tbody>${snapshots.map((item) => `<tr><td>${esc(item.savedAt)}</td><td><span class="status ${item.accuracy >= 90 ? "status-mint" : item.accuracy >= 70 ? "status-gold" : "status-red"}">${item.accuracy.toFixed(1)}%</span></td><td>${item.matchRate.toFixed(1)}%</td><td>${item.matchedCount}/${item.convertedCount}건</td><td class="num">${money(item.expectedAmount)}</td><td class="num">${money(item.actualAmount)}</td><td>${esc(item.savedBy)}</td></tr>`).join("")}</tbody></table>`);
  if (snapshots.length >= 2) { const chronological = snapshots.slice().reverse(); panel.insertAdjacentHTML("beforeend", `<div class="panel" style="margin-top:16px"><div class="panel-head"><h2>예측 정확도 추이</h2><span>저장 순서 기준</span></div>${chronological.map((item) => `<div class="analysis-row"><span>${esc(item.savedAt)}</span><div class="analysis-track"><i style="width:${Math.max(2, Math.min(100, Number(item.accuracy || 0)))}%"></i></div><b>${Number(item.accuracy || 0).toFixed(1)}%</b><em>매칭 ${Number(item.matchRate || 0).toFixed(1)}%</em></div>`).join("")}</div>`); }
  panel.querySelectorAll(".forecast-outcome-request").forEach((button) => button.addEventListener("click", () => { state.selectedId = button.dataset.requestId; state.view = "detail"; render(); }));
}

function openForecastPurchaseDraftModal(draftId) {
  const draft = (state.forecastPurchaseDrafts || []).find((item) => item.id === draftId);
  if (!draft) return;
  const supplierCandidates = (() => { const grouped = new Map(); (state.cdTransactions || []).filter((row) => String(row.categoryLarge || "") === String(draft.category || "") && row.supplierName).forEach((row) => { const current = grouped.get(row.supplierName) || { count: 0, maintenance: false, amount: 0 }; current.count += 1; current.maintenance ||= String(row.purchasePurpose || "").includes("유지보수"); current.amount += Number(row.purchaseAmount || 0); grouped.set(row.supplierName, current); }); return [...grouped.entries()].map(([supplier, value]) => ({ supplier, ...value, score: Math.min(100, 50 + Math.min(30, value.count * 3) + (value.maintenance ? 20 : 0)) })).sort((a, b) => b.score - a.score || b.amount - a.amount).slice(0, 3); })();
  const priceRows = (state.cdTransactions || []).filter((row) => Number(row.unitPrice) > 0 && (String(row.modelName || "").trim() === String(draft.product || "").trim() || String(row.categoryLarge || "").trim() === String(draft.category || "").trim())).sort((a, b) => new Date(b.taxInvoiceDate) - new Date(a.taxInvoiceDate));
  const priceStats = priceRows.length ? { min: Math.min(...priceRows.map((row) => Number(row.unitPrice))), average: priceRows.reduce((sum, row) => sum + Number(row.unitPrice), 0) / priceRows.length, recent: Number(priceRows[0].unitPrice), count: priceRows.length, basis: priceRows.some((row) => String(row.modelName || "").trim() === String(draft.product || "").trim()) ? "동일 모델 우선" : "동일 대분류" } : null;
  const modal = document.createElement("div");
  modal.innerHTML = `<div style="position:fixed;inset:0;background:rgba(20,43,68,.36);display:grid;place-items:center;z-index:10"><div class="detail-card" style="width:680px;max-height:90vh;overflow:auto"><div class="detail-title"><div><h2>예측 구매요청 초안 확인</h2><p>정식 구매요청 접수 전 Buyer 검토용입니다.</p></div><button class="btn btn-secondary" data-close>닫기</button></div><form id="forecastDraftForm"><div class="form-grid" style="margin-top:20px"><div class="field"><label>품목 *</label><input name="product" required value="${esc(draft.product)}" /></div><div class="field"><label>대분류 *</label><input name="category" required value="${esc(draft.category || "")}" /></div><div class="field"><label>예상 업체</label><input name="supplier" value="${esc(draft.supplier)}" /></div><div class="field"><label>수량 *</label><input name="quantity" type="number" min="1" required value="${Number(draft.quantity || 1)}" /></div><div class="field full"><label>데이터 기반 추천 업체</label>${supplierCandidates.length ? `<div class="toolbar">${supplierCandidates.map((item) => `<button type="button" class="btn btn-secondary forecast-supplier-suggest" data-supplier="${esc(item.supplier)}">${esc(item.supplier)} · ${item.score}점</button>`).join("")}</div><small>거래 건수와 유지보수 이력 기준입니다. 실제 선정 전 견적·계약 조건을 확인해 주세요.</small>` : `<small>이 카테고리의 업체 추천 데이터가 없습니다.</small>`}</div><div class="field"><label>납품월 *</label><input name="deliveryMonth" type="month" required value="${esc(draft.deliveryMonth || draft.expectedDate?.slice(0, 7) || "")}" /></div><div class="field"><label>예상 금액 *</label><input name="expectedAmount" type="number" min="0" required value="${Number(draft.expectedAmount || 0)}" /></div><div class="field"><label>요청자</label><input name="requester" value="${esc(draft.requester || "")}" placeholder="정식 접수 시 필수" /></div><div class="field"><label>고객명</label><input name="customer" value="${esc(draft.customer || "")}" placeholder="정식 접수 시 필수" /></div><div class="field"><label>담당자명</label><input name="contactName" value="${esc(draft.contactName || "")}" placeholder="정식 접수 시 필수" /></div><div class="field"><label>연락처</label><input name="phone" value="${esc(draft.phone || "")}" placeholder="정식 접수 시 필수" /></div><div class="field full"><label>납품주소</label><input name="deliveryAddress" value="${esc(draft.deliveryAddress || "")}" placeholder="정식 접수 시 필수" /></div><div class="field"><label>계약 유형</label><select name="contractType"><option ${draft.contractType === "비단가계약" ? "selected" : ""}>비단가계약</option><option ${draft.contractType === "단가계약" ? "selected" : ""}>단가계약</option><option ${draft.contractType === "유지보수" ? "selected" : ""}>유지보수</option></select></div><div class="field"><label>보증기간</label><select name="warranty"><option ${draft.warranty === "1년" ? "selected" : ""}>1년</option><option ${draft.warranty === "2년" ? "selected" : ""}>2년</option><option ${draft.warranty === "3년" ? "selected" : ""}>3년</option><option ${draft.warranty === "해당없음" ? "selected" : ""}>해당없음</option></select></div><div class="field"><label>설치 지원</label><select name="install"><option ${draft.install === "예" ? "selected" : ""}>예</option><option ${draft.install === "아니오" ? "selected" : ""}>아니오</option></select></div><div class="field"><label>교육 지원</label><select name="training"><option ${draft.training === "예" ? "selected" : ""}>예</option><option ${draft.training === "아니오" ? "selected" : ""}>아니오</option></select></div><div class="field full"><label>Buyer 검토 메모</label><input name="note" value="${esc(draft.note || "")}" placeholder="계약·재고·납기 확인 내용" /></div></div><div class="action-row"><button type="button" class="btn btn-secondary" data-close>취소</button><button class="btn btn-primary" name="draftStatus" value="초안">저장</button><button class="btn btn-primary" name="draftStatus" value="접수 준비완료">접수 준비완료</button>${draft.status === "접수 준비완료" ? `<button class="btn btn-primary" name="draftStatus" value="정식 구매요청 등록">정식 구매요청 등록</button>` : ""}</div></form></div></div>`;
  document.body.appendChild(modal);
  const amountField = modal.querySelector("[name='expectedAmount']")?.closest(".field");
  if (amountField && priceStats) amountField.insertAdjacentHTML("afterend", `<div class="field full"><label>과거 단가 근거</label><div class="notice">${esc(priceStats.basis)} · ${priceStats.count}건 기준 · 최저 ${money(priceStats.min)} / 평균 ${money(priceStats.average)} / 최근 ${money(priceStats.recent)}</div></div>`);
  modal.querySelector(".action-row")?.insertAdjacentHTML("beforeend", `<button type="button" class="btn btn-secondary" id="forecastDraftMailGenerate">견적 요청 메일 초안</button>`);
  modal.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => modal.remove()));
  modal.querySelectorAll(".forecast-supplier-suggest").forEach((button) => button.addEventListener("click", () => { const input = modal.querySelector("[name='supplier']"); if (input) input.value = button.dataset.supplier || ""; }));
  modal.querySelector("#forecastDraftMailGenerate")?.addEventListener("click", () => { const form = new FormData(modal.querySelector("#forecastDraftForm")); const supplier = String(form.get("supplier") || "").trim(); const product = String(form.get("product") || "").trim(); if (!supplier || !product) { toast("업체와 품목을 먼저 입력해 주세요."); return; } const subject = `[NP MKT 견적요청] ${product} 견적 요청`; const body = `안녕하세요.\n\n아래 품목의 견적을 요청드립니다.\n\n- 상품/모델: ${product}\n- 대분류: ${form.get("category") || ""}\n- 수량: ${form.get("quantity") || ""}\n- 납품 희망월: ${form.get("deliveryMonth") || ""}\n- 고객명: ${form.get("customer") || "확인 중"}\n- 요청사항: 견적서, 납기, 보증기간, 설치·교육 지원 가능 여부를 회신 부탁드립니다.\n\n감사합니다.\nNP MKT 구매팀\n담당: ${roles[state.role].name}`; state.mailDrafts = state.mailDrafts || []; state.mailDrafts.push({ createdAt: new Date().toLocaleString("ko-KR"), supplier, subject, body, source: `예측 초안 ${draft.id}` }); saveState(); toast("견적 요청 메일 초안을 저장했습니다. 견적 메일 메뉴에서 확인·복사할 수 있습니다."); });
  modal.querySelector("#forecastDraftForm").addEventListener("submit", (event) => { event.preventDefault(); const form = new FormData(event.target); const action = event.submitter?.value || "초안"; Object.assign(draft, { product: form.get("product"), category: form.get("category"), supplier: form.get("supplier"), quantity: Number(form.get("quantity")), deliveryMonth: form.get("deliveryMonth"), expectedAmount: Number(form.get("expectedAmount")), requester: form.get("requester"), customer: form.get("customer"), contactName: form.get("contactName"), phone: form.get("phone"), deliveryAddress: form.get("deliveryAddress"), contractType: form.get("contractType"), warranty: form.get("warranty"), install: form.get("install"), training: form.get("training"), note: form.get("note"), status: action, updatedBy: roles[state.role].name, updatedAt: new Date().toLocaleString("ko-KR") }); if (action === "정식 구매요청 등록") { const required = [draft.requester, draft.customer, draft.contactName, draft.phone, draft.deliveryAddress]; if (required.some((value) => !String(value || "").trim())) { draft.status = "접수 준비완료"; toast("정식 접수에는 요청자·고객명·담당자명·연락처·납품주소가 필요합니다."); return; } const serial = Math.max(0, ...state.requests.map((request) => Number(String(request.id).split("-").pop()) || 0)) + 1; const requestId = `REQ-${new Date().getFullYear()}-${String(serial).padStart(4, "0")}`; const unitCost = Math.round(Number(draft.expectedAmount || 0) / Math.max(1, Number(draft.quantity || 1))); const buyer = buyerMap[draft.category] || roles[state.role].name; const receivedAt = new Date().toISOString().slice(0, 10); state.requests.unshift({ id: requestId, receivedAt, requester: draft.requester, team: "예측 기반 구매요청", customer: draft.customer, deliveryMonth: draft.deliveryMonth, deliveryAddress: draft.deliveryAddress, contact: `${draft.contactName} / ${draft.phone}`, contractType: draft.contractType, warranty: draft.warranty, install: draft.install, training: draft.training, status: "접수/구매진행", approval: "대기", buyer, items: [{ product: draft.product, category: draft.category, qty: Number(draft.quantity), cost: unitCost, vendor: draft.supplier || "미정", quoteValid: "", selected: false }], history: [{ status: "접수/구매진행", actor: roles[state.role].name, at: now(), note: `예측 초안 ${draft.id}에서 정식 구매요청 접수` }] }); draft.status = "정식 접수"; draft.requestId = requestId; saveState(); modal.remove(); state.selectedId = requestId; state.view = "detail"; render(); toast(`${requestId} 구매요청이 접수되었습니다. 팀장 승인을 기다려 주세요.`); return; } saveState(); modal.remove(); renderForecastPurchaseDrafts(document.querySelector("#forecastBody")); toast(draft.status === "접수 준비완료" ? "구매요청 접수 준비가 완료되었습니다." : "초안 내용을 저장했습니다."); });
}

function businessModelView() {
  const rows = state.cdTransactions || [];
  const categories = [...new Set(rows.map((row) => row.categoryLarge).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
  return `<div class="page-head"><div><h1>사업기회 추천</h1><p>구매 패턴을 바탕으로 단가계약·통합 구매·유지보수 패키지·절감 협상 기회를 제안합니다.</p></div><span class="status status-blue">추천 v1 · 근거 기반</span></div><div class="panel"><div class="analysis-filters"><select id="businessCategory"><option value="">전체 대분류</option>${categories.map((value) => `<option>${esc(value)}</option>`).join("")}</select><button class="btn btn-primary" id="businessApply">추천 분석</button><button class="btn btn-secondary" id="businessReset">초기화</button></div></div><div id="businessBody"></div>`;
}

function bindBusinessModelEvents() {
  const refresh = (announce = false) => { renderBusinessModelBody(); if (announce) toast("사업기회 추천을 분석했습니다."); };
  document.querySelector("#businessApply")?.addEventListener("click", () => refresh(true));
  document.querySelector("#businessCategory")?.addEventListener("change", () => refresh());
  document.querySelector("#businessReset")?.addEventListener("click", () => { document.querySelector("#businessCategory").value = ""; refresh(true); });
  refresh();
}

function renderBusinessModelBody() {
  const category = document.querySelector("#businessCategory")?.value || "";
  const rows = (state.cdTransactions || []).filter((row) => Number(row.purchaseAmount) > 0 && (!category || row.categoryLarge === category));
  const body = document.querySelector("#businessBody");
  if (!body) return;
  if (!rows.length) { body.innerHTML = `<div class="panel"><div class="empty">추천을 계산할 구매금액 데이터가 없습니다. CD집계표를 업로드해 주세요.</div></div>`; return; }
  const groups = new Map();
  rows.forEach((row) => { const key = row.categoryLarge || "미분류"; const list = groups.get(key) || []; list.push(row); groups.set(key, list); });
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.purchaseAmount || 0), 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const recurringGroups = new Map();
  rows.forEach((row) => { const product = String(row.modelName || row.categoryLarge || "").trim(); const supplier = String(row.supplierName || "업체 미입력").trim(); if (!product) return; const key = `${product}::${supplier}`; const list = recurringGroups.get(key) || []; list.push(row); recurringGroups.set(key, list); });
  const forecastByCategory = new Map();
  recurringGroups.forEach((items) => { const sorted = items.slice().sort((a, b) => new Date(a.taxInvoiceDate) - new Date(b.taxInvoiceDate)); if (sorted.length < 2) return; const gaps = sorted.slice(1).map((row, index) => (new Date(row.taxInvoiceDate) - new Date(sorted[index].taxInvoiceDate)) / 86400000).filter((value) => value > 0); const interval = gaps.length ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length : 0; if (!interval || interval > 730) return; const last = sorted[sorted.length - 1]; const nextDate = new Date(new Date(last.taxInvoiceDate).getTime() + interval * 86400000); const days = Math.ceil((nextDate - today) / 86400000); if (days < 0 || days > 90) return; const categoryKey = last.categoryLarge || "미분류"; const current = forecastByCategory.get(categoryKey) || { count: 0, amount: 0 }; current.count += 1; current.amount += sorted.reduce((sum, row) => sum + Number(row.purchaseAmount || 0), 0) / sorted.length; forecastByCategory.set(categoryKey, current); });
  const recommendations = [...groups.entries()].map(([name, items]) => {
    const amount = items.reduce((sum, row) => sum + Number(row.purchaseAmount || 0), 0);
    const suppliers = new Map();
    items.forEach((row) => { const key = row.supplierName || "업체 미입력"; suppliers.set(key, (suppliers.get(key) || 0) + Number(row.purchaseAmount || 0)); });
    const supplierRank = [...suppliers.entries()].sort((a, b) => b[1] - a[1]);
    const topSupplier = supplierRank[0]?.[0] || "업체 미입력";
    const concentration = amount ? (supplierRank[0]?.[1] || 0) / amount : 0;
    const maintenanceRatio = items.filter((row) => String(row.purchasePurpose || "").includes("유지보수")).length / items.length;
    const costDown = items.reduce((sum, row) => sum + Number(row.costDownAmount || 0), 0);
    const amountScore = Math.min(35, amount / Math.max(totalAmount, 1) * 100);
    const repeatScore = Math.min(25, items.length * 2);
    const maintenanceScore = Math.round(maintenanceRatio * 20);
    const concentrationScore = Math.round(concentration * 20);
    const forecast = forecastByCategory.get(name) || { count: 0, amount: 0 };
    const forecastScore = Math.min(15, forecast.count * 5);
    const score = Math.min(100, Math.round(amountScore + repeatScore + maintenanceScore + concentrationScore + forecastScore));
    let model = "통합 구매 검토";
    let rationale = `거래 업체 ${suppliers.size}곳으로 분산`; 
    if (forecast.count >= 2) { model = "예측 기반 단가계약 검토"; rationale = `90일 내 반복 구매 예상 ${forecast.count}건 · 예상 ${money(forecast.amount)}`; }
    else if (maintenanceRatio >= .25) { model = "유지보수 패키지화"; rationale = `유지보수 구매 비중 ${(maintenanceRatio * 100).toFixed(0)}%`; }
    else if (items.length >= 5 && concentration >= .55) { model = "단가계약 확대"; rationale = `반복 구매 ${items.length}건 · ${topSupplier} 집중 ${(concentration * 100).toFixed(0)}%`; }
    else if (amount >= totalAmount * .12 && concentration >= .7) { model = "Cost Down 우선 협상"; rationale = `구매금액 비중 ${(amount / totalAmount * 100).toFixed(0)}% · 단일 업체 집중`; }
    else if (suppliers.size >= 3) { model = "통합 구매·공급전략"; rationale = `동일 카테고리 거래 업체 ${suppliers.size}곳`; }
    return { name, items, amount, suppliers: suppliers.size, topSupplier, concentration, maintenanceRatio, costDown, score, model, rationale, forecast };
  }).sort((a, b) => b.score - a.score || b.amount - a.amount);
  const high = recommendations.filter((item) => item.score >= 50).length;
  const totalSavings = recommendations.reduce((sum, item) => sum + item.costDown, 0);
  const forecastOpportunity = recommendations.filter((item) => item.forecast.count > 0);
  body.innerHTML = `<div class="cards"><div class="metric"><div class="label">우선 검토 기회</div><div class="value">${high}</div><div class="note">추천 점수 50점 이상</div></div><div class="metric"><div class="label">90일 반복 구매 예측</div><div class="value">${forecastOpportunity.reduce((sum, item) => sum + item.forecast.count, 0)}</div><div class="note">단가계약·통합구매 검토 후보</div></div><div class="metric"><div class="label">분석 구매금액</div><div class="value" title="${money(totalAmount)}">${money(totalAmount)}</div><div class="note">필터 결과</div></div><div class="metric"><div class="label">기존 Cost Down</div><div class="value" title="${money(totalSavings)}">${money(totalSavings)}</div><div class="note">원본 누적값</div></div></div><div class="panel"><div class="panel-head"><h2>추천 사업모델</h2><span>점수 · 근거 · 최대 100개</span></div><table class="table"><thead><tr><th>우선순위</th><th>추천 사업모델</th><th>대분류</th><th>추천점수</th><th>구매금액</th><th>90일 반복 예측</th><th>업체</th><th>추천 근거</th><th>예상 절감 검토</th></tr></thead><tbody>${recommendations.slice(0, 100).map((item, index) => `<tr class="business-row" data-business-index="${index}"><td>${index + 1}</td><td><strong>${esc(item.model)}</strong></td><td>${esc(item.name)}</td><td><span class="status ${item.score >= 65 ? "status-mint" : item.score >= 45 ? "status-gold" : "status-blue"}">${item.score}점</span></td><td class="num">${money(item.amount)}</td><td>${item.forecast.count ? `${item.forecast.count}건 · ${money(item.forecast.amount)}` : "-"}</td><td>${esc(item.topSupplier)} 외 ${Math.max(0, item.suppliers - 1)}</td><td>${esc(item.rationale)}</td><td class="num">${item.costDown ? money(item.costDown) : "추정 필요"}</td></tr>`).join("")}</tbody></table></div><div class="panel" id="businessEvidence"><div class="panel-head"><h2>추천 근거 행</h2><span>추천을 클릭하면 해당 구매 이력을 표시합니다.</span></div><div class="empty">추천 항목을 선택해 주세요.</div></div>`;
  document.querySelectorAll(".business-row").forEach((row) => row.addEventListener("click", () => { const item = recommendations[Number(row.dataset.businessIndex)]; const evidence = document.querySelector("#businessEvidence"); if (!item || !evidence) return; evidence.innerHTML = `<div class="panel-head"><h2>${esc(item.name)} · ${esc(item.model)}</h2><span>${item.items.length}건 근거</span></div><div class="notice">${esc(item.rationale)} · Buyer가 실제 계약 조건·시장 가격·업체 평가를 검토한 뒤 적용합니다.</div>${historyTable(item.items.slice().sort((a, b) => Number(b.purchaseAmount || 0) - Number(a.purchaseAmount || 0)).slice(0, 100))}`; evidence.scrollIntoView({ behavior: "smooth", block: "start" }); }));
  enhanceBusinessRecommendationActions(recommendations);
}

function enhanceBusinessRecommendationActions(recommendations) {
  const panel = [...document.querySelectorAll(".panel")].find((item) => item.textContent.includes("추천 사업모델"));
  const table = panel?.querySelector("table");
  if (!table || table.dataset.actionsEnhanced === "true") return;
  const canManage = ["buyer", "admin"].includes(state.role);
  if (!canManage) return;
  table.querySelector("thead tr")?.insertAdjacentHTML("beforeend", "<th>검토 상태</th><th>의견</th>");
  state.businessRecommendationStatus = state.businessRecommendationStatus || {};
  [...table.querySelectorAll("tbody tr")].forEach((row, index) => {
    const item = recommendations[index];
    if (!item) return;
    const key = `${item.name}::${item.model}`;
    const current = state.businessRecommendationStatus[key]?.status || "검토대기";
    row.insertAdjacentHTML("beforeend", `<td><select class="business-status-select" data-business-key="${esc(key)}"><option ${current === "검토대기" ? "selected" : ""}>검토대기</option><option ${current === "검토중" ? "selected" : ""}>검토중</option><option ${current === "채택" ? "selected" : ""}>채택</option><option ${current === "보류" ? "selected" : ""}>보류</option></select></td><td><button class="btn btn-secondary business-note-edit" data-business-key="${esc(key)}">${state.businessRecommendationStatus[key]?.note ? "의견 수정" : "의견 입력"}</button></td>`);
  });
  table.querySelectorAll(".business-status-select").forEach((select) => { select.addEventListener("click", (event) => event.stopPropagation()); select.addEventListener("change", (event) => {
    event.stopPropagation();
    const key = select.dataset.businessKey;
    const beforeStatus = state.businessRecommendationStatus[key]?.status || "검토대기";
    state.businessRecommendationStatus[key] = { status: select.value, updatedBy: roles[state.role].name, updatedAt: new Date().toLocaleString("ko-KR") };
    state.businessRecommendationHistory = state.businessRecommendationHistory || [];
    state.businessRecommendationHistory.push({ key, beforeStatus, afterStatus: select.value, changedBy: roles[state.role].name, changedAt: state.businessRecommendationStatus[key].updatedAt });
    saveState();
    renderBusinessRecommendationHistory(recommendations);
    document.querySelector("#businessStatusFilter")?.dispatchEvent(new Event("change"));
    toast(`추천 검토 상태를 ${select.value}(으)로 저장했습니다.`);
  }); });
  table.dataset.actionsEnhanced = "true";
  table.querySelectorAll(".business-note-edit").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); openBusinessRecommendationNote(button.dataset.businessKey); }));
  addBusinessStatusFilter(panel, recommendations);
  renderBusinessRecommendationHistory(recommendations);
}

function addBusinessStatusFilter(panel, recommendations) {
  if (!panel || panel.querySelector("#businessStatusFilter")) return;
  const table = panel.querySelector("table");
  if (!table) return;
  const filter = document.createElement("div");
  filter.className = "analysis-filters list-filter-bar";
  filter.innerHTML = `<select id="businessStatusFilter"><option value="">전체 검토 상태</option><option>검토대기</option><option>검토중</option><option>채택</option><option>보류</option></select><span class="filter-result" id="businessFilterCount"></span>`;
  panel.querySelector(".panel-head")?.after(filter);
  const refresh = () => {
    const selected = filter.querySelector("#businessStatusFilter").value;
    const rows = [...table.querySelectorAll("tbody tr")];
    rows.forEach((row, index) => { const item = recommendations[index]; const key = item ? `${item.name}::${item.model}` : ""; const status = state.businessRecommendationStatus?.[key]?.status || "검토대기"; row.hidden = Boolean(selected && status !== selected); });
    const visible = rows.filter((row) => !row.hidden).length;
    filter.querySelector("#businessFilterCount").textContent = `${visible}건 표시`;
  };
  filter.querySelector("#businessStatusFilter").addEventListener("change", refresh);
  refresh();
}

function openBusinessRecommendationNote(key) {
  state.businessRecommendationStatus = state.businessRecommendationStatus || {};
  const current = state.businessRecommendationStatus[key] || { status: "검토대기" };
  const modal = document.createElement("div");
  modal.innerHTML = `<div style="position:fixed;inset:0;background:rgba(20,43,68,.36);display:grid;place-items:center;z-index:10"><div class="detail-card" style="width:560px;max-width:calc(100vw - 32px)"><div class="detail-title"><div><h2>추천 검토 의견</h2><p>${esc(key.replace("::", " · "))}</p></div><button class="btn btn-secondary" data-close>닫기</button></div><form id="businessNoteForm"><div class="field" style="margin-top:18px"><label>검토 의견</label><textarea name="note" rows="6" placeholder="시장 가격, 계약 조건, 검토 결과 및 후속 조치를 입력해 주세요.">${esc(current.note || "")}</textarea></div><div class="action-row"><button type="button" class="btn btn-secondary" data-close>취소</button><button class="btn btn-primary">의견 저장</button></div></form></div></div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => modal.remove()));
  modal.querySelector("#businessNoteForm").addEventListener("submit", (event) => { event.preventDefault(); const note = String(new FormData(event.target).get("note") || "").trim(); const beforeStatus = current.status || "검토대기"; state.businessRecommendationStatus[key] = { ...current, note, updatedBy: roles[state.role].name, updatedAt: new Date().toLocaleString("ko-KR") }; state.businessRecommendationHistory = state.businessRecommendationHistory || []; state.businessRecommendationHistory.push({ key, beforeStatus, afterStatus: current.status || "검토대기", changedBy: roles[state.role].name, changedAt: state.businessRecommendationStatus[key].updatedAt, note: "검토 의견 저장" }); saveState(); modal.remove(); renderBusinessModelBody(); toast("추천 검토 의견을 저장했습니다."); });
}

function renderBusinessRecommendationHistory(recommendations = []) {
  const host = document.querySelector("#businessBody");
  if (!host) return;
  document.querySelector("#businessDecisionHistory")?.remove();
  document.querySelector("#businessExecutionPlan")?.remove();
  const history = state.businessRecommendationHistory || [];
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "businessDecisionHistory";
  panel.innerHTML = `<div class="panel-head"><h2>추천 검토 이력</h2><span>${history.length}건</span></div>${history.length ? `<table class="table"><thead><tr><th>처리일시</th><th>추천 항목</th><th>변경 전</th><th>변경 후</th><th>처리자</th><th>내용</th></tr></thead><tbody>${history.slice().reverse().slice(0, 100).map((item) => `<tr><td>${esc(item.changedAt)}</td><td>${esc(item.key.replace("::", " · "))}</td><td>${esc(item.beforeStatus)}</td><td><span class="status ${item.afterStatus === "채택" ? "status-mint" : item.afterStatus === "보류" ? "status-red" : "status-blue"}">${esc(item.afterStatus)}</span></td><td>${esc(item.changedBy)}</td><td>${esc(item.note || "상태 변경")}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">아직 검토 상태 변경 이력이 없습니다.</div>`}`;
  host.appendChild(panel);
  const adopted = recommendations.filter((item) => state.businessRecommendationStatus?.[`${item.name}::${item.model}`]?.status === "채택");
  const execution = document.createElement("div");
  execution.className = "panel";
  execution.id = "businessExecutionPlan";
  execution.innerHTML = `<div class="panel-head"><h2>채택 사업기회 · 실행 후보</h2><div class="toolbar"><span>${adopted.length}건</span>${adopted.length ? `<button class="btn btn-secondary" id="executionCsvExport">Excel용 CSV 다운로드</button>` : ""}</div></div>${adopted.length ? `<table class="table"><thead><tr><th>추천 사업모델</th><th>대분류</th><th>구매금액</th><th>대표 업체</th><th>검토 의견</th><th>최종 갱신</th></tr></thead><tbody>${adopted.map((item) => { const saved = state.businessRecommendationStatus[`${item.name}::${item.model}`] || {}; return `<tr><td><strong>${esc(item.model)}</strong></td><td>${esc(item.name)}</td><td class="num">${money(item.amount)}</td><td>${esc(item.topSupplier)}</td><td class="wrap-cell">${esc(saved.note || "검토 의견 미입력")}</td><td>${esc(saved.updatedAt || "-")} · ${esc(saved.updatedBy || "-")}</td></tr>`; }).join("")}</tbody></table>` : `<div class="empty">채택 상태로 변경한 사업기회가 없습니다.</div>`}`;
  host.appendChild(execution);
  enhanceBusinessExecutionPlan(execution, adopted);
  renderBusinessExecutionOwnerSummary(host, adopted);
}

function renderBusinessExecutionOwnerSummary(host, adopted) {
  document.querySelector("#businessExecutionOwnerSummary")?.remove();
  if (!adopted.length) return;
  const grouped = new Map();
  adopted.forEach((item) => { const saved = state.businessRecommendationStatus?.[`${item.name}::${item.model}`] || {}; const owner = saved.executionOwner || item.items.map((row) => row.buyer).find(Boolean) || "미지정"; const current = grouped.get(owner) || { owner, count: 0, completed: 0, target: 0, actual: 0 }; current.count += 1; current.completed += saved.executionStatus === "완료" ? 1 : 0; current.target += Number(saved.targetSaving || 0); current.actual += Number(saved.actualSaving || 0); grouped.set(owner, current); });
  const rows = [...grouped.values()].map((item) => ({ ...item, achievement: item.target ? item.actual / item.target * 100 : null })).sort((a, b) => b.actual - a.actual || b.target - a.target);
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "businessExecutionOwnerSummary";
  panel.innerHTML = `<div class="panel-head"><h2>Buyer별 사업기회 실행 성과</h2><span>채택 과제 기준</span></div><table class="table"><thead><tr><th>담당 Buyer</th><th>과제 수</th><th>완료</th><th>목표 절감액</th><th>실제 절감액</th><th>달성률</th><th></th></tr></thead><tbody>${rows.map((item) => `<tr><td><strong>${esc(item.owner)}</strong></td><td>${item.count}건</td><td>${item.completed}건</td><td class="num">${money(item.target)}</td><td class="num">${money(item.actual)}</td><td><span class="status ${item.achievement === null ? "status-blue" : item.achievement >= 100 ? "status-mint" : "status-gold"}">${item.achievement === null ? "목표 미입력" : `${item.achievement.toFixed(1)}%`}</span></td><td><button class="btn btn-ghost execution-owner-open" data-execution-owner="${esc(item.owner)}">과제 보기 →</button></td></tr>`).join("")}</tbody></table>`;
  host.appendChild(panel);
  panel.querySelectorAll(".execution-owner-open").forEach((button) => button.addEventListener("click", () => { const filter = document.querySelector("#executionOwnerFilter"); if (!filter) { toast("실행 과제 상세 필터는 Buyer·관리자 권한에서 사용할 수 있습니다."); return; } filter.value = button.dataset.executionOwner || ""; filter.dispatchEvent(new Event("change")); document.querySelector("#businessExecutionPlan")?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
}

function enhanceBusinessExecutionPlan(panel, adopted) {
  const table = panel?.querySelector("table");
  if (!table) return;
  const buyers = [...new Set([...Object.values(buyerMap), ...adopted.flatMap((item) => item.items.map((row) => row.buyer).filter(Boolean))])].sort((a, b) => a.localeCompare(b, "ko"));
  if (!["buyer", "admin"].includes(state.role)) { addReadOnlyExecutionFilters(panel, table, adopted, buyers); return; }
  panel.querySelector("#executionCsvExport")?.addEventListener("click", () => {
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const header = ["추천 사업모델", "대분류", "대표 업체", "담당 Buyer", "실행 상태", "목표 완료일", "구매금액", "목표 절감액", "실제 절감액", "달성률", "검토 의견", "완료일"];
    const lines = adopted.map((item) => { const saved = state.businessRecommendationStatus?.[`${item.name}::${item.model}`] || {}; const target = Number(saved.targetSaving || 0); const actual = Number(saved.actualSaving || 0); return [item.model, item.name, item.topSupplier, saved.executionOwner || "", saved.executionStatus || "계획", saved.dueDate || "", item.amount, target, actual, target ? `${(actual / target * 100).toFixed(1)}%` : "", saved.note || "", saved.completedAt || ""].map(quote).join(","); });
    const blob = new Blob([`\uFEFF${header.map(quote).join(",")}\n${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `NP_사업기회_실행과제_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); toast("실행 과제 CSV 보고서를 다운로드했습니다.");
  });
  table.querySelector("thead tr")?.insertAdjacentHTML("beforeend", "<th>담당 Buyer</th><th>목표 완료일</th><th>실행 상태</th><th>목표 절감액</th><th>실제 절감액</th><th>달성률</th><th>관리</th>");
  if (!panel.querySelector("#executionPlanFilter")) {
    const filter = document.createElement("div");
    filter.className = "analysis-filters list-filter-bar";
    filter.id = "executionPlanFilter";
    filter.innerHTML = `<select id="executionOwnerFilter"><option value="">전체 Buyer</option>${buyers.map((buyer) => `<option value="${esc(buyer)}">${esc(buyer)}</option>`).join("")}</select><select id="executionStatusFilter"><option value="">전체 실행 상태</option><option>계획</option><option>협상 준비</option><option>협상 진행</option><option>완료</option><option>보류</option></select><span class="filter-result" id="executionFilterCount"></span>`;
    panel.querySelector(".panel-head")?.after(filter);
  }
  [...table.querySelectorAll("tbody tr")].forEach((row, index) => {
    const item = adopted[index];
    if (!item) return;
    const key = `${item.name}::${item.model}`;
    const saved = state.businessRecommendationStatus?.[key] || {};
    const defaultOwner = item.items.map((entry) => entry.buyer).find(Boolean) || roles.buyer.name;
    const executionOwner = saved.executionOwner || defaultOwner;
    const executionStatus = saved.executionStatus || "계획";
    const achievement = Number(saved.targetSaving || 0) ? Number(saved.actualSaving || 0) / Number(saved.targetSaving || 0) * 100 : null;
    row.dataset.executionOwner = executionOwner;
    row.dataset.executionStatus = executionStatus;
    row.insertAdjacentHTML("beforeend", `<td><select class="execution-owner-input" data-execution-key="${esc(key)}"><option value="">담당 지정</option>${buyers.map((buyer) => `<option value="${esc(buyer)}" ${executionOwner === buyer ? "selected" : ""}>${esc(buyer)}</option>`).join("")}</select></td><td><input class="execution-due-input" data-execution-key="${esc(key)}" type="date" value="${esc(saved.dueDate || "")}" /></td><td><select class="execution-status-input" data-execution-key="${esc(key)}"><option ${executionStatus === "계획" ? "selected" : ""}>계획</option><option ${executionStatus === "협상 준비" ? "selected" : ""}>협상 준비</option><option ${executionStatus === "협상 진행" ? "selected" : ""}>협상 진행</option><option ${executionStatus === "완료" ? "selected" : ""}>완료</option><option ${executionStatus === "보류" ? "selected" : ""}>보류</option></select></td><td><input class="execution-target-input" data-execution-key="${esc(key)}" type="number" min="0" step="1000" value="${Number(saved.targetSaving || 0) || ""}" placeholder="목표 절감액" /></td><td><input class="execution-actual-input" data-execution-key="${esc(key)}" type="number" min="0" step="1000" value="${Number(saved.actualSaving || 0) || ""}" placeholder="완료 후 입력" /></td><td><span class="status ${achievement === null ? "status-blue" : achievement >= 100 ? "status-mint" : "status-gold"}">${achievement === null ? "목표 미입력" : `${achievement.toFixed(1)}%`}</span></td><td><button class="btn btn-secondary execution-target-save" data-execution-key="${esc(key)}">저장</button></td>`);
  });
  table.querySelectorAll(".execution-target-save").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    const key = button.dataset.executionKey;
    const input = table.querySelector(`.execution-target-input[data-execution-key="${CSS.escape(key)}"]`);
    const owner = table.querySelector(`.execution-owner-input[data-execution-key="${CSS.escape(key)}"]`);
    const dueDate = table.querySelector(`.execution-due-input[data-execution-key="${CSS.escape(key)}"]`);
    const executionStatus = table.querySelector(`.execution-status-input[data-execution-key="${CSS.escape(key)}"]`);
    const actualSaving = table.querySelector(`.execution-actual-input[data-execution-key="${CSS.escape(key)}"]`);
    const current = state.businessRecommendationStatus[key] || { status: "채택" };
    const nextExecutionStatus = executionStatus?.value || "계획";
    state.businessRecommendationStatus[key] = { ...current, targetSaving: Number(input?.value || 0), actualSaving: Number(actualSaving?.value || 0), executionOwner: owner?.value || "", dueDate: dueDate?.value || "", executionStatus: nextExecutionStatus, completedAt: nextExecutionStatus === "완료" ? (current.completedAt || new Date().toLocaleDateString("ko-KR")) : "", updatedBy: roles[state.role].name, updatedAt: new Date().toLocaleString("ko-KR") };
    const ownerValue = owner?.value || "";
    const row = button.closest("tr");
    if (row) { row.dataset.executionOwner = ownerValue; row.dataset.executionStatus = nextExecutionStatus; }
    saveState();
    renderBusinessModelBody();
    toast("실행 과제 정보를 저장했습니다.");
  }));
  const refreshFilter = () => { const owner = panel.querySelector("#executionOwnerFilter")?.value || ""; const status = panel.querySelector("#executionStatusFilter")?.value || ""; const rows = [...table.querySelectorAll("tbody tr")]; rows.forEach((row) => { row.hidden = Boolean((owner && row.dataset.executionOwner !== owner) || (status && row.dataset.executionStatus !== status)); }); const visible = rows.filter((row) => !row.hidden).length; const result = panel.querySelector("#executionFilterCount"); if (result) result.textContent = `${visible}건 표시`; };
  panel.querySelector("#executionOwnerFilter")?.addEventListener("change", refreshFilter);
  panel.querySelector("#executionStatusFilter")?.addEventListener("change", refreshFilter);
  refreshFilter();
}

function addReadOnlyExecutionFilters(panel, table, adopted, buyers) {
  if (panel.querySelector("#executionPlanFilter")) return;
  [...table.querySelectorAll("tbody tr")].forEach((row, index) => { const item = adopted[index]; const saved = state.businessRecommendationStatus?.[`${item?.name}::${item?.model}`] || {}; row.dataset.executionOwner = saved.executionOwner || item?.items?.map((entry) => entry.buyer).find(Boolean) || "미지정"; row.dataset.executionStatus = saved.executionStatus || "계획"; });
  const filter = document.createElement("div");
  filter.className = "analysis-filters list-filter-bar";
  filter.id = "executionPlanFilter";
  filter.innerHTML = `<select id="executionOwnerFilter"><option value="">전체 Buyer</option>${[...new Set([...buyers, "미지정"])].map((buyer) => `<option value="${esc(buyer)}">${esc(buyer)}</option>`).join("")}</select><select id="executionStatusFilter"><option value="">전체 실행 상태</option><option>계획</option><option>협상 준비</option><option>협상 진행</option><option>완료</option><option>보류</option></select><span class="filter-result" id="executionFilterCount"></span>`;
  panel.querySelector(".panel-head")?.after(filter);
  const refresh = () => { const owner = filter.querySelector("#executionOwnerFilter").value; const status = filter.querySelector("#executionStatusFilter").value; const rows = [...table.querySelectorAll("tbody tr")]; rows.forEach((row) => { row.hidden = Boolean((owner && row.dataset.executionOwner !== owner) || (status && row.dataset.executionStatus !== status)); }); filter.querySelector("#executionFilterCount").textContent = `${rows.filter((row) => !row.hidden).length}건 표시`; };
  filter.querySelector("#executionOwnerFilter").addEventListener("change", refresh);
  filter.querySelector("#executionStatusFilter").addEventListener("change", refresh);
  refresh();
}

function importsView() { const canUpload = ["lead", "buyer", "admin"].includes(state.role); const last = state.importBatches[state.importBatches.length - 1]; return `<div class="page-head"><div><h1>CD집계표 업로드</h1><p>원본 파일을 업로드하면 PO번호 기준으로 갱신·누적하고 빈 PO번호를 알려드립니다.</p></div></div><div class="import-layout"><div class="panel"><div class="panel-head"><h2>원본 파일 업로드</h2><span>권한: 팀장·Buyer·관리자</span></div>${canUpload ? `<form id="cdImportForm" class="upload-box"><label class="upload-drop"><input id="cdFileInput" type="file" accept=".xlsx,.xlsm" required/><strong>CD집계표 파일 선택</strong><span>xlsx·xlsm / 최대 10MB</span></label><button class="btn btn-primary" type="submit">검증 및 미리보기</button></form>` : `<div class="empty">파일 업로드 권한이 없습니다. 팀장·Buyer·관리자만 업로드할 수 있습니다.</div>`}</div><div class="panel"><div class="panel-head"><h2>업로드 결과</h2><span>${last ? esc(last.fileName) : "아직 업로드 없음"}</span></div>${last ? `<div class="import-stats"><div><strong>${last.totalRows}</strong><span>전체 행</span></div><div><strong>${last.newRows}</strong><span>신규</span></div><div><strong>${last.updatedRows}</strong><span>갱신</span></div><div><strong>${last.warningRows}</strong><span>경고</span></div></div><div class="notice">${last.warningRows ? `PO번호가 비어 있는 ${last.warningRows}건이 있습니다. 업로드 후 화면에서 직접 입력할 수 있습니다.` : "PO번호 누락 경고가 없습니다."}</div>` : `<div class="empty">파일을 업로드하면 검증 결과가 표시됩니다.</div>`}</div></div><div class="panel"><div class="panel-head"><h2>최근 업로드 이력</h2><span>${state.importBatches.length}건</span></div>${state.importBatches.length ? `<table class="table"><thead><tr><th>파일명</th><th>업로드일시</th><th>전체</th><th>신규</th><th>갱신</th><th>경고</th><th>상태</th></tr></thead><tbody>${state.importBatches.slice().reverse().map((batch) => `<tr><td>${esc(batch.fileName)}</td><td>${batch.uploadedAt}</td><td>${batch.totalRows}</td><td>${batch.newRows}</td><td>${batch.updatedRows}</td><td>${batch.warningRows}</td><td><span class="status status-mint">${batch.status}</span></td></tr>`).join("")}</tbody></table>` : `<div class="empty">업로드 이력이 없습니다.</div>`}</div>`; }

function enhanceForecastReadiness() {
  const host = document.querySelector(".content");
  if (!host || document.querySelector("#forecastReadiness")) return;
  const rows = (state.cdTransactions || []).filter((row) => Object.values(row || {}).some((value) => value !== null && value !== undefined && String(value).trim() !== ""));
  const exists = (value) => value !== null && value !== undefined && String(value).trim() !== "" && String(value).trim() !== "-";
  const count = (predicate) => rows.filter(predicate).length;
  const dateRows = count((row) => exists(row.taxInvoiceDate));
  const amountRows = count((row) => Number(row.purchaseAmount) > 0);
  const categoryRows = count((row) => exists(row.categoryLarge));
  const modelRows = count((row) => exists(row.modelName));
  const supplierRows = count((row) => exists(row.supplierName));
  const forecastRows = count((row) => exists(row.taxInvoiceDate) && Number(row.purchaseAmount) > 0 && exists(row.categoryLarge));
  const base = Math.max(rows.length, 1);
  const score = Math.round(((dateRows / base) * .35 + (amountRows / base) * .30 + (categoryRows / base) * .20 + (modelRows / base) * .10 + (supplierRows / base) * .05) * 100);
  const label = score >= 80 ? "예측 준비 완료" : score >= 55 ? "기초 예측 가능" : "데이터 보정 필요";
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "forecastReadiness";
  panel.innerHTML = `<div class="panel-head"><h2>NP InsightFlow · 예측 데이터 준비도</h2><span class="status ${score >= 80 ? "status-mint" : score >= 55 ? "status-gold" : "status-red"}">${label} ${score}점</span></div>${rows.length ? `<div class="readiness-grid"><div><strong>${forecastRows.toLocaleString("ko-KR")}</strong><span>예측 사용 가능 행</span></div><div><strong>${Math.round(dateRows / base * 100)}%</strong><span>날짜 입력률</span></div><div><strong>${Math.round(modelRows / base * 100)}%</strong><span>모델명 입력률</span></div><div><strong>${Math.round(supplierRows / base * 100)}%</strong><span>업체 입력률</span></div></div><div class="notice">구매 예측 v1은 세금계산서 날짜·구매금액·대분류가 있는 행을 사용합니다. 모델명과 업체 정보가 보완될수록 예상 단가·사업모델 추천의 정확도가 높아집니다.</div><table class="table"><thead><tr><th>검증 항목</th><th>완성 행</th><th>누락 행</th><th>예측 활용</th></tr></thead><tbody><tr><td>세금계산서 날짜</td><td>${dateRows.toLocaleString("ko-KR")}</td><td>${(rows.length - dateRows).toLocaleString("ko-KR")}</td><td>월별·분기별 수요 예측</td></tr><tr><td>구매금액</td><td>${amountRows.toLocaleString("ko-KR")}</td><td>${(rows.length - amountRows).toLocaleString("ko-KR")}</td><td>예상 구매액·절감 기회</td></tr><tr><td>대분류</td><td>${categoryRows.toLocaleString("ko-KR")}</td><td>${(rows.length - categoryRows).toLocaleString("ko-KR")}</td><td>카테고리별 예측</td></tr><tr><td>모델명</td><td>${modelRows.toLocaleString("ko-KR")}</td><td>${(rows.length - modelRows).toLocaleString("ko-KR")}</td><td>예상 단가</td></tr><tr><td>업체</td><td>${supplierRows.toLocaleString("ko-KR")}</td><td>${(rows.length - supplierRows).toLocaleString("ko-KR")}</td><td>통합 구매·업체 전략</td></tr></tbody></table>` : `<div class="empty">CD집계표를 업로드하면 예측 데이터 준비도를 계산합니다.</div>`}`;
  host.appendChild(panel);
}

function filterDashboardRequests(filter) {
  const rows = filter === "approval" ? state.requests.filter((r) => r.approval === "대기") : filter === "progress" ? state.requests.filter((r) => ["견적완료", "발주중"].includes(r.status)) : state.requests;
  const wrap = document.querySelector("#requestTableWrap");
  if (!wrap) return;
  wrap.innerHTML = requestTable(rows);
  document.querySelectorAll("[data-request-id]").forEach((el) => el.addEventListener("click", () => { state.selectedId = el.dataset.requestId; state.view = "detail"; render(); }));
  toast(filter === "approval" ? "팀장 승인 대기 요청을 표시했습니다." : filter === "progress" ? "견적·발주 진행 요청을 표시했습니다." : "전체 구매요청을 표시했습니다.");
}
function filterDashboardRequestsByStatus(status) { const rows = state.requests.filter((r) => r.status === status); const wrap = document.querySelector("#requestTableWrap"); if (!wrap) return; wrap.innerHTML = requestTable(rows); document.querySelectorAll("[data-request-id]").forEach((el) => el.addEventListener("click", () => { state.selectedId = el.dataset.requestId; state.view = "detail"; render(); })); toast(`${status} 단계 ${rows.length}건을 표시했습니다.`); }

function historyView() { const rows = state.cdTransactions || []; const buyers = [...new Set(rows.map((row) => row.buyer).filter(Boolean))]; const suppliers = [...new Set(rows.map((row) => row.supplierName).filter(Boolean))]; return `<div class="page-head"><div><h1>구매 이력</h1><p>업로드된 CD집계표의 완료 구매 건을 세금계산서날짜 기준으로 조회합니다.</p></div><span class="status status-mint">현재 FY 기준</span></div><div class="panel"><div class="history-filters"><input id="historySearch" class="search" placeholder="PO번호·모델명·업체명 검색"/><select id="historyBuyer"><option value="">전체 Buyer</option>${buyers.map((buyer) => `<option>${esc(buyer)}</option>`).join("")}</select><select id="historySupplier"><option value="">전체 업체</option>${suppliers.map((supplier) => `<option>${esc(supplier)}</option>`).join("")}</select><button class="btn btn-secondary" data-action="history-reset">초기화</button></div><div class="panel-head"><h2>구매 이력 목록</h2><span id="historyCount">${rows.length}건</span></div><div id="historyTableWrap">${historyTable(rows)}</div></div>`; }
function historyTable(rows) { if (!rows.length) return `<div class="empty">표시할 구매 이력이 없습니다. CD집계표를 먼저 업로드해 주세요.</div>`; return `<table class="table"><thead><tr><th>세금계산서날짜</th><th>PO번호</th><th>모델명</th><th>대분류</th><th>소분류</th><th>업체</th><th>Buyer</th><th>구매용도</th><th>수량</th><th>단가</th><th>구매금액</th><th>Cost Down</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${row.taxInvoiceDate || "-"}</td><td>${row.poNumber ? esc(row.poNumber) : `<span class="status status-red">누락</span>`}</td><td>${esc(row.modelName || "-")}</td><td>${esc(row.categoryLarge || "-")}</td><td>${esc(row.categorySmall || "-")}</td><td>${esc(row.supplierName || "-")}</td><td>${esc(row.buyer || "-")}</td><td>${esc(row.purchasePurpose || "-")}</td><td class="num">${row.quantity ?? "-"}</td><td class="num">${row.unitPrice == null ? "-" : money(row.unitPrice)}</td><td class="num">${row.purchaseAmount == null ? "-" : money(row.purchaseAmount)}</td><td class="num">${row.costDownAmount == null ? "-" : money(row.costDownAmount)}</td></tr>`).join("")}</tbody></table>`; }
function bindHistoryEvents() { const refresh = () => { const term = (document.querySelector("#historySearch")?.value || "").toLowerCase(); const buyer = document.querySelector("#historyBuyer")?.value || ""; const supplier = document.querySelector("#historySupplier")?.value || ""; const rows = (state.cdTransactions || []).filter((row) => `${row.poNumber || ""} ${row.modelName || ""} ${row.supplierName || ""}`.toLowerCase().includes(term) && (!buyer || row.buyer === buyer) && (!supplier || row.supplierName === supplier)); document.querySelector("#historyTableWrap").innerHTML = historyTable(rows); document.querySelector("#historyCount").textContent = `${rows.length}건`; }; document.querySelector("#historySearch")?.addEventListener("input", refresh); document.querySelector("#historyBuyer")?.addEventListener("change", refresh); document.querySelector("#historySupplier")?.addEventListener("change", refresh); document.querySelector("[data-action='history-reset']")?.addEventListener("click", () => { document.querySelector("#historySearch").value = ""; document.querySelector("#historyBuyer").value = ""; document.querySelector("#historySupplier").value = ""; refresh(); }); }
function bindAnalysisEvents() { const refresh = (announce = false) => { renderAnalysisBody(); const count = document.querySelector("#analysisResultCount")?.textContent || "0건"; if (announce) toast(`구매 분석 조회 완료: ${count}`); }; document.querySelector("#analysisApply")?.addEventListener("click", () => refresh(true)); document.querySelector("#analysisSearch")?.addEventListener("keydown", (event) => { if (event.key === "Enter") refresh(true); }); document.querySelector("#analysisReset")?.addEventListener("click", () => { ["#analysisFy", "#analysisBuyer", "#analysisCategory"].forEach((selector) => { const el = document.querySelector(selector); if (el) el.value = ""; }); const search = document.querySelector("#analysisSearch"); if (search) search.value = ""; refresh(true); }); refresh(); }

function filterDueContracts() {
  const table = document.querySelectorAll(".panel .table")[0]?.closest(".panel")?.querySelector("tbody");
  if (!table) return;
  table.querySelectorAll("tr").forEach((row) => { row.style.display = row.textContent.includes("30일 이내") ? "" : "none"; });
  toast("30일 이내 만기 계약을 표시했습니다.");
}

function renderCategoryPurchaseSummary() {
  if (state.view !== "dashboard") return;
  const content = document.querySelector(".content");
  if (!content) return;
  const grouped = new Map();
  (state.cdTransactions || []).forEach((row) => {
    const category = row.categoryLarge || "미분류";
    grouped.set(category, (grouped.get(category) || 0) + Number(row.purchaseAmount || 0));
  });
  const categoryPurchaseSummary = [...grouped.entries()].filter(([, amount]) => Number.isFinite(amount) && amount > 0).sort((a, b) => b[1] - a[1]);
  const categoryPurchaseTotal = categoryPurchaseSummary.reduce((sum, [, amount]) => sum + amount, 0);
  const panel = document.createElement("div");
  panel.className = "panel category-summary";
  if (!categoryPurchaseSummary.length) {
    panel.innerHTML = `<div class="panel-head"><div><h2>카테고리별 전체 구매액 현황</h2><span>CD집계표 업로드 기준</span></div><strong>데이터 없음</strong></div><div class="empty">CD 업로드 후 실제 구매금액을 기준으로 표시합니다.</div>`;
    content.appendChild(panel);
    return;
  }
  const max = categoryPurchaseSummary[0][1];
  panel.innerHTML = `<div class="panel-head"><div><h2>카테고리별 전체 구매액 현황</h2><span>CD집계표 · 구매금액 기준 · 실제 업로드 ${state.cdTransactions.length.toLocaleString("ko-KR")}건</span></div><strong>${money(categoryPurchaseTotal)}</strong></div><div class="category-summary-list">${categoryPurchaseSummary.map(([category, amount]) => { const share = amount / categoryPurchaseTotal * 100; return `<div class="category-summary-row" title="${esc(category)} · ${money(amount)} · ${share.toFixed(1)}%"><div class="category-summary-name">${esc(category)}</div><div class="category-summary-track"><div class="category-summary-bar" style="width:${Math.max(1.5, amount / max * 100)}%"></div></div><div class="category-summary-amount">${money(amount)}</div><div class="category-summary-share">${share.toFixed(1)}%</div></div>`; }).join("")}</div>`;
  content.appendChild(panel);
}

function renderBuyerPurchaseSummary() {
  if (state.view !== "dashboard") return;
  const content = document.querySelector(".content");
  if (!content) return;
  const buyers = [...new Set([...Object.values(buyerMap), ...state.requests.map((request) => request.buyer).filter(Boolean)])];
  const counts = buyers.map((buyer) => [buyer, state.requests.filter((request) => request.buyer === buyer).length]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
  const max = Math.max(1, counts[0]?.[1] || 0);
  const panel = document.createElement("div");
  panel.className = "panel buyer-summary";
  panel.innerHTML = `<div class="panel-head"><div><h2>담당자별 구매 건수</h2><span>현재 시스템 구매요청 기준 · 전체 ${state.requests.length}건</span></div><span>담당 Buyer</span></div><div class="buyer-summary-list">${counts.map(([buyer, count]) => `<div class="buyer-summary-row" title="${esc(buyer)} · ${count}건"><div class="buyer-summary-name">${esc(buyer)}</div><div class="buyer-summary-track"><div class="buyer-summary-bar" style="width:${count === 0 ? 0 : Math.max(8, count / max * 100)}%"></div></div><div class="buyer-summary-count">${count}건</div></div>`).join("")}</div>`;
  content.appendChild(panel);
}

function enhancePurchaseOrderTracking() {
  if (state.view !== "detail") return;
  const request = activeRequest();
  if (!request || document.querySelector("#purchaseOrderTracking")) return;
  const canManage = ["buyer", "admin"].includes(state.role);
  const matched = (state.cdTransactions || []).filter((row) => String(row.poNumber || "").trim() && String(row.poNumber || "").trim() === String(request.poNumber || "").trim());
  const actualAmount = matched.reduce((sum, row) => sum + Number(row.purchaseAmount || 0), 0);
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "purchaseOrderTracking";
  panel.innerHTML = `<div class="panel-head"><h2>발주 PO · 실제 구매 연계</h2><span>CD집계표 PO번호 기준</span></div><div class="info-grid"><div><span class="info-label">발주 PO 번호</span><span class="info-value">${esc(request.poNumber || "미등록")}</span></div><div><span class="info-label">CD 구매이력 매칭</span><span class="info-value">${matched.length ? `${matched.length}건 · ${money(actualAmount)}` : "아직 매칭 없음"}</span></div></div>${canManage ? `<div class="action-row"><input id="purchaseOrderInput" class="search" value="${esc(request.poNumber || "")}" placeholder="발주 PO 번호 입력"/><button class="btn btn-primary" id="purchaseOrderSave">PO 번호 저장</button></div>` : ""}<div class="notice">발주 PO 번호를 등록하면 CD집계표 업로드 후 동일 PO 번호의 세금계산서 구매금액을 실제 구매 결과로 비교할 수 있습니다.</div>`;
  const target = document.querySelector(".detail-layout > .detail-card");
  target?.appendChild(panel);
  panel.querySelector("#purchaseOrderSave")?.addEventListener("click", () => { const poNumber = String(panel.querySelector("#purchaseOrderInput")?.value || "").trim(); request.poNumber = poNumber; request.history.push({ status: request.status, actor: roles[state.role].name, at: now(), note: poNumber ? `발주 PO 번호 등록: ${poNumber}` : "발주 PO 번호 삭제" }); saveState(); render(); toast(poNumber ? "발주 PO 번호를 저장했습니다." : "발주 PO 번호를 삭제했습니다."); });
}

function enhanceCdImportQuality() {
  if (state.view !== "imports") return;
  const last = (state.importBatches || []).at(-1);
  const content = document.querySelector(".content");
  if (!last || !content || document.querySelector("#cdImportQuality")) return;
  const excluded = Number(last.skippedTemplateRows || 0);
  const missingPoRows = (state.cdTransactions || []).map((row, index) => ({ row, index })).filter(({ row }) => !String(row.poNumber || "").trim());
  const canEditPo = ["buyer", "admin"].includes(state.role);
  const allRows = state.cdTransactions || [];
  const buyers = [...new Set([...Object.values(buyerMap), ...allRows.map((row) => row.buyer).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "ko"));
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.id = "cdImportQuality";
  panel.innerHTML = `<div class="panel-head"><div><h2>업로드 정제 결과</h2><span>원본의 서식·수식 템플릿 행은 분석 대상에서 자동 제외합니다.</span></div><span>${esc(last.fileName)}</span></div><div class="import-stats"><div><strong>${last.totalRows}</strong><span>실제 구매 행</span></div><div><strong>${excluded}</strong><span>제외된 템플릿 행</span></div><div><strong>${last.warningRows}</strong><span>PO번호 확인 필요</span></div></div><div class="notice">실제 구매 이력만 대시보드·비용·Cost Down·예측 분석에 반영됩니다. PO번호가 없는 행은 업로드되며, 화면에서 보완할 수 있습니다.</div>`;
  content.appendChild(panel);

  const management = document.createElement("div");
  management.className = "panel";
  management.id = "cdPoManagement";
  management.innerHTML = `<div class="panel-head"><div><h2>PO번호 보완 관리</h2><span>PO번호 누락 ${missingPoRows.length.toLocaleString("ko-KR")}건 · ${canEditPo ? "Buyer·관리자 입력 가능" : "조회 전용"}</span></div><div class="toolbar"><input id="poMissingSearch" class="search" placeholder="업체·모델·Buyer 검색"/><button class="btn btn-secondary" id="poMissingApply">조회</button></div></div><div id="poMissingBody"></div>`;
  content.appendChild(management);

  const missing = (field) => allRows.filter((row) => !String(row[field] || "").trim()).length;
  const correctionHistory = state.poNumberCorrections || [];
  const dataQualityCorrections = state.dataQualityCorrections || [];
  const quality = document.createElement("div");
  quality.className = "panel";
  quality.id = "cdDataQuality";
  quality.innerHTML = `<div class="panel-head"><div><h2>데이터 품질 현황</h2><span>실제 구매 ${allRows.length.toLocaleString("ko-KR")}건 기준</span></div><div class="toolbar">${correctionHistory.length ? `<button class="btn btn-secondary" id="poCorrectionCsv">PO 보완 이력 CSV</button>` : ""}${dataQualityCorrections.length ? `<button class="btn btn-secondary" id="qualityCorrectionCsv">핵심 항목 이력 CSV</button>` : ""}</div></div><div class="import-stats"><div><strong>${missing("poNumber")}</strong><span>PO번호 누락</span></div><div><strong>${missing("modelName")}</strong><span>모델명 누락</span></div><div><strong>${missing("categoryLarge")}</strong><span>대분류 누락</span></div><div><strong>${missing("categorySmall")}</strong><span>소분류 누락</span></div><div><strong>${missing("buyer")}</strong><span>Buyer 누락</span></div></div><div class="notice">PO번호는 발주·예측 정확도 연계의 필수 보완 항목입니다. 모델명·분류·Buyer 누락은 예상 단가, 업체 추천, 담당자 분석의 정확도에 영향을 줍니다.</div>${correctionHistory.length ? `<details><summary>최근 PO 보완 이력 ${correctionHistory.length}건</summary><div class="table-scroll"><table class="table"><thead><tr><th>수정일시</th><th>수정자</th><th>원본 행</th><th>업체</th><th>모델/품목</th><th>변경 전</th><th>변경 후</th></tr></thead><tbody>${correctionHistory.slice().reverse().slice(0, 20).map((item) => `<tr><td>${esc(item.at)}</td><td>${esc(item.actor)}</td><td>${esc(item.sourceRow)}</td><td>${esc(item.supplierName || "-")}</td><td>${esc(item.modelName || "-")}</td><td>${esc(item.before || "-")}</td><td><strong>${esc(item.after)}</strong></td></tr>`).join("")}</tbody></table></div></details>` : ""}${dataQualityCorrections.length ? `<details><summary>최근 핵심 분석 항목 보완 이력 ${dataQualityCorrections.length}건</summary><div class="table-scroll"><table class="table"><thead><tr><th>수정일시</th><th>수정자</th><th>원본 행</th><th>업체</th><th>변경 내용</th></tr></thead><tbody>${dataQualityCorrections.slice().reverse().slice(0, 20).map((item) => `<tr><td>${esc(item.at)}</td><td>${esc(item.actor)}</td><td>${esc(item.sourceRow)}</td><td>${esc(item.supplierName || "-")}</td><td class="wrap-cell">${item.changes.map((change) => `${esc({ modelName: "모델/품목", categoryLarge: "대분류", categorySmall: "소분류", buyer: "Buyer" }[change.field] || change.field)}: ${esc(change.before || "-")} → <strong>${esc(change.after || "-")}</strong>`).join("<br/>")}</td></tr>`).join("")}</tbody></table></div></details>` : ""}`;
  content.appendChild(quality);
  quality.querySelector("#poCorrectionCsv")?.addEventListener("click", () => {
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const header = ["수정일시", "수정자", "원본 행", "업체", "모델/품목", "변경 전 PO번호", "변경 후 PO번호"];
    const lines = correctionHistory.map((item) => [item.at, item.actor, item.sourceRow, item.supplierName, item.modelName, item.before, item.after].map(quote).join(","));
    const blob = new Blob([`\uFEFF${header.map(quote).join(",")}\n${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NP_CD_PO보완이력_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast("PO 보완 이력을 CSV로 다운로드했습니다.");
  });
  quality.querySelector("#qualityCorrectionCsv")?.addEventListener("click", () => {
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const header = ["수정일시", "수정자", "원본 행", "업체", "항목", "변경 전", "변경 후"];
    const label = { modelName: "모델/품목", categoryLarge: "대분류", categorySmall: "소분류", buyer: "Buyer" };
    const lines = dataQualityCorrections.flatMap((item) => item.changes.map((change) => [item.at, item.actor, item.sourceRow, item.supplierName, label[change.field] || change.field, change.before, change.after].map(quote).join(",")));
    const blob = new Blob([`\uFEFF${header.map(quote).join(",")}\n${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NP_CD_핵심항목보완이력_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast("핵심 분석 항목 보완 이력을 CSV로 다운로드했습니다.");
  });
  const qualityFields = ["poNumber", "modelName", "categoryLarge", "categorySmall", "buyer"];
  const canSaveQualitySnapshot = ["lead", "buyer", "admin"].includes(state.role);
  const qualityProfile = () => {
    const missingByField = Object.fromEntries(qualityFields.map((field) => [field, missing(field)]));
    const totalCells = allRows.length * qualityFields.length;
    const missingCells = Object.values(missingByField).reduce((sum, value) => sum + value, 0);
    return { rows: allRows.length, missingByField, readiness: totalCells ? (totalCells - missingCells) / totalCells * 100 : 0 };
  };
  const snapshotToolbar = quality.querySelector(".toolbar");
  if (snapshotToolbar && allRows.length && canSaveQualitySnapshot) snapshotToolbar.insertAdjacentHTML("beforeend", `<button class="btn btn-secondary" id="qualitySnapshotSave">준비도 스냅샷 저장</button>`);
  quality.querySelector("#qualitySnapshotSave")?.addEventListener("click", () => {
    const profile = qualityProfile();
    state.dataQualitySnapshots = state.dataQualitySnapshots || [];
    state.dataQualitySnapshots.push({ savedAt: new Date().toLocaleString("ko-KR"), savedBy: roles[state.role].name, ...profile });
    saveState();
    render();
    toast(`데이터 분석 준비도 ${profile.readiness.toFixed(1)}% 스냅샷을 저장했습니다.`);
  });

  const readinessByCategory = new Map();
  allRows.forEach((row) => {
    const category = canonicalBuyerCategory(row.categoryLarge) || "대분류 미입력";
    const item = readinessByCategory.get(category) || { category, count: 0, complete: 0, missing: 0, amount: 0 };
    const requiredFields = ["poNumber", "modelName", "categoryLarge", "categorySmall", "buyer"];
    const filled = requiredFields.filter((field) => String(row[field] || "").trim()).length;
    item.count += 1;
    item.complete += filled === requiredFields.length ? 1 : 0;
    item.missing += requiredFields.length - filled;
    item.amount += Number(row.purchaseAmount || 0);
    readinessByCategory.set(category, item);
  });
  const readinessRows = [...readinessByCategory.values()].map((item) => ({ ...item, rate: item.count ? (item.count * 5 - item.missing) / (item.count * 5) * 100 : 0 })).sort((a, b) => b.missing - a.missing || b.amount - a.amount);
  const readinessPanel = document.createElement("div");
  readinessPanel.className = "panel";
  readinessPanel.id = "cdReadiness";
  readinessPanel.innerHTML = `<div class="panel-head"><div><h2>카테고리별 분석 준비도</h2><span>PO번호·모델·대분류·소분류·Buyer 5개 핵심 항목 기준</span></div></div>${readinessRows.length ? `<div class="table-scroll"><table class="table"><thead><tr><th>대분류</th><th>구매 행</th><th>완전 입력</th><th>누락 항목 수</th><th>분석 준비도</th><th>구매금액</th><th></th></tr></thead><tbody>${readinessRows.slice(0, 30).map((item) => `<tr><td><strong>${esc(item.category)}</strong></td><td>${item.count.toLocaleString("ko-KR")}</td><td>${item.complete.toLocaleString("ko-KR")}</td><td>${item.missing.toLocaleString("ko-KR")}</td><td><span class="status ${item.rate >= 90 ? "status-mint" : item.rate >= 70 ? "status-gold" : "status-red"}">${item.rate.toFixed(1)}%</span></td><td class="num">${money(item.amount)}</td><td><button class="btn btn-secondary readiness-focus" data-readiness-category="${esc(item.category)}">보완 대상 보기</button></td></tr>`).join("")}</tbody></table></div><div class="notice">준비도가 낮거나 구매금액이 큰 카테고리부터 보완하면 예상 단가·업체 추천·Cost Down 분석의 신뢰도가 빠르게 개선됩니다.</div>` : `<div class="empty">분석 준비도를 계산할 데이터가 없습니다.</div>`}`;
  content.appendChild(readinessPanel);
  readinessPanel.querySelectorAll(".readiness-focus").forEach((button) => button.addEventListener("click", () => {
    const search = document.querySelector("#coreMissingSearch");
    if (search) search.value = button.dataset.readinessCategory || "";
    document.querySelector("#coreMissingApply")?.click();
    document.querySelector("#cdCoreCompletion")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  const qualitySnapshots = state.dataQualitySnapshots || [];
  if (qualitySnapshots.length) {
    const snapshotsPanel = document.createElement("div");
    snapshotsPanel.className = "panel";
    snapshotsPanel.id = "cdReadinessHistory";
    snapshotsPanel.innerHTML = `<div class="panel-head"><div><h2>데이터 분석 준비도 추이</h2><span>저장 스냅샷 ${qualitySnapshots.length}건</span></div></div><div class="table-scroll"><table class="table"><thead><tr><th>저장일시</th><th>저장자</th><th>구매 행</th><th>분석 준비도</th><th>PO 누락</th><th>모델 누락</th><th>분류 누락</th><th>Buyer 누락</th></tr></thead><tbody>${qualitySnapshots.slice().reverse().slice(0, 20).map((item) => `<tr><td>${esc(item.savedAt)}</td><td>${esc(item.savedBy)}</td><td>${item.rows.toLocaleString("ko-KR")}</td><td><span class="status ${item.readiness >= 90 ? "status-mint" : item.readiness >= 70 ? "status-gold" : "status-red"}">${Number(item.readiness).toFixed(1)}%</span></td><td>${item.missingByField?.poNumber || 0}</td><td>${item.missingByField?.modelName || 0}</td><td>${(item.missingByField?.categoryLarge || 0) + (item.missingByField?.categorySmall || 0)}</td><td>${item.missingByField?.buyer || 0}</td></tr>`).join("")}</tbody></table></div><div class="notice">정기 업로드 후 스냅샷을 저장하면, 데이터 보완 작업에 따른 분석 준비도 개선을 확인할 수 있습니다.</div>`;
    content.appendChild(snapshotsPanel);
  }

  const buyerCandidates = allRows.map((row, index) => {
    const category = canonicalBuyerCategory(row.categoryLarge);
    return { row, index, category, buyer: resolveBuyerForCategory(row.categoryLarge) };
  }).filter((item) => !String(item.row.buyer || "").trim() && item.buyer);
  const autoBuyer = document.createElement("div");
  autoBuyer.className = "panel";
  autoBuyer.id = "cdAutoBuyer";
  const candidateGroups = [...buyerCandidates.reduce((map, item) => { const key = `${item.category}::${item.buyer}`; map.set(key, (map.get(key) || 0) + 1); return map; }, new Map()).entries()];
  const candidateRowsHtml = candidateGroups.map(([key, count]) => { const [category, buyer] = key.split("::"); return `<tr><td>${esc(category)}</td><td><strong>${esc(buyer)}</strong></td><td>${count.toLocaleString("ko-KR")}건</td></tr>`; }).join("");
  const candidateBodyHtml = candidateGroups.length ? `<div class="table-scroll"><table class="table"><thead><tr><th>대분류</th><th>추천 Buyer</th><th>대상 건수</th></tr></thead><tbody>${candidateRowsHtml}</tbody></table></div><div class="notice">${canEditPo ? "일괄 반영 전 대분류와 담당 Buyer가 맞는지 확인해 주세요. 팀장과 요청자는 조회만 가능합니다." : "Buyer·관리자만 일괄 반영할 수 있습니다."}</div>` : `<div class="empty">현재 담당 카테고리 매핑으로 자동 배정할 Buyer 미입력 행이 없습니다.</div>`;
  autoBuyer.innerHTML = `<div class="panel-head"><div><h2>담당 Buyer 자동 배정 후보</h2><span>대분류와 담당 카테고리 매핑이 일치하는 Buyer 미입력 행만 제안합니다.</span></div><div class="toolbar">${candidateGroups.length && canEditPo ? `<button class="btn btn-primary" id="autoBuyerApply">${buyerCandidates.length}건 일괄 반영</button>` : ""}</div></div>${candidateBodyHtml}`;
  content.appendChild(autoBuyer);
  autoBuyer.querySelector("#autoBuyerApply")?.addEventListener("click", () => {
    if (!buyerCandidates.length) return;
    state.dataQualityCorrections = state.dataQualityCorrections || [];
    buyerCandidates.forEach((item) => {
      item.row.buyer = item.buyer;
      state.dataQualityCorrections.push({ at: new Date().toLocaleString("ko-KR"), actor: roles[state.role].name, sourceRow: item.row.sourceRow || "-", supplierName: item.row.supplierName || "", changes: [{ field: "buyer", before: "", after: item.buyer }], source: "카테고리 자동 배정" });
    });
    saveState();
    render();
    toast(`담당 Buyer ${buyerCandidates.length}건을 카테고리 매핑 기준으로 배정했습니다.`);
  });

  const standardCategories = Object.keys(buyerMap);
  const rawCategories = [...new Set(allRows.map((row) => String(row.categoryLarge || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
  const aliasTargets = rawCategories.filter((raw) => !buyerMap[raw] || state.categoryAliases[String(raw).normalize("NFKC").toLocaleLowerCase("ko-KR").trim()]);
  const aliasPanel = document.createElement("div");
  const canManageAlias = ["lead", "admin"].includes(state.role);
  aliasPanel.className = "panel";
  aliasPanel.id = "categoryAliasManagement";
  aliasPanel.innerHTML = `<div class="panel-head"><div><h2>카테고리 별칭 관리</h2><span>원본 표기(영문·약칭)를 회사 표준 대분류로 연결합니다.</span></div><span>${canManageAlias ? "팀장·관리자 수정 가능" : "조회 전용"}</span></div>${aliasTargets.length ? `<div class="table-scroll"><table class="table"><thead><tr><th>원본 대분류</th><th>현재 표준 대분류</th><th>표준 대분류 확정</th></tr></thead><tbody>${aliasTargets.map((raw) => { const key = raw.normalize("NFKC").toLocaleLowerCase("ko-KR").trim(); const current = canonicalBuyerCategory(raw); return `<tr><td><strong>${esc(raw)}</strong></td><td>${esc(current)}</td><td>${canManageAlias ? `<select class="category-alias-select" data-category-alias="${esc(key)}"><option value="">별칭 해제</option>${standardCategories.map((category) => `<option value="${esc(category)}" ${state.categoryAliases?.[key] === category ? "selected" : ""}>${esc(category)}</option>`).join("")}</select>` : esc(state.categoryAliases?.[key] || "원본 표기 사용")}</td></tr>`; }).join("")}</tbody></table></div><div class="action-row">${canManageAlias ? `<button class="btn btn-primary" id="categoryAliasSave">별칭 저장</button>` : ""}</div><div class="notice">별칭을 확정하면 담당 Buyer 자동 배정과 카테고리 기반 분석의 담당자 매핑에 적용됩니다. 원본 구매 데이터 표기는 변경하지 않습니다.</div>` : `<div class="empty">별칭 관리가 필요한 원본 대분류가 없습니다.</div>`}`;
  content.appendChild(aliasPanel);
  aliasPanel.querySelector("#categoryAliasSave")?.addEventListener("click", () => {
    const nextAliases = structuredClone(state.categoryAliases || {});
    aliasPanel.querySelectorAll(".category-alias-select").forEach((select) => { if (select.value) nextAliases[select.dataset.categoryAlias] = select.value; else delete nextAliases[select.dataset.categoryAlias]; });
    state.categoryAliases = nextAliases;
    state.categoryAliasHistory = state.categoryAliasHistory || [];
    state.categoryAliasHistory.push({ at: new Date().toLocaleString("ko-KR"), actor: roles[state.role].name, aliases: structuredClone(nextAliases) });
    saveState();
    render();
    toast("카테고리 별칭을 저장했습니다. 담당 Buyer 자동 배정에 반영됩니다.");
  });

  const mappedCategories = [...new Set([...Object.keys(buyerMap), ...Object.keys(state.buyerCategoryMappings || {}), ...allRows.map((row) => canonicalBuyerCategory(row.categoryLarge)).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "ko"));
  const mappingPanel = document.createElement("div");
  const canManageMapping = ["lead", "admin"].includes(state.role);
  mappingPanel.className = "panel";
  mappingPanel.id = "buyerCategoryMapping";
  mappingPanel.innerHTML = `<div class="panel-head"><div><h2>담당 카테고리 매핑 관리</h2><span>중복·변경 매핑의 최종 결정권자: 팀장</span></div><span>${canManageMapping ? "팀장·관리자 수정 가능" : "조회 전용"}</span></div>${mappedCategories.length ? `<div class="table-scroll"><table class="table"><thead><tr><th>대분류</th><th>기본 Buyer</th><th>현재 적용 Buyer</th><th>관리자 확정</th></tr></thead><tbody>${mappedCategories.map((category) => { const defaultBuyer = buyerMap[category] || "미매핑"; const currentBuyer = resolveBuyerForCategory(category) || "미매핑"; return `<tr><td><strong>${esc(category)}</strong></td><td>${esc(defaultBuyer)}</td><td>${esc(currentBuyer)}</td><td>${canManageMapping ? `<select class="category-mapping-select" data-category="${esc(category)}"><option value="">기본 매핑 사용</option>${buyers.map((buyer) => `<option value="${esc(buyer)}" ${state.buyerCategoryMappings?.[category] === buyer ? "selected" : ""}>${esc(buyer)}</option>`).join("")}</select>` : esc(state.buyerCategoryMappings?.[category] || "기본 매핑")}</td></tr>`; }).join("")}</tbody></table></div><div class="action-row">${canManageMapping ? `<button class="btn btn-primary" id="buyerMappingSave">매핑 저장</button>` : ""}</div>` : `<div class="empty">매핑할 카테고리가 없습니다.</div>`}`;
  content.appendChild(mappingPanel);
  const mappingHistory = state.buyerMappingHistory || [];
  if (mappingHistory.length) {
    const historyPanel = document.createElement("div");
    historyPanel.className = "panel";
    historyPanel.id = "buyerCategoryMappingHistory";
    historyPanel.innerHTML = `<div class="panel-head"><div><h2>담당 카테고리 매핑 변경 이력</h2><span>최근 ${mappingHistory.length}회 저장</span></div></div><div class="table-scroll"><table class="table"><thead><tr><th>확정 일시</th><th>확정자</th><th>사용자 지정 매핑</th><th></th></tr></thead><tbody>${mappingHistory.slice().reverse().slice(0, 20).map((item, index) => { const originalIndex = mappingHistory.length - 1 - index; const summary = Object.entries(item.mappings || {}).map(([category, buyer]) => `${category} → ${buyer}`).join(" / ") || "기본 매핑만 사용"; return `<tr><td>${esc(item.at)}</td><td>${esc(item.actor)}</td><td class="wrap-cell">${esc(summary)}</td><td>${canManageMapping ? `<button class="btn btn-secondary mapping-history-restore" data-mapping-history-index="${originalIndex}">이 버전 복원</button>` : "-"}</td></tr>`; }).join("")}</tbody></table></div><div class="notice">복원하면 해당 시점의 사용자 지정 매핑으로 변경되며, 이후 자동 Buyer 배정 후보부터 적용됩니다.</div>`;
    content.appendChild(historyPanel);
    historyPanel.querySelectorAll(".mapping-history-restore").forEach((button) => button.addEventListener("click", () => {
      const snapshot = mappingHistory[Number(button.dataset.mappingHistoryIndex)];
      if (!snapshot) return;
      state.buyerCategoryMappings = structuredClone(snapshot.mappings || {});
      state.buyerMappingHistory.push({ at: new Date().toLocaleString("ko-KR"), actor: roles[state.role].name, mappings: structuredClone(state.buyerCategoryMappings), source: "이력 복원" });
      saveState();
      render();
      toast(`${snapshot.at} 확정본으로 담당 카테고리 매핑을 복원했습니다.`);
    }));
  }
  mappingPanel.querySelector("#buyerMappingSave")?.addEventListener("click", () => {
    const nextMappings = {};
    mappingPanel.querySelectorAll(".category-mapping-select").forEach((select) => { if (select.value) nextMappings[select.dataset.category] = select.value; });
    state.buyerCategoryMappings = nextMappings;
    state.buyerMappingHistory = state.buyerMappingHistory || [];
    state.buyerMappingHistory.push({ at: new Date().toLocaleString("ko-KR"), actor: roles[state.role].name, mappings: structuredClone(nextMappings) });
    saveState();
    render();
    toast("담당 카테고리 매핑을 저장했습니다. 이후 자동 Buyer 배정에 반영됩니다.");
  });

  const incompleteRows = allRows.map((row, index) => ({ row, index })).filter(({ row }) => !String(row.modelName || "").trim() || !String(row.categoryLarge || "").trim() || !String(row.categorySmall || "").trim() || !String(row.buyer || "").trim());
  const completion = document.createElement("div");
  completion.className = "panel";
  completion.id = "cdCoreCompletion";
  completion.innerHTML = `<div class="panel-head"><div><h2>핵심 분석 항목 보완</h2><span>보완 대상 ${incompleteRows.length.toLocaleString("ko-KR")}건 · ${canEditPo ? "Buyer·관리자 입력 가능" : "조회 전용"}</span></div><div class="toolbar"><input id="coreMissingSearch" class="search" placeholder="업체·모델·분류·Buyer 검색"/><button class="btn btn-secondary" id="coreMissingApply">조회</button></div></div><div id="coreMissingBody"></div>`;
  content.appendChild(completion);
  const drawCoreRows = () => {
    const term = (document.querySelector("#coreMissingSearch")?.value || "").normalize("NFKC").toLocaleLowerCase("ko-KR").trim();
    const rows = incompleteRows.filter(({ row }) => `${row.supplierName || ""} ${row.modelName || ""} ${row.categoryLarge || ""} ${row.categorySmall || ""} ${row.buyer || ""}`.normalize("NFKC").toLocaleLowerCase("ko-KR").includes(term));
    const body = document.querySelector("#coreMissingBody");
    if (!body) return;
    body.innerHTML = rows.length ? `<div class="table-scroll"><table class="table"><thead><tr><th>원본 행</th><th>업체</th><th>금액</th><th>모델/품목</th><th>대분류</th><th>소분류</th><th>Buyer</th><th></th></tr></thead><tbody>${rows.slice(0, 100).map(({ row, index }) => `<tr><td>${row.sourceRow || "-"}</td><td>${esc(row.supplierName || "-")}</td><td class="num">${money(row.purchaseAmount || 0)}</td><td>${canEditPo ? `<input class="search core-input" data-core-index="${index}" data-core-field="modelName" value="${esc(row.modelName || "")}" placeholder="모델/품목"/>` : esc(row.modelName || "확인 필요")}</td><td>${canEditPo ? `<input class="search core-input" data-core-index="${index}" data-core-field="categoryLarge" value="${esc(row.categoryLarge || "")}" placeholder="대분류"/>` : esc(row.categoryLarge || "확인 필요")}</td><td>${canEditPo ? `<input class="search core-input" data-core-index="${index}" data-core-field="categorySmall" value="${esc(row.categorySmall || "")}" placeholder="소분류"/>` : esc(row.categorySmall || "확인 필요")}</td><td>${canEditPo ? `<select class="core-input" data-core-index="${index}" data-core-field="buyer"><option value="">Buyer 선택</option>${buyers.map((buyer) => `<option value="${esc(buyer)}" ${row.buyer === buyer ? "selected" : ""}>${esc(buyer)}</option>`).join("")}</select>` : esc(row.buyer || "확인 필요")}</td><td>${canEditPo ? `<button class="btn btn-primary core-save" data-core-index="${index}">저장</button>` : "-"}</td></tr>`).join("")}</tbody></table></div><div class="notice">최대 100건을 표시합니다. 대분류를 입력하면 담당 Buyer 매핑 기준을 확인한 뒤 Buyer를 선택해 주세요.</div>` : `<div class="empty">${term ? "검색 조건에 맞는 보완 대상이 없습니다." : "핵심 분석 항목 누락 행이 없습니다."}</div>`;
    body.querySelectorAll(".core-save").forEach((button) => button.addEventListener("click", () => {
      const index = Number(button.dataset.coreIndex);
      const row = state.cdTransactions[index];
      if (!row) return;
      const changes = {};
      body.querySelectorAll(`.core-input[data-core-index='${index}']`).forEach((input) => { changes[input.dataset.coreField] = String(input.value || "").trim() || null; });
      const changed = Object.entries(changes).map(([field, value]) => ({ field, before: row[field] || "", after: value || "" })).filter((item) => String(item.before) !== String(item.after));
      if (!changed.length) { toast("변경된 값이 없습니다."); return; }
      Object.assign(row, changes);
      state.dataQualityCorrections = state.dataQualityCorrections || [];
      state.dataQualityCorrections.push({ at: new Date().toLocaleString("ko-KR"), actor: roles[state.role].name, sourceRow: row.sourceRow || "-", supplierName: row.supplierName || "", changes: changed });
      saveState();
      render();
      toast("핵심 분석 항목을 저장했습니다.");
    }));
  };
  document.querySelector("#coreMissingApply")?.addEventListener("click", drawCoreRows);
  document.querySelector("#coreMissingSearch")?.addEventListener("keydown", (event) => { if (event.key === "Enter") drawCoreRows(); });
  drawCoreRows();

  const drawPoRows = () => {
    const term = (document.querySelector("#poMissingSearch")?.value || "").normalize("NFKC").toLocaleLowerCase("ko-KR").trim();
    const rows = missingPoRows.filter(({ row }) => `${row.supplierName || ""} ${row.modelName || ""} ${row.categoryLarge || ""} ${row.buyer || ""} ${row.purchasePurpose || ""}`.normalize("NFKC").toLocaleLowerCase("ko-KR").includes(term));
    const body = document.querySelector("#poMissingBody");
    if (!body) return;
    body.innerHTML = rows.length ? `<div class="table-scroll"><table class="table"><thead><tr><th>원본 행</th><th>세금계산서일</th><th>업체</th><th>모델/품목</th><th>대분류</th><th>Buyer</th><th>금액</th><th>PO번호</th><th></th></tr></thead><tbody>${rows.slice(0, 100).map(({ row, index }) => `<tr><td>${row.sourceRow || "-"}</td><td>${esc(row.taxInvoiceDate || "-")}</td><td>${esc(row.supplierName || "-")}</td><td class="wrap-cell">${esc(row.modelName || "-")}</td><td>${esc(row.categoryLarge || "-")}</td><td>${esc(row.buyer || "-")}</td><td class="num">${money(row.purchaseAmount || 0)}</td><td>${canEditPo ? `<input class="search po-number-input" data-po-index="${index}" placeholder="PO번호 입력"/>` : "확인 필요"}</td><td>${canEditPo ? `<button class="btn btn-primary po-number-save" data-po-index="${index}">저장</button>` : "-"}</td></tr>`).join("")}</tbody></table></div><div class="notice">최대 100건을 표시합니다. 동일 PO번호가 이미 다른 구매 행에 등록되어 있으면 저장할 수 없습니다.</div>` : `<div class="empty">${term ? "검색 조건에 맞는 PO번호 누락 행이 없습니다." : "PO번호 누락 행이 없습니다."}</div>`;
    body.querySelectorAll(".po-number-save").forEach((button) => button.addEventListener("click", () => {
      const index = Number(button.dataset.poIndex);
      const input = body.querySelector(`.po-number-input[data-po-index='${index}']`);
      const poNumber = String(input?.value || "").trim();
      if (!poNumber) { toast("등록할 PO번호를 입력해 주세요."); return; }
      const duplicate = (state.cdTransactions || []).some((item, itemIndex) => itemIndex !== index && String(item.poNumber || "").trim() === poNumber);
      if (duplicate) { toast("이미 다른 구매 이력에 등록된 PO번호입니다. 원본을 확인해 주세요."); return; }
      const row = state.cdTransactions[index];
      if (!row) return;
      const before = row.poNumber || "";
      row.poNumber = poNumber;
      state.poNumberCorrections = state.poNumberCorrections || [];
      state.poNumberCorrections.push({ at: new Date().toLocaleString("ko-KR"), actor: roles[state.role].name, sourceRow: row.sourceRow || "-", before, after: poNumber, supplierName: row.supplierName || "", modelName: row.modelName || "" });
      saveState();
      render();
      toast(`PO번호 ${poNumber}를 등록했습니다.`);
    }));
  };
  document.querySelector("#poMissingApply")?.addEventListener("click", drawPoRows);
  document.querySelector("#poMissingSearch")?.addEventListener("keydown", (event) => { if (event.key === "Enter") drawPoRows(); });
  drawPoRows();
}

const originalRender = render;
render = function () {
  if (!currentUser) { renderAuth(); return; }
  state.role = normalizedRole(currentUser.role);
  state.requests.forEach((request) => request.history.forEach((history) => { if (history.actor === "김진영") history.actor = roles.lead.name; }));
  originalRender();
  if (state.view === "imports") enhanceCdImportQuality();
  if (state.view === "detail") enhancePurchaseOrderTracking();
  if (state.view === "dashboard") { document.querySelectorAll("[data-dashboard-step]").forEach((step) => step.addEventListener("click", () => { const status = statusSteps[Number(step.dataset.dashboardStep)]; state.view = "requests"; render(); filterDashboardRequestsByStatus(status); })); }
  if (state.view === "history") { document.querySelector(".content").innerHTML = historyView(); document.querySelector(".crumb").textContent = "NP MKT / 구매 이력"; bindHistoryEvents(); }
  if (state.view === "analysis") { bindAnalysisEvents(); }
  if (state.view === "costdown") { bindCostdownEvents(); }
  if (state.view === "pricing") { bindPricingEventsV2(); }
  if (state.view === "recommend") { bindRecommendEvents(); document.querySelector("#recommendCategory")?.addEventListener("change", (event) => { const search = document.querySelector("#recommendSearch"); if (search) { search.value = event.target.value; document.querySelector("#recommendApply")?.click(); } }); document.querySelector("#recommendReset")?.addEventListener("click", () => { const category = document.querySelector("#recommendCategory"); if (category) category.value = ""; }); }
  if (state.view === "mail") { bindMailEvents(); document.querySelectorAll("[data-mail-history]").forEach((item) => item.addEventListener("click", () => { const draft = (state.mailDrafts || []).slice().reverse()[Number(item.dataset.mailHistory)]; if (!draft) return; const body = document.querySelector("#mailBody"); if (body) { body.innerHTML = `<div class="panel"><div class="panel-head"><h2>메일 이력 상세</h2><div class="toolbar"><span>${draft.createdAt}</span><button class="btn btn-secondary" id="mailHistoryCopy">본문 복사</button></div></div><div class="mail-preview"><strong>업체/수신 대상: ${esc(draft.supplier)}</strong><br/><strong>출처: ${esc(draft.source || "구매 이력 기반")}</strong><br/><strong>제목: ${esc(draft.subject)}</strong><hr/><pre class="mail-history-body">${esc(draft.body)}</pre></div></div>`; body.querySelector("#mailHistoryCopy")?.addEventListener("click", () => { navigator.clipboard.writeText(draft.body).then(() => toast("메일 본문을 복사했습니다.")).catch(() => toast("본문 복사에 실패했습니다. 직접 선택해 복사해 주세요.")); }); } })); }
  if (state.view === "ai") { bindAiEvents(); }
  if (state.view === "suppliers") { bindSuppliersEvents(); }
  const topActions = document.querySelector(".top-actions");
  if (topActions && !topActions.querySelector("[data-auth-logout]")) { const logout = document.createElement("button"); logout.className = "logout-btn"; logout.dataset.authLogout = "true"; logout.textContent = "로그아웃"; logout.addEventListener("click", async () => { try { const session = JSON.parse(localStorage.getItem(SUPABASE_SESSION_KEY) || "null"); if (supabaseAuthEnabled() && session?.access_token) await supabaseAuthRequest("/auth/v1/logout", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } }); } catch {} clearSupabaseSession(); currentUser = null; authState.currentUser = null; saveAuth(); render(); }); topActions.appendChild(logout); }
  renderCategoryPurchaseSummary();
  renderBuyerPurchaseSummary();
  if (!document.querySelector("[data-view='history']")) { const nav = document.querySelector(".nav"); if (nav) { const history = document.createElement("button"); history.textContent = "⌁　구매 이력"; history.dataset.view = "history"; history.className = state.view === "history" ? "active" : ""; history.addEventListener("click", () => { state.view = "history"; render(); }); nav.appendChild(history); } }
};

const bindAiEventsBase = bindAiEvents;
function renderDataQualityAiAnswer() {
  const rows = state.cdTransactions || [];
  const fields = [["poNumber", "PO번호"], ["modelName", "모델/품목"], ["categoryLarge", "대분류"], ["categorySmall", "소분류"], ["buyer", "Buyer"]];
  const missing = fields.map(([field, label]) => ({ label, count: rows.filter((row) => !String(row[field] || "").trim()).length }));
  const total = rows.length * fields.length;
  const missingTotal = missing.reduce((sum, item) => sum + item.count, 0);
  const readiness = total ? (total - missingTotal) / total * 100 : 0;
  const priority = missing.slice().sort((a, b) => b.count - a.count)[0];
  const answer = document.querySelector("#aiAnswer");
  if (!answer) return;
  answer.innerHTML = `<div class="panel ai-answer-card"><div class="panel-head"><h2>데이터 분석 준비도</h2><span>${rows.length.toLocaleString("ko-KR")}건 근거</span></div><div class="ai-result">구매 이력 ${rows.length.toLocaleString("ko-KR")}건의 분석 준비도는 ${readiness.toFixed(1)}%입니다. 우선 보완 항목은 ${esc(priority?.label || "없음")} (${priority?.count?.toLocaleString("ko-KR") || 0}건 누락)입니다.</div><details open><summary>근거 보기</summary><table class="table"><thead><tr><th>핵심 항목</th><th>누락 건수</th><th>입력률</th></tr></thead><tbody>${missing.map((item) => `<tr><td>${esc(item.label)}</td><td>${item.count.toLocaleString("ko-KR")}</td><td>${rows.length ? ((rows.length - item.count) / rows.length * 100).toFixed(1) : "0.0"}%</td></tr>`).join("")}</tbody></table></details></div>`;
}
bindAiEvents = function () {
  bindAiEventsBase();
  const isQualityQuery = () => /데이터.*품질|분석.*준비도|PO번호.*누락|PO.*누락/.test(document.querySelector("#aiQuery")?.value.trim() || "");
  document.querySelector("#aiAsk")?.addEventListener("click", (event) => { if (!isQualityQuery()) return; event.preventDefault(); event.stopImmediatePropagation(); renderDataQualityAiAnswer(); }, true);
  document.querySelector("#aiQuery")?.addEventListener("keydown", (event) => { if (!(event.key === "Enter" && (event.ctrlKey || event.metaKey)) || !isQualityQuery()) return; event.preventDefault(); event.stopImmediatePropagation(); renderDataQualityAiAnswer(); }, true);
  document.querySelectorAll(".ai-example").forEach((button) => button.addEventListener("click", (event) => { if (!/데이터.*품질|분석.*준비도|PO번호.*누락|PO.*누락/.test(button.textContent || "")) return; event.preventDefault(); event.stopImmediatePropagation(); document.querySelector("#aiQuery").value = button.textContent; renderDataQualityAiAnswer(); }, true));
};

const pricingSearchAliases = { "네트워크": "Network", "종이": "Paper", "서버": "Server", "소프트웨어": "Software", "문서보안": "Document Security", "화상회의": "Video conference", "인쇄": "Finisher", "PC": "PC", "유지보수": "Maintenance" };
document.addEventListener("click", (event) => {
  const metric = event.target.closest(".metric");
  if (!metric) return;
  const metrics = [...metric.parentElement.children];
  const index = metrics.indexOf(metric);
  if (state.view === "dashboard") {
    if (index === 3) { state.view = "contracts"; render(); filterDueContracts(); }
    else { state.view = "requests"; render(); filterDashboardRequests(index === 1 ? "approval" : index === 2 ? "progress" : "all"); }
  } else if (state.view === "contracts" && index === 1) {
    document.querySelector("#expiryAlerts")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (state.view === "contracts" && index === 0) {
    const target = [...document.querySelectorAll(".panel")].find((panel) => panel.textContent.includes("유지보수 계약 목록"));
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (state.view === "contracts" && index === 2) {
    const target = [...document.querySelectorAll(".panel")].find((panel) => panel.textContent.includes("월별 지급 대상"));
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (state.view === "contracts" && index === 3) {
    document.querySelector("#shipmentsList")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}, true);

function recommendViewLegacy() { const rows = state.cdTransactions || []; return `<div class="page-head"><div><h1>업체 추천</h1><p>가격·거래 안정성·유지보수 이력을 기준으로 추천합니다.</p></div><span class="status status-gold">평가 파일 미등록</span></div><div class="panel"><div class="analysis-filters"><input id="recommendSearch" class="search" placeholder="모델명 검색"/><select id="recommendCategory"><option value="">전체 대분류</option>${[...new Set(rows.map((r) => r.categoryLarge).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko")).map((v) => `<option>${esc(v)}</option>`).join("")}</select><button class="btn btn-primary" id="recommendApply">조회</button><button class="btn btn-secondary" id="recommendReset">초기화</button></div></div><div id="recommendBody">${rows.length ? "" : `<div class="panel"><div class="empty">CD집계표를 먼저 업로드해 주세요.</div></div>`}</div>`; }
function bindRecommendEventsLegacy() { const refresh = () => { const term = (document.querySelector("#recommendSearch")?.value || "").normalize("NFKC").toLocaleLowerCase("ko-KR").trim(); const rows = (state.cdTransactions || []).filter((r) => `${r.modelName || ""} ${r.categoryLarge || ""} ${r.categorySmall || ""}`.normalize("NFKC").toLocaleLowerCase("ko-KR").includes(term)); const grouped = new Map(); rows.filter((r) => r.supplierName).forEach((r) => { const a = grouped.get(r.supplierName) || []; a.push(r); grouped.set(r.supplierName, a); }); const scored = [...grouped].map(([supplier, items]) => { const prices = items.map((r) => Number(r.unitPrice || 0)).filter((v) => v > 0); const avg = prices.length ? prices.reduce((s, v) => s + v, 0) / prices.length : 0; const maintenance = items.some((r) => String(r.purchasePurpose || "").includes("유지보수")); const score = Math.round((avg ? 70 : 20) + Math.min(20, items.length * 2) + (maintenance ? 10 : 0)); return { supplier, score, count: items.length, amount: items.reduce((s, r) => s + Number(r.purchaseAmount || 0), 0), avg, maintenance }; }).sort((a, b) => b.score - a.score || b.amount - a.amount); const body = document.querySelector("#recommendBody"); if (!body) return; body.innerHTML = `<div class="notice">평가 파일이 등록되면 평가점수를 추가합니다. 현재 점수: 가격 데이터 70점 + 거래 안정성 최대 20점 + 유지보수 이력 10점</div><div class="panel"><div class="panel-head"><h2>추천 업체</h2><span>${scored.length}개 업체</span></div>${scored.length ? `<table class="table"><thead><tr><th>순위</th><th>업체</th><th>종합점수</th><th>거래건수</th><th>구매금액</th><th>평균단가</th><th>유지보수</th></tr></thead><tbody>${scored.slice(0,100).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.supplier)}</td><td><span class="status ${i < 3 ? "status-mint" : "status-blue"}">${r.score}점</span></td><td>${r.count}</td><td class="num">${money(r.amount)}</td><td class="num">${money(r.avg)}</td><td>${r.maintenance ? "가능" : "이력 없음"}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">조건에 맞는 추천 업체가 없습니다.</div>`}</div>`; }; document.querySelector("#recommendApply")?.addEventListener("click", refresh); document.querySelector("#recommendSearch")?.addEventListener("keydown", (e) => { if (e.key === "Enter") refresh(); }); document.querySelector("#recommendReset")?.addEventListener("click", () => { const e = document.querySelector("#recommendSearch"); if (e) e.value = ""; refresh(); }); refresh(); }

function recommendView() { const rows = state.cdTransactions || []; return `<div class="page-head"><div><h1>업체 추천</h1><p>가격·거래 안정성·유지보수 이력을 기준으로 추천합니다.</p></div><span class="status status-gold">평가 파일 미등록</span></div><div class="panel"><div class="analysis-filters"><input id="recommendSearch" class="search" placeholder="모델명 검색"/><select id="recommendCategory"><option value="">전체 대분류</option>${[...new Set(rows.map((r) => r.categoryLarge).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko")).map((v) => `<option>${esc(v)}</option>`).join("")}</select><button class="btn btn-primary" id="recommendApply">조회</button><button class="btn btn-secondary" id="recommendReset">초기화</button></div></div><div id="recommendBody"></div>`; }
function bindRecommendEvents() { const refresh = () => { const term = (document.querySelector("#recommendSearch")?.value || "").normalize("NFKC").toLocaleLowerCase("ko-KR").trim(); const category = document.querySelector("#recommendCategory")?.value || ""; const rows = (state.cdTransactions || []).filter((r) => (!category || String(r.categoryLarge || "").trim() === category.trim()) && `${r.modelName || ""} ${r.categoryLarge || ""} ${r.categorySmall || ""}`.normalize("NFKC").toLocaleLowerCase("ko-KR").includes(term)); const grouped = new Map(); rows.filter((r) => r.supplierName).forEach((r) => { const a = grouped.get(r.supplierName) || []; a.push(r); grouped.set(r.supplierName, a); }); const scored = [...grouped].map(([supplier, items]) => { const prices = items.map((r) => Number(r.unitPrice || 0)).filter((v) => v > 0); const avg = prices.length ? prices.reduce((s, v) => s + v, 0) / prices.length : 0; const maintenance = items.some((r) => String(r.purchasePurpose || "").includes("유지보수")); return { supplier, score: Math.round((avg ? 70 : 20) + Math.min(20, items.length * 2) + (maintenance ? 10 : 0)), count: items.length, amount: items.reduce((s, r) => s + Number(r.purchaseAmount || 0), 0), avg, maintenance }; }).sort((a, b) => b.score - a.score || b.amount - a.amount); const body = document.querySelector("#recommendBody"); if (!body) return; body.innerHTML = `<div class="notice">평가 파일 등록 전 프로토타입 점수: 가격 70점 + 거래 안정성 최대 20점 + 유지보수 이력 10점</div><div class="panel"><div class="panel-head"><h2>추천 업체</h2><span>${scored.length}개 업체</span></div>${scored.length ? `<table class="table"><thead><tr><th>순위</th><th>업체</th><th>점수</th><th>거래건수</th><th>구매금액</th><th>평균단가</th><th>유지보수</th></tr></thead><tbody>${scored.slice(0,100).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.supplier)}</td><td><span class="status ${i < 3 ? "status-mint" : "status-blue"}">${r.score}점</span></td><td>${r.count}</td><td class="num">${money(r.amount)}</td><td class="num">${money(r.avg)}</td><td>${r.maintenance ? "가능" : "이력 없음"}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">조건에 맞는 추천 업체가 없습니다.</div>`}</div>`; }; document.querySelector("#recommendApply")?.addEventListener("click", refresh); document.querySelector("#recommendCategory")?.addEventListener("change", refresh); document.querySelector("#recommendSearch")?.addEventListener("keydown", (e) => { if (e.key === "Enter") refresh(); }); document.querySelector("#recommendReset")?.addEventListener("click", () => { const s = document.querySelector("#recommendSearch"); const c = document.querySelector("#recommendCategory"); if (s) s.value = ""; if (c) c.value = ""; refresh(); }); refresh(); }

function mailView() { const rows = state.cdTransactions || []; return `<div class="page-head"><div><h1>견적 요청 메일</h1><p>구매 이력을 선택해 Outlook용 메일 초안을 작성합니다.</p></div><span class="status status-blue">초안 모드</span></div><div class="panel"><div class="analysis-filters"><select id="mailRowSelect"><option value="">구매 이력 선택</option>${rows.slice(0,300).map((r,i) => `<option value="${i}">${esc(r.supplierName || "업체 미정")} · ${esc(r.modelName || r.categoryLarge || "상품 미정")} · ${r.taxInvoiceDate || ""}</option>`).join("")}</select><button class="btn btn-primary" id="mailGenerate">초안 생성</button><button class="btn btn-secondary" id="mailCopy">본문 복사</button></div></div><div id="mailBody"><div class="panel"><div class="empty">구매 이력을 선택해 주세요.</div></div></div><div class="panel"><div class="panel-head"><h2>메일 발송 이력</h2><span>${(state.mailDrafts || []).length}건</span></div>${(state.mailDrafts || []).length ? state.mailDrafts.slice().reverse().map((m, i) => `<div class="activity-item mail-history-row" data-mail-history="${i}"><div class="activity-dot"></div><div><strong>${esc(m.subject)}</strong><p>${m.createdAt} · ${esc(m.supplier)} · ${esc(m.source || "구매 이력 기반")} · 초안</p></div></div>`).join("") : `<div class="empty">저장된 초안이 없습니다.</div>`}</div>`; }
function bindMailEvents() { const generate = () => { const row = (state.cdTransactions || [])[Number(document.querySelector("#mailRowSelect")?.value)]; const body = document.querySelector("#mailBody"); if (!row || !body) return; const subject = `[NP MKT 견적요청] ${row.modelName || row.categoryLarge || "구매 품목"} 견적 요청`; const text = `안녕하세요.\n\n아래 구매 품목의 견적을 요청드립니다.\n\n- 업체: ${row.supplierName || ""}\n- 상품/모델: ${row.modelName || ""}\n- 대분류: ${row.categoryLarge || ""}\n- 소분류: ${row.categorySmall || ""}\n- 수량: ${row.quantity || ""}\n- 납품 희망월: 확인 필요\n- 회신 희망일: 확인 필요\n\n견적서와 납기, 보증기간, 설치·교육 지원 여부를 회신 부탁드립니다.\n\n감사합니다.\nNP MKT 구매팀`; body.innerHTML = `<div class="panel"><div class="mail-form"><div><label>수신자</label><input value="${esc(row.supplierName || "업체 담당자 이메일 입력")}" /></div><div><label>참조</label><input value="팀장 김춘수 · ${esc(row.buyer || "Buyer")}" /></div><div><label>제목</label><input id="mailSubject" value="${esc(subject)}" /></div><div><label>본문</label><textarea id="mailText">${esc(text)}</textarea></div></div><div class="action-row"><button class="btn btn-primary" id="mailSaveDraft">초안 저장</button></div></div>`; document.querySelector("#mailSaveDraft")?.addEventListener("click", () => { state.mailDrafts = state.mailDrafts || []; state.mailDrafts.push({ createdAt: new Date().toLocaleString("ko-KR"), supplier: row.supplierName || "업체 미정", subject, body: text }); saveState(); render(); toast("메일 초안을 저장했습니다."); }); }; document.querySelector("#mailGenerate")?.addEventListener("click", generate); document.querySelector("#mailCopy")?.addEventListener("click", async () => { const text = document.querySelector("#mailText")?.value; if (!text) return toast("먼저 초안을 생성해 주세요."); await navigator.clipboard.writeText(text); toast("메일 본문을 복사했습니다."); }); }

function aiView() { const examples = ["올해 네트워크 구매금액이 가장 큰 업체는?", "김희균 Buyer의 5월 Cost Down 금액은?", "작년 서버 구매 평균 단가와 최근 단가를 비교해줘.", "다음 달 예상 구매금액은?", "반복 구매 30일 이내 후보는?", "예측 초안 전환율은?", "실제 절감 성과와 목표 달성률은?", "데이터 분석 준비도와 PO번호 누락 현황은?"]; return `<div class="page-head"><div><h1>AI 자연어 검색</h1><p>구매 데이터와 예측 결과에 대해 질문하면 계산 결과와 근거를 함께 보여줍니다.</p></div><span class="status status-blue">로컬 분석 모드</span></div><div class="panel"><div class="ai-query"><textarea id="aiQuery" placeholder="예: 다음 달 예상 구매금액은?" rows="3"></textarea><button class="btn btn-primary" id="aiAsk">질문하기</button></div><div class="ai-examples">${examples.map((q) => `<button class="btn btn-secondary ai-example">${q}</button>`).join("")}</div></div><div id="aiAnswer"><div class="panel"><div class="empty">예시 질문을 선택하거나 질문을 입력해 주세요.</div></div></div>`; }
function bindAiEvents() { const ask = () => { const query = document.querySelector("#aiQuery")?.value.trim() || ""; const rows = state.cdTransactions || []; const answer = document.querySelector("#aiAnswer"); if (!answer) return; let selected = rows; let title = "구매 데이터 요약"; let result = "질문의 조건을 분석했습니다."; let evidence = ""; const month = query.match(/(\d{1,2})월/); const buyer = ["김희균", "신민경", "김정모", "이동규", "김진영"].find((v) => query.includes(v)); const category = Object.keys(pricingSearchAliases).find((v) => query.includes(v)) || ["Network", "Paper", "Server", "Software"].find((v) => query.toLowerCase().includes(v.toLowerCase())); if (buyer) selected = selected.filter((r) => r.buyer === buyer); if (category) { const en = pricingSearchAliases[category] || category; selected = selected.filter((r) => String(r.categoryLarge || "").trim().toLowerCase() === en.toLowerCase() || String(r.categoryLarge || "").includes(category)); } if (month) selected = selected.filter((r) => new Date(r.taxInvoiceDate).getMonth() + 1 === Number(month[1])); if (/실제 절감|절감 성과|목표 달성률|달성률/.test(query)) { const executions = Object.entries(state.businessRecommendationStatus || {}).filter(([, item]) => item.status === "채택"); const completed = executions.filter(([, item]) => item.executionStatus === "완료"); const target = executions.reduce((sum, [, item]) => sum + Number(item.targetSaving || 0), 0); const actual = completed.reduce((sum, [, item]) => sum + Number(item.actualSaving || 0), 0); const rate = target ? actual / target * 100 : 0; title = "사업기회 절감 성과"; result = `채택 과제 ${executions.length}건 중 완료 ${completed.length}건의 실제 절감 성과는 ${money(actual)}입니다. 전체 목표 절감액 ${money(target)} 대비 달성률은 ${rate.toFixed(1)}%입니다.`; evidence = `<table class="table"><thead><tr><th>사업기회</th><th>담당 Buyer</th><th>상태</th><th>목표 절감액</th><th>실제 절감액</th></tr></thead><tbody>${executions.map(([key, item]) => `<tr><td>${esc(key.replace("::", " · "))}</td><td>${esc(item.executionOwner || "-")}</td><td>${esc(item.executionStatus || "계획")}</td><td class="num">${money(item.targetSaving || 0)}</td><td class="num">${money(item.actualSaving || 0)}</td></tr>`).join("") || "<tr><td colspan='5'>채택한 실행 과제가 없습니다.</td></tr>"}</tbody></table>`; } else if (/예측 초안.*전환율|초안.*전환율|전환율/.test(query)) { const drafts = state.forecastPurchaseDrafts || []; const submitted = drafts.filter((draft) => draft.status === "정식 접수" && draft.requestId); const rate = drafts.length ? submitted.length / drafts.length * 100 : 0; title = "예측 초안 전환 결과"; result = `예측 구매요청 초안 ${drafts.length}건 중 ${submitted.length}건이 정식 구매요청으로 전환되어 전환율은 ${rate.toFixed(1)}%입니다.`; evidence = `<table class="table"><thead><tr><th>초안번호</th><th>품목</th><th>상태</th><th>정식 요청번호</th></tr></thead><tbody>${drafts.slice().reverse().map((draft) => `<tr><td>${esc(draft.id)}</td><td>${esc(draft.product)}</td><td>${esc(draft.status)}</td><td>${esc(draft.requestId || "-")}</td></tr>`).join("") || "<tr><td colspan='4'>생성된 초안이 없습니다.</td></tr>"}</tbody></table>`; } else if (/반복 구매.*30일|30일.*반복 구매/.test(query)) { const today = new Date(); today.setHours(0, 0, 0, 0); const grouped = new Map(); rows.forEach((row) => { const key = `${String(row.modelName || row.categoryLarge || "").trim()}::${String(row.supplierName || "업체 미입력").trim()}`; if (key.startsWith("::")) return; const list = grouped.get(key) || []; list.push(row); grouped.set(key, list); }); const candidates = [...grouped.entries()].map(([key, items]) => { const sorted = items.slice().sort((a, b) => new Date(a.taxInvoiceDate) - new Date(b.taxInvoiceDate)); if (sorted.length < 2) return null; const gaps = sorted.slice(1).map((row, i) => (new Date(row.taxInvoiceDate) - new Date(sorted[i].taxInvoiceDate)) / 86400000).filter((value) => value > 0); const interval = gaps.length ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length : 0; if (!interval || interval > 730) return null; const last = sorted.at(-1); const next = new Date(new Date(last.taxInvoiceDate).getTime() + interval * 86400000); const days = Math.ceil((next - today) / 86400000); return { product: key.split("::")[0], supplier: key.split("::")[1], nextDate: next.toISOString().slice(0, 10), days, amount: items.reduce((sum, row) => sum + Number(row.purchaseAmount || 0), 0) / items.length }; }).filter((item) => item && item.days >= 0 && item.days <= 30).sort((a, b) => a.days - b.days); title = "30일 이내 반복 구매 후보"; result = `향후 30일 내 반복 구매 예상 후보는 ${candidates.length}건이며, 예상 금액 합계는 ${money(candidates.reduce((sum, item) => sum + item.amount, 0))}입니다.`; evidence = `<table class="table"><thead><tr><th>품목</th><th>업체</th><th>예정일</th><th>남은 기간</th><th>예상 금액</th></tr></thead><tbody>${candidates.map((item) => `<tr><td>${esc(item.product)}</td><td>${esc(item.supplier)}</td><td>${item.nextDate}</td><td>D-${item.days}</td><td class="num">${money(item.amount)}</td></tr>`).join("") || "<tr><td colspan='5'>30일 이내 후보가 없습니다.</td></tr>"}</tbody></table>`; } else if (/다음.?달.*예상|예상.*구매금액|구매.*예상.*금액/.test(query)) { const grouped = new Map(); selected.filter((row) => !Number.isNaN(new Date(row.taxInvoiceDate).getTime())).forEach((row) => { const d = new Date(row.taxInvoiceDate); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; grouped.set(key, (grouped.get(key) || 0) + Number(row.purchaseAmount || 0)); }); const months = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])); const avg = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; const recent = avg(months.slice(-3).map((item) => item[1])); const previous = avg(months.slice(-6, -3).map((item) => item[1])); const trend = previous ? Math.max(.8, Math.min(1.2, recent / previous)) : 1; const predicted = recent * trend; title = "다음 달 구매 예측"; result = `최근 3개월 평균과 추세 보정치를 적용한 다음 달 예상 구매금액은 ${money(predicted)}입니다. 추세 보정치는 ${(trend * 100).toFixed(1)}%입니다.`; evidence = `<table class="table"><thead><tr><th>월</th><th>구매금액</th></tr></thead><tbody>${months.slice(-6).map(([name, value]) => `<tr><td>${name}</td><td class="num">${money(value)}</td></tr>`).join("")}</tbody></table>`; } else if (/가장 큰 업체|가장 큰 공급업체/.test(query)) { const grouped = new Map(); selected.forEach((r) => grouped.set(r.supplierName, (grouped.get(r.supplierName) || 0) + Number(r.purchaseAmount || 0))); const top = [...grouped.entries()].sort((a, b) => b[1] - a[1])[0]; result = top ? `${top[0]} 업체의 구매금액이 가장 큽니다: ${money(top[1])}` : "조건에 맞는 업체 데이터가 없습니다."; title = "업체별 구매금액 결과"; } else if (/Cost Down|코스트.?다운|절감/.test(query)) { const amount = selected.reduce((s, r) => s + Number(r.costDownAmount || 0), 0); result = `${buyer ? `${buyer} Buyer의 ` : ""}Cost Down 금액은 ${money(amount)}입니다.`; title = "Cost Down 결과"; } else if (/평균 단가|평균가|최근 단가|최근가/.test(query)) { const prices = selected.map((r) => Number(r.unitPrice || 0)).filter((v) => v > 0); const recent = selected.slice().sort((a, b) => new Date(b.taxInvoiceDate) - new Date(a.taxInvoiceDate))[0]; result = `평균 단가는 ${money(prices.length ? prices.reduce((s, v) => s + v, 0) / prices.length : 0)}, 최근 단가는 ${money(recent?.unitPrice || 0)}입니다.`; title = "단가 비교 결과"; } else { const amount = selected.reduce((s, r) => s + Number(r.purchaseAmount || 0), 0); result = `조건에 맞는 ${selected.length.toLocaleString("ko-KR")}건의 구매금액은 ${money(amount)}입니다.`; } answer.innerHTML = `<div class="panel ai-answer-card"><div class="panel-head"><h2>${title}</h2><span>${selected.length.toLocaleString("ko-KR")}건 근거</span></div><div class="ai-result">${esc(result)}</div><details open><summary>근거 보기</summary>${evidence || historyTable(selected.slice(0, 100))}</details></div>`; }; document.querySelector("#aiAsk")?.addEventListener("click", ask); document.querySelector("#aiQuery")?.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) ask(); }); document.querySelectorAll(".ai-example").forEach((button) => button.addEventListener("click", () => { document.querySelector("#aiQuery").value = button.textContent; ask(); })); }

function suppliersView() { const names = [...new Set((state.cdTransactions || []).map((r) => r.supplierName).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko")); return `<div class="page-head"><div><h1>업체명 별칭 관리</h1><p>표기가 다른 업체명을 대표 업체명으로 통합하기 위한 관리 화면입니다.</p></div><span class="status status-blue">Buyer·관리자 관리</span></div><div class="panel"><div class="notice">대표 업체명을 입력하면 이후 분석·추천 기능에서 통합 기준으로 사용할 수 있습니다. 비워두면 원본 업체명을 사용합니다.</div><div class="supplier-alias-list">${names.length ? names.map((name, i) => `<div class="supplier-alias-row"><span class="supplier-source">${esc(name)}</span><span>→</span><input class="supplier-alias-input" data-supplier-source="${esc(name)}" value="${esc((state.supplierAliases || {})[name] || "")}" placeholder="대표 업체명"/><button class="btn btn-secondary supplier-alias-save" data-supplier-index="${i}">저장</button></div>`).join("") : `<div class="empty">업로드된 업체 데이터가 없습니다.</div>`}</div></div>`; }
function bindSuppliersEvents() { document.querySelectorAll(".supplier-alias-save").forEach((button) => button.addEventListener("click", () => { const input = document.querySelector(`[data-supplier-source="${CSS.escape((document.querySelectorAll(".supplier-alias-input")[Number(button.dataset.supplierIndex)]?.dataset.supplierSource || ""))}"]`); if (!input) return; state.supplierAliases = state.supplierAliases || {}; const source = input.dataset.supplierSource; const value = input.value.trim(); if (value) state.supplierAliases[source] = value; else delete state.supplierAliases[source]; saveState(); toast(`${source} 업체 별칭을 저장했습니다.`); })); }

function contractsView() {
  const contracts = state.contracts || [];
  const payments = paymentCandidateRows().map((c, i) => { const saved = (state.maintenancePayments || []).find((p) => p.contractId === (c.contractId || c.id)); return { ...c, ...(saved || {}), id: saved?.id || `PAY-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`, supplierName: c.vendor || c.supplierName, amountExclVat: c.amountExclVat ?? c.amount ?? 0, paymentStatus: saved?.paymentStatus || "지급 예정" }; });
  const shipments = state.shipments || [];
  const canUpload = ["lead", "buyer", "admin"].includes(state.role);
  const expiring = contracts.filter((c) => { const d = new Date(c.endDate || c.end); return !Number.isNaN(d.getTime()) && d <= new Date(Date.now() + 60 * 86400000); });
  return `<div class="page-head"><div><h1>계약·지불관리</h1><p>유지보수 계약, 발주 후 Ship Confirm, 월별 지급 및 AP 전표를 관리합니다.</p></div><div class="toolbar">${canUpload ? `<label class="btn btn-secondary contract-upload-label"><input id="contractFileInput" type="file" accept=".xlsx,.xlsm" hidden/>AP 계약관리 파일 업로드</label>` : ""}<button class="btn btn-primary" data-action="generate-payments">이번 달 지불대상 생성</button></div></div><div class="cards"><div class="metric"><div class="label">계약 전체</div><div class="value">${contracts.length.toLocaleString("ko-KR")}</div><div class="note">PO + 계약 ID 기준</div></div><div class="metric"><div class="label">D-60 만료 대상</div><div class="value">${expiring.length.toLocaleString("ko-KR")}</div><div class="note">Buyer 알림 대상</div></div><div class="metric"><div class="label">지급 대상</div><div class="value">${payments.length.toLocaleString("ko-KR")}</div><div class="note">매월 20일 기준</div></div><div class="metric"><div class="label">Ship Confirm</div><div class="value">${shipments.length.toLocaleString("ko-KR")}</div><div class="note">부분 출고 포함</div></div></div><div class="panel"><div class="panel-head"><h2>유지보수 계약 목록</h2><span>계약 만료 알림: D-60 · D-30</span></div>${contracts.length ? `<div class="table-scroll"><table class="table"><thead><tr><th>PO 번호</th><th>계약 ID</th><th>업체</th><th>제품/설명</th><th>종료일</th><th>지급월도</th><th>금액</th><th>Buyer</th></tr></thead><tbody>${contracts.slice(0,100).map((c) => `<tr><td>${esc(c.poNumber || "-")}</td><td><strong>${esc(c.contractId || c.id || "-")}</strong></td><td>${esc(c.vendor || c.supplierName || "-")}</td><td class="wrap-cell">${esc(c.product || "-")}</td><td>${esc(c.endDate || c.end || "-")}</td><td>${esc(c.billingCycle || c.cycle || "-")}</td><td class="num">${money(c.amount || 0, c.currency || "KRW")}</td><td>${esc(c.buyer || "-")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">AP 계약관리 파일을 업로드하면 계약 데이터가 표시됩니다.</div>`}</div><div class="panel"><div class="panel-head"><h2>월별 지급 대상</h2><span>${payments.length}건 · Buyer만 상태 변경 가능</span></div>${payments.length ? `<div class="table-scroll"><table class="table"><thead><tr><th>업체</th><th>제품/설명</th><th>지급월도</th><th>금액</th><th>인보이스번호</th><th>AP 전표번호</th><th>상태</th></tr></thead><tbody>${payments.slice(0,100).map((p) => `<tr><td>${esc(p.supplierName || "-")}</td><td class="wrap-cell">${esc(p.product || "-")}</td><td>${esc(p.paymentMonth || "-")}</td><td class="num">${money(p.amountExclVat || 0)}</td><td>${esc(p.invoiceNumber || "-")}</td><td>${esc(p.apSlipNumber || "-")}</td><td><span class="status ${statusClass(p.paymentStatus)}">${esc(p.paymentStatus || "인수증 발행")}</span></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">지급 대상 데이터가 없습니다.</div>`}</div><div class="panel"><div class="panel-head"><h2>업로드 이력</h2><span>${state.contractImportHistory.length}건</span></div>${state.contractImportHistory.length ? `<table class="table"><thead><tr><th>파일명</th><th>업로드일시</th><th>계약</th><th>지급</th><th>Ship Confirm</th><th>신규</th><th>갱신</th><th>경고</th></tr></thead><tbody>${state.contractImportHistory.slice().reverse().map((h) => `<tr><td>${esc(h.fileName)}</td><td>${esc(h.uploadedAt)}</td><td>${h.rows || 0}</td><td>${h.payments || 0}</td><td>${h.shipments || 0}</td><td>${h.newRows || 0}</td><td>${h.updatedRows || 0}</td><td>${h.warnings || 0}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">업로드 이력이 없습니다.</div>`}</div>`;
}

bootstrapAuth();
