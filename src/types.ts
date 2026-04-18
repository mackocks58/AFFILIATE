export type BetslipResult = "pending" | "won" | "lost";

export type Betslip = {
  company: string;
  title: string;
  cost: number;
  currency: string;
  imageUrl: string;
  expiresAt: number;
  result: BetslipResult;
  settledAt?: number | null;
  createdAt: number;
  createdBy: string;
};

export type Purchase = {
  status: "completed" | "pending" | "failed";
  paidAt?: number;
  amount?: number;
  orderId?: string;
  reference?: string;
  betslipId?: string;
};

export type UserPayment = {
  betslipId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: number;
  updatedAt?: number;
  orderId?: string;
  reference?: string;
  selcomTransid?: string;
};

export type SupportTicket = {
  uid: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  createdAt: number;
};
