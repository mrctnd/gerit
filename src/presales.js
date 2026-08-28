export const PRESALES_STAGES = Object.freeze([
  { value: 'intake', label: 'Talep alındı', tone: 'planned' },
  { value: 'spec_review', label: 'Şartname analizi', tone: 'active' },
  { value: 'solution_design', label: 'Ürün ve BOM çalışması', tone: 'active' },
  { value: 'vendor_confirmation', label: 'Üretici teyidi', tone: 'waiting' },
  { value: 'commercial', label: 'Fiyatlandırma', tone: 'waiting' },
  { value: 'response', label: 'Cevap ve teslim hazırlığı', tone: 'active' },
  { value: 'submitted', label: 'Teklif sunuldu', tone: 'waiting' },
  { value: 'on_hold', label: 'Beklemede', tone: 'blocked' },
  { value: 'won', label: 'Kazanıldı', tone: 'completed' },
  { value: 'lost', label: 'Kaybedildi', tone: 'blocked' },
]);

export const OFFERABILITY_STATUSES = Object.freeze([
  { value: 'unassessed', label: 'Henüz değerlendirilmedi', tone: 'planned' },
  { value: 'yes', label: 'Teklif verilebilir', tone: 'completed' },
  { value: 'conditional', label: 'Şartlı teklif verilebilir', tone: 'waiting' },
  { value: 'no', label: 'Teklif verilemez', tone: 'blocked' },
]);

export const PRESALES_RECORD_TYPES = Object.freeze([
  { value: 'requirement', label: 'Şartname maddesi' },
  { value: 'bom', label: 'BOM / kitlist bulgusu' },
  { value: 'product', label: 'Ürün kararı' },
  { value: 'competition', label: 'Rekabet bulgusu' },
  { value: 'change_request', label: 'Değişiklik talebi' },
  { value: 'response', label: 'Şartname cevabı' },
  { value: 'cost_risk', label: 'Maliyet / sorumluluk' },
  { value: 'vendor_question', label: 'Üretici sorusu / teyidi' },
]);

export const COMPLIANCE_STATUSES = Object.freeze([
  { value: 'unreviewed', label: 'İncelenmedi', tone: 'planned' },
  { value: 'compliant', label: 'Uygun', tone: 'completed' },
  { value: 'conditional', label: 'Şartlı Uygun', tone: 'waiting' },
  { value: 'noncompliant', label: 'Uygun Değil - Değişiklik Gerekli', tone: 'blocked' },
  { value: 'clarification', label: 'Teyit / Netleştirme', tone: 'waiting' },
  { value: 'out_of_scope', label: 'Kapsam Dışı', tone: 'planned' },
  { value: 'completed', label: 'Çalışma tamamlandı', tone: 'completed' },
]);

export const CONFIDENCE_LEVELS = Object.freeze([
  { value: 'low', label: 'Düşük' },
  { value: 'medium', label: 'Orta' },
  { value: 'high', label: 'Yüksek' },
]);

export const RESPONSE_MODES = Object.freeze([
  { value: 'none', label: 'Cevap hazırlanmayacak' },
  { value: 'short_acceptance', label: 'Kısa kabul' },
  { value: 'positive_wording', label: 'Pozitif wording' },
]);

const stageValues = new Set(PRESALES_STAGES.map((item) => item.value));
const offerabilityValues = new Set(OFFERABILITY_STATUSES.map((item) => item.value));
const recordTypeValues = new Set(PRESALES_RECORD_TYPES.map((item) => item.value));
const complianceValues = new Set(COMPLIANCE_STATUSES.map((item) => item.value));
const confidenceValues = new Set(CONFIDENCE_LEVELS.map((item) => item.value));
const responseModeValues = new Set(RESPONSE_MODES.map((item) => item.value));

export function normalizePresalesStage(value) {
  return stageValues.has(value) ? value : 'intake';
}

export function normalizeOfferability(value) {
  return offerabilityValues.has(value) ? value : 'unassessed';
}

export function normalizePresalesRecordType(value) {
  return recordTypeValues.has(value) ? value : 'requirement';
}

export function normalizeComplianceStatus(value) {
  return complianceValues.has(value) ? value : 'unreviewed';
}

export function normalizeConfidence(value) {
  return confidenceValues.has(value) ? value : 'medium';
}

export function normalizeResponseMode(value) {
  return responseModeValues.has(value) ? value : 'none';
}

export function presalesStageMeta(value) {
  return PRESALES_STAGES.find((item) => item.value === value) || PRESALES_STAGES[0];
}

export function offerabilityMeta(value) {
  return OFFERABILITY_STATUSES.find((item) => item.value === value) || OFFERABILITY_STATUSES[0];
}

export function presalesRecordTypeMeta(value) {
  return PRESALES_RECORD_TYPES.find((item) => item.value === value) || PRESALES_RECORD_TYPES[0];
}

export function complianceStatusMeta(value) {
  return COMPLIANCE_STATUSES.find((item) => item.value === value) || COMPLIANCE_STATUSES[0];
}

export function riskMeta(probability, impact, evidenceGap) {
  const score = clampInteger(probability, 1, 3, 1) * clampInteger(impact, 1, 3, 1)
    + clampInteger(evidenceGap, 0, 2, 0);
  if (score >= 8) return { score, label: 'Kritik', tone: 'blocked' };
  if (score >= 5) return { score, label: 'Yüksek', tone: 'waiting' };
  if (score >= 3) return { score, label: 'Orta', tone: 'active' };
  return { score, label: 'Düşük', tone: 'completed' };
}

export function clampInteger(value, min, max, fallback = min) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
