import * as XLSX from "xlsx";
const text = (value) => value == null ? "" : String(value).trim();
const rowsAt = (sheet, headerRow) => { const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }); return { headers: (rows[headerRow - 1] || []).map(text), rows: rows.slice(headerRow) }; };
const read = (headers, row, ...names) => { const i = names.map((name) => headers.indexOf(name)).find((n) => n >= 0); return i == null ? null : row[i]; };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST만 지원합니다." });
  try {
    const { fileName, data } = req.body || {}; const bytes = Buffer.from(data || "", "base64");
    if (!fileName || !bytes.length) throw new Error("파일 데이터가 없습니다."); if (bytes.length > 10 * 1024 * 1024) throw new Error("파일당 최대 10MB까지 업로드할 수 있습니다.");
    const wb = XLSX.read(bytes, { type: "buffer", cellDates: true }); const ariba = wb.Sheets["Ariba입력대상"]; if (!ariba) return res.status(400).json({ ok: false, errorType: "missing_column", missing: ["Ariba입력대상 시트"] });
    const { headers, rows } = rowsAt(ariba, 2); const needed = ["계약ID", "업체명", "전체 설명(Description)", "지불월도", "총합계 (VAT포함)", "담당자"]; const missing = needed.filter((name) => !headers.includes(name)); if (missing.length) return res.status(400).json({ ok: false, errorType: "missing_column", missing });
    const contracts = rows.flatMap((row, offset) => { const contractId = text(read(headers,row,"계약ID")); const supplierName = text(read(headers,row,"업체명")); const product = text(read(headers,row,"전체 설명(Description)")); if (!contractId && !supplierName && !product) return []; return [{ sourceRow: offset + 3, poNumber:text(read(headers,row,"PO 번호","PO NO")), contractId, supplierName:supplierName||"미입력", product:product||"미입력", type:text(read(headers,row,"Compliance Contract Type","계약 유형"))||"유지보수", owner:text(read(headers,row,"담당자")), customerName:text(read(headers,row,"고객명")), startDate:read(headers,row,"고객계약시작일","계약 시작일"), endDate:read(headers,row,"고객계약만료","고객계약만료일","계약 만료일"), supplierEndDate:read(headers,row,"Ariba 계약만료일"), billingCycle:text(read(headers,row,"지불월도"))||"미입력", currency:"KRW", amountInclVat:read(headers,row,"총합계 (VAT포함)"), amountExclVat:read(headers,row,"수락됨\n- Amount(VAT별도)","Amount(VAT별도)"), paymentExcluded:["대상외","지급 제외"].includes(text(read(headers,row,"지불여부"))), maintenanceEligible:true }]; });
    res.status(200).json({ ok:true, sheets:wb.SheetNames.filter((name)=>["Ariba입력대상","유지보수지불건","쉽컴펌"].includes(name)), contracts, payments:[], shipments:[], warnings:contracts.filter((row)=>!row.contractId).map((row)=>({sheet:"Ariba입력대상",sourceRow:row.sourceRow,reason:"계약ID 누락"})), summary:{contracts:contracts.length,payments:0,shipments:0,warnings:contracts.filter((row)=>!row.contractId).length} });
  } catch (error) { res.status(400).json({ ok:false, error:error.message||"파일을 읽지 못했습니다." }); }
}
