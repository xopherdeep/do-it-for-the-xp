export type ProPlanId = "monthly" | "yearly" | "lifetime";
export type ProGate = "templeCreator" | "advancedSchedule" | "aiHelpers" | "gameStyles";

export const PRO_PLANS: Record<
  ProPlanId,
  {
    price: number;
    interval: "month" | "year" | null;
    trialDays: number;
    storeProductId: string;
  }
> = {
  monthly: { price: 4.99, interval: "month", trialDays: 7, storeProductId: "xp_pro_monthly" },
  yearly: { price: 39.99, interval: "year", trialDays: 7, storeProductId: "xp_pro_yearly" },
  lifetime: { price: 79, interval: null, trialDays: 0, storeProductId: "xp_pro_lifetime" },
};

export const PRO_GATE_NAMES: Record<ProGate, string> = {
  templeCreator: "Temple Creator",
  advancedSchedule: "Advanced scheduling",
  aiHelpers: "AI helpers",
  gameStyles: "More Game Styles",
};
