import * as XLSX from "xlsx";

const required = ["세금계산서날짜", "수량", "단가(원)", "금액(원)", "납품업체명", "모델명", "Sub Category 1", "Sub Category 3", "총C/D금액", "C/D%"];
const meaningful = (value) => value != null && String(value).trim() !== "" && String(value).trim() !== "-";
const clean = (value) => meaningful(value) ? value : null;
const positive = (value) => meaningful(value) && Number(String(value).replaceAll(",", "")) > 0;

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
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
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
      const poNumber = clean(get("PO번호")) || clean(get("PO 번호"));
      return [{ sourceRow: offset + 5, poNumber, taxInvoiceDate: clean(invoiceDate), quantity: clean(get("수량")), unitPrice: clean(get("단가(원)")), purchaseAmount: clean(purchaseAmount), supplierName: clean(get("납품업체명")), modelName: clean(get("모델명")), categoryLarge: clean(get("Sub Category 1")), categorySmall: clean(get("Sub Category 3")), costDownAmount: clean(get("총C/D금액")), costDownRate: clean(get("C/D%")), buyer: clean(get("Buyer")), purchasePurpose: clean(get("구매용도")), requester: clean(get("요청자")) }];
    });
    res.status(200).json({ ok: true, sheet: "CD집계표(Total)", rows, warningRows: rows.filter((row) => !row.poNumber).length, skippedTemplateRows });
  } catch (error) { res.status(400).json({ ok: false, error: error.message || "파일을 읽지 못했습니다." }); }
}
