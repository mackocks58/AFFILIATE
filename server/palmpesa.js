
export async function createPalmpesaOrder({
  apiKey,
  userId,
  vendor,
  orderId,
  buyerEmail,
  buyerName,
  buyerPhone,
  amount,
  webhookUrl,
}) {
  const url = "https://palmpesa.drmlelwa.co.tz/api/palmpesa/initiate";

  // Phone formatting: ensure it starts with 255 and has no leading 0
  let phone = buyerPhone.replace(/\s+/g, "").replace(/^\+/, "");
  if (phone.startsWith("0")) {
    phone = "255" + phone.substring(1);
  } else if (!phone.startsWith("255")) {
    phone = "255" + phone;
  }

  const body = {
    user_id: userId,
    vendor: vendor,
    name: buyerName,
    email: buyerEmail,
    phone: phone,
    amount: Math.round(Number(amount)),
    transaction_id: orderId,
    address: "Tanzania",
    postcode: "00000",
    callback_url: webhookUrl,
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
  // Based on docs, success returns { "message": "Payment initiated...", "order_id": "PALMPESA..." }
  return !!payload?.order_id || payload?.message?.includes("initiated");
}

export function extractPalmpesaUrl(payload) {
  // USSD push does not return a gateway URL
  return null;
}
