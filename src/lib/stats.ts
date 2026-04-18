import type { Betslip, BetslipResult } from "@/types";

export function resultSymbol(result: BetslipResult): "X" | "✅" | "—" {
  if (result === "won") return "✅";
  if (result === "lost") return "X";
  return "—";
}

export function lastFiveStats(betslips: Record<string, Betslip> | null | undefined): BetslipResult[] {
  if (!betslips) return [];
  const rows = Object.entries(betslips)
    .map(([id, v]) => ({ id, ...v }))
    .filter((b) => b.result === "won" || b.result === "lost")
    .sort((a, b) => Number(b.settledAt ?? b.createdAt) - Number(a.settledAt ?? a.createdAt))
    .slice(0, 5);

  if (!rows.length) return [];
  return rows.map((b) => b.result);
}
