export const PRESALES_STAGES = Object.freeze([
  { value: 'intake', label: 'Talep alındı', tone: 'planned' },
  { value: 'spec_review', label: 'Şartname analizi', tone: 'active' },
  { value: 'solution_design', label: 'Ürün ve BOM çalışması', tone: 'active' },
  { value: 'estimated_cost', label: 'Yaklaşık maliyet çalışması', tone: 'active' },
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

export const OPPORTUNITY_TYPES = Object.freeze([
  { value: 'tender', label: 'İhale' },
  { value: 'rfp', label: 'RFP / teknik talep' },
  { value: 'rfq', label: 'RFQ / fiyat talebi' },
  { value: 'direct', label: 'Doğrudan satış' },
  { value: 'renewal', label: 'Yenileme / kapasite artışı' },
  { value: 'poc', label: 'PoC / demo' },
  { value: 'other', label: 'Diğer' },
]);

export const PRESALES_PRIORITIES = Object.freeze([
  { value: 'normal', label: 'Normal', tone: 'planned' },
  { value: 'high', label: 'Yüksek', tone: 'waiting' },
  { value: 'critical', label: 'Kritik', tone: 'blocked' },
]);

export const CURRENCIES = Object.freeze([
  { value: 'TRY', label: 'TRY' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
]);

export const QUALIFICATION_DIMENSIONS = Object.freeze([
  { value: 'metrics', label: 'Ölçülebilir değer', short: 'M', prompt: 'Müşteri sonucunu ölçen hedef, kazanım veya finansal etki' },
  { value: 'economic_buyer', label: 'Ekonomik karar verici', short: 'EB', prompt: 'Bütçe ve nihai onay yetkisine sahip kişi' },
  { value: 'decision_criteria', label: 'Karar kriterleri', short: 'DC', prompt: 'Teknik, ticari ve ilişkisel değerlendirme kriterleri' },
  { value: 'decision_process', label: 'Karar süreci', short: 'DP', prompt: 'Değerlendirme, kurul, demo ve onay adımları' },
  { value: 'paper_process', label: 'Satın alma süreci', short: 'PP', prompt: 'İhale, hukuk, sözleşme ve satın alma akışı' },
  { value: 'pain', label: 'İhtiyaç ve iş etkisi', short: 'IP', prompt: 'Çözülmesi gereken problem ve çözülmezse etkisi' },
  { value: 'champion', label: 'İç destekçi', short: 'CH', prompt: 'Projeyi içeride savunan, etkili ve erişilebilir kişi' },
  { value: 'competition', label: 'Rekabet ve statüko', short: 'CO', prompt: 'Rakipler, mevcut çözüm ve hiçbir şey yapmama seçeneği' },
]);

export const QUALIFICATION_STATUSES = Object.freeze([
  { value: 'unknown', label: 'Bilinmiyor', tone: 'planned', weight: 0 },
  { value: 'partial', label: 'Kısmi', tone: 'waiting', weight: 1 },
  { value: 'confirmed', label: 'Doğrulandı', tone: 'completed', weight: 2 },
  { value: 'blocked', label: 'Engel var', tone: 'blocked', weight: 0 },
]);

export const STAKEHOLDER_ROLES = Object.freeze([
  { value: 'economic_buyer', label: 'Ekonomik karar verici' },
  { value: 'decision_maker', label: 'Karar verici' },
  { value: 'technical', label: 'Teknik karar verici' },
  { value: 'champion', label: 'İç destekçi' },
  { value: 'influencer', label: 'Etkileyici' },
  { value: 'procurement', label: 'Satın alma' },
  { value: 'legal', label: 'Hukuk / sözleşme' },
  { value: 'user', label: 'Son kullanıcı' },
  { value: 'other', label: 'Diğer' },
]);

export const STAKEHOLDER_INFLUENCE = Object.freeze([
  { value: 'low', label: 'Düşük' },
  { value: 'medium', label: 'Orta' },
  { value: 'high', label: 'Yüksek' },
]);

export const STAKEHOLDER_STANCES = Object.freeze([
  { value: 'unknown', label: 'Bilinmiyor', tone: 'planned' },
  { value: 'supportive', label: 'Destekliyor', tone: 'completed' },
  { value: 'neutral', label: 'Nötr', tone: 'active' },
  { value: 'blocker', label: 'Engelleyici', tone: 'blocked' },
]);

export const PRESALES_ACTION_STATUSES = Object.freeze([
  { value: 'open', label: 'Açık', tone: 'planned' },
  { value: 'in_progress', label: 'Devam ediyor', tone: 'active' },
  { value: 'waiting', label: 'Bekliyor', tone: 'waiting' },
  { value: 'done', label: 'Tamamlandı', tone: 'completed' },
]);

const stageValues = new Set(PRESALES_STAGES.map((item) => item.value));
const offerabilityValues = new Set(OFFERABILITY_STATUSES.map((item) => item.value));
const recordTypeValues = new Set(PRESALES_RECORD_TYPES.map((item) => item.value));
const complianceValues = new Set(COMPLIANCE_STATUSES.map((item) => item.value));
const confidenceValues = new Set(CONFIDENCE_LEVELS.map((item) => item.value));
const responseModeValues = new Set(RESPONSE_MODES.map((item) => item.value));
const opportunityTypeValues = new Set(OPPORTUNITY_TYPES.map((item) => item.value));
const priorityValues = new Set(PRESALES_PRIORITIES.map((item) => item.value));
const currencyValues = new Set(CURRENCIES.map((item) => item.value));
const qualificationStatusValues = new Set(QUALIFICATION_STATUSES.map((item) => item.value));
const stakeholderRoleValues = new Set(STAKEHOLDER_ROLES.map((item) => item.value));
const stakeholderInfluenceValues = new Set(STAKEHOLDER_INFLUENCE.map((item) => item.value));
const stakeholderStanceValues = new Set(STAKEHOLDER_STANCES.map((item) => item.value));
const actionStatusValues = new Set(PRESALES_ACTION_STATUSES.map((item) => item.value));

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

export function normalizeOpportunityType(value) {
  return opportunityTypeValues.has(value) ? value : 'tender';
}

export function normalizePresalesPriority(value) {
  return priorityValues.has(value) ? value : 'normal';
}

export function normalizeCurrency(value) {
  return currencyValues.has(value) ? value : 'TRY';
}

export function normalizeQualificationStatus(value) {
  return qualificationStatusValues.has(value) ? value : 'unknown';
}

export function normalizeStakeholderRole(value) {
  return stakeholderRoleValues.has(value) ? value : 'other';
}

export function normalizeStakeholderInfluence(value) {
  return stakeholderInfluenceValues.has(value) ? value : 'medium';
}

export function normalizeStakeholderStance(value) {
  return stakeholderStanceValues.has(value) ? value : 'unknown';
}

export function normalizePresalesActionStatus(value) {
  return actionStatusValues.has(value) ? value : 'open';
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

export function presalesPriorityMeta(value) {
  return PRESALES_PRIORITIES.find((item) => item.value === value) || PRESALES_PRIORITIES[0];
}

export function opportunityTypeMeta(value) {
  return OPPORTUNITY_TYPES.find((item) => item.value === value) || OPPORTUNITY_TYPES[0];
}

export function qualificationStatusMeta(value) {
  return QUALIFICATION_STATUSES.find((item) => item.value === value) || QUALIFICATION_STATUSES[0];
}

export function stakeholderRoleMeta(value) {
  return STAKEHOLDER_ROLES.find((item) => item.value === value) || STAKEHOLDER_ROLES.at(-1);
}

export function stakeholderStanceMeta(value) {
  return STAKEHOLDER_STANCES.find((item) => item.value === value) || STAKEHOLDER_STANCES[0];
}

export function presalesActionStatusMeta(value) {
  return PRESALES_ACTION_STATUSES.find((item) => item.value === value) || PRESALES_ACTION_STATUSES[0];
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
