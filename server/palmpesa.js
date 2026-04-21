
export async function createPalmpesaOrder({
  userId,
  vendor,
  apiKey,
  orderId,
  buyerEmail,
  buyerName,
  buyerPhone,
  amount,
  currency,
  redirectUrl,
  cancelUrl,
  webhookUrl,
}) {
  const url = "https://palmpesa.drmlelwa.co.tz/api/process-payment";

  const body = {
    user_id: Number(userId),
    vendor: vendor || "TILL61103867",
    order_id: orderId,
    buyer_email: buyerEmail,
    buyer_name: buyerName,
    buyer_phone: buyerPhone.startsWith("255") ? buyerPhone : `255${buyerPhone.replace(/^0/, "")}`,
    amount: Math.round(Number(amount)),
    currency: currency || "TZS",
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
    webhook: webhookUrl,
    buyer_remarks: "Betslip Purchase",
    merchant_remarks: "Betslips Platform",
    no_of_items: 1,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return data;
}

export function isPalmpesaSuccess(payload) {
  // Based on docs, success in initiating returns a "sharable payment link" string in the error field (strange but okay)
  // or it might return a specific structure.
  return !!payload?.raw?.payment_gateway_url;
}

export function extractPalmpesaUrl(payload) {
  return payload?.raw?.payment_gateway_url || null;
}
