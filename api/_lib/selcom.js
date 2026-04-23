import crypto from "crypto";

function darEsSalaamTimestamp() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const pick = (t) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}:${pick("second")}+03:00`;
}

function buildDigest(body, timestamp, apiSecret) {
  const signedFields = Object.keys(body).join(",");
  let signData = `timestamp=${timestamp}`;
  for (const key of Object.keys(body)) {
    signData += `&${key}=${body[key]}`;
  }
  const hmac = crypto.createHmac("sha256", apiSecret);
  hmac.update(signData);
  const digest = hmac.digest("base64");
  return { digest, signedFields };
}

export function createSelcomOrderMinimal({
  vendor,
  apiKey,
  apiSecret,
  live,
  orderId,
  buyerEmail,
  buyerName,
  buyerPhone,
  amount,
  currency,
  redirectUrl,
  cancelUrl,
  webhookUrl,
  expiryMinutes,
  colors,
}) {
  const base = live
    ? "https://apigw.selcommobile.com/v1"
    : "https://apigwtest.selcommobile.com/v1";

  const body = {
    vendor,
    order_id: orderId,
    buyer_email: buyerEmail,
    buyer_name: buyerName,
    buyer_phone: buyerPhone,
    amount: Math.round(Number(amount)),
    currency: currency || "TZS",
    redirect_url: Buffer.from(redirectUrl, "utf8").toString("base64"),
    cancel_url: Buffer.from(cancelUrl, "utf8").toString("base64"),
    webhook: Buffer.from(webhookUrl, "utf8").toString("base64"),
    no_of_items: 1,
    expiry: String(expiryMinutes ?? 60),
    header_colour: colors?.header ?? "#0f172a",
    link_colour: colors?.link ?? "#38bdf8",
    button_colour: colors?.button ?? "#22c55e",
  };

  const timestamp = darEsSalaamTimestamp();
  const { digest, signedFields } = buildDigest(body, timestamp, apiSecret);
  const authorization = Buffer.from(apiKey, "utf8").toString("base64");

  const url = `${base}/checkout/create-order-minimal`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-type": 'application/json;charset="utf-8"',
      Accept: "application/json",
      "Cache-Control": "no-cache",
      "Digest-Method": "HS256",
      Authorization: `SELCOM ${authorization}`,
      Digest: digest,
      Timestamp: timestamp,
      "Signed-Fields": signedFields,
    },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

export function isSelcomSuccess(payload) {
  const code = String(payload?.resultcode ?? "");
  const result = String(payload?.result ?? "").toUpperCase();
  return code === "000" || result === "SUCCESS";
}

export function extractGatewayUrl(payload) {
  const b64 = payload?.data?.[0]?.payment_gateway_url;
  if (!b64 || typeof b64 !== "string") return null;
  try {
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return null;
  }
}
