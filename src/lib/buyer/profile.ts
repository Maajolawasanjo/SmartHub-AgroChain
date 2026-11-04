/** Profile completeness is not independent business verification. */
export const REQUIRED_BUYER_PROFILE_FIELDS = [
  ["businessName", "Business name"],
  ["businessType", "Business type"],
  ["contactName", "Primary contact"],
  ["contactEmail", "Business email"],
  ["contactPhone", "Business phone"],
  ["state", "State / FCT"],
  ["city", "City / LGA"],
] as const;

export type BuyerProfileSnapshot = Partial<Record<typeof REQUIRED_BUYER_PROFILE_FIELDS[number][0], string | null>>;
export function buyerProfileCompletion(profile:BuyerProfileSnapshot | null | undefined){
 const missing=REQUIRED_BUYER_PROFILE_FIELDS.filter(([field])=>!profile?.[field]?.trim()).map(([,label])=>label);
 return {complete:missing.length===0,missing,completed:REQUIRED_BUYER_PROFILE_FIELDS.length-missing.length,total:REQUIRED_BUYER_PROFILE_FIELDS.length};
}
