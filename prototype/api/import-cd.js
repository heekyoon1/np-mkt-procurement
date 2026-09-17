import * as XLSX from "xlsx";

const required = ["세금계산서날짜", "수량", "단가(원)", "금액(원)", "납품업체명", "모델명", "Sub Category 1", "Sub Category 3", "총C/D금액", "C/D%"];
const meaningful = (value) => value != null && String(value).trim() !== "" && String(value).trim() !== "-";
const text = (value) => meaningful(value) ? String(value).trim() : null;
const number = (value) => {
  if (!meaningful(value)) return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replaceAll(",", "").replaceAll("₩", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};
const percent = (value) => {
  if (!meaningful(value)) return null;
  const raw = String(value).replaceAll(",", "").trim();
  const parsed = Number(raw.replace("%", ""));
  if (!Number.isFinite(parsed)) return null;
  return raw.includes("%") || Math.abs(parsed) > 1 ? parsed / 100 : parsed;
};
const isoDate = (value) => {
  if (!meaningful(value)) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const normalized = String(value).trim().replaceAll(".", "-").replaceAll("/", "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const candidate = new Date(`${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}T00:00:00Z`);
  return Number.isNaN(candidate.getTime()) ? null : candidate.toISOString().slice(0, 10);
};
const positive = (value) => (number(value) || 0) > 0;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST만 지원합니다." });
  try {
    const { fileName, data } = req.body || {};
    if (!fileName || !data) throw new Error("파일 데이터가 없습니다.");
    const bytes = Buffer.from(data, "base64");
    if (bytes.length > 10 * 1024 * 1024) throw new Error("파일당 최대 10MB까지 업로드할 수 있습니다.");
    const workbook = XLSX.read(bytes, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets["CD집계표(Total)"];
    if (!sheet) throw new Error("CD집계표(Total) 시트를 찾을 수 없습니다.");
    // raw:true keeps Excel dates and currency cells as typed values. Display-formatted
    // strings such as "1,234,000" caused NaN in Cost Down calculations before.
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
    const headers = (grid[3] || []).map((value) => String(value || "").trim());
    const index = Object.fromEntries(headers.map((header, position) => [header, position]));
    const missing = required.filter((name) => index[name] == null);
    if (index["PO번호"] == null && index["PO 번호"] == null) missing.push("PO번호 또는 PO 번호");
    if (missing.length) return res.status(400).json({ ok: false, errorType: "missing_column", missing });
    let skippedTemplateRows = 0;
    const rows = grid.slice(4).flatMap((values, offset) => {
      const get = (name) => values[index[name]];
      const invoiceDate = get("세금계산서날짜");
      const purchaseAmount = get("금액(원)");
      if (!meaningful(invoiceDate) && !positive(purchaseAmount)) { skippedTemplateRows += 1; return []; }
      const poNumber = text(get("PO번호")) || text(get("PO 번호"));
      return [{
        sourceRow: offset + 5,
        poNumber,
        taxInvoiceDate: isoDate(invoiceDate),
        quantity: number(get("수량")),
        unitPrice: number(get("단가(원)")),
        purchaseAmount: number(purchaseAmount),
        supplierName: text(get("납품업체명")),
        modelName: text(get("모델명")),
        categoryLarge: text(get("Sub Category 1")),
        categorySmall: text(get("Sub Category 3")),
        costDownAmount: number(get("총C/D금액")),
        costDownRate: percent(get("C/D%")),
        buyer: text(get("Buyer")),
        purchasePurpose: text(get("구매용도")),
        requester: text(get("요청자")),
      }];
    });
    res.status(200).json({ ok: true, sheet: "CD집계표(Total)", rows, warningRows: rows.filter((row) => !row.poNumber).length, skippedTemplateRows });
  } catch (error) { res.status(400).json({ ok: false, error: error.message || "파일을 읽지 못했습니다." }); }
}
