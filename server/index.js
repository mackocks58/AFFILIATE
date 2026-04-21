import "dotenv/config";
import express from "express";
import cors from "cors";
import { getAdmin } from "./firebaseAdmin.js";
import { createPalmpesaOrder, extractPalmpesaUrl, isPalmpesaSuccess } from "./palmpesa.js";
import crypto from "crypto";

const PORT = Number(process.env.PORT || 8787);
const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

function generateOrderId() {
  const prefix = (process.env.SELCOM_ORDER_PREFIX || "BS").toUpperCase();
  return `${prefix}${Date.now()}${crypto.randomInt(1000, 9999)}`;
}

function paymentSuccess(payload) {
  let status = String(payload?.payment_status ?? "").toUpperCase();
  let result = String(payload?.result ?? "").toUpperCase();
  let code = String(payload?.resultcode ?? "");

  if (payload?.data && Array.isArray(payload.data) && payload.data.length > 0) {
    const item = payload.data[0];
    if (item.payment_status) status = String(item.payment_status).toUpperCase();
    if (item.result) result = String(item.result).toUpperCase();
    if (item.resultcode) code = String(item.resultcode);
  }

  return status === "COMPLETED" || result === "SUCCESS" || code === "000";
}

app.post("/api/checkout/init", async (req, res) => {
  try {
    const admin = getAdmin();
    const { idToken, betslipId, buyer } = req.body || {};
    if (!idToken || !betslipId || !buyer?.name || !buyer?.email || !buyer?.phone) {
      return res.status(400).json({ error: "Missing idToken, betslipId, or buyer details." });
    }
    const nameParts = String(buyer.name).trim().split(/\s+/);
    if (nameParts.length < 2) {
      return res.status(400).json({ error: "Full name must include at least two words." });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = admin.database();
    const slipSnap = await db.ref(`betslips/${betslipId}`).get();
    if (!slipSnap.exists()) {
      return res.status(404).json({ error: "Betslip not found." });
    }
    const slip = slipSnap.val();
    const now = Date.now();
    if (Number(slip.expiresAt) <= now) {
      return res.status(400).json({ error: "This betslip has expired." });
    }

    const purchaseSnap = await db.ref(`purchases/${uid}/${betslipId}`).get();
    if (purchaseSnap.exists() && purchaseSnap.val()?.status === "completed") {
      return res.status(400).json({ error: "Already purchased." });
    }

    const apiKey = process.env.PALMPESA_API_KEY;
    const userId = process.env.PALMPESA_USER_ID;
    const vendor = process.env.PALMPESA_VENDOR;
    if (!apiKey || !userId) {
      return res.status(500).json({ error: "PalmPesa is not configured on the server." });
    }

    const publicBase = process.env.PUBLIC_APP_URL || "http://localhost:5173";
    const redirectUrl = `${publicBase.replace(/\/$/, "")}/payment/return`;
    const cancelUrl = `${publicBase.replace(/\/$/, "")}/payment/cancel`;
    const webhookUrl = `${process.env.SELCOM_WEBHOOK_PUBLIC_URL || publicBase}/api/palmpesa/webhook`;

    const orderId = generateOrderId();
    const amount = Number(slip.cost);
    const currency = slip.currency || "TZS";

    const session = {
      uid,
      betslipId,
      amount,
      currency,
      status: "pending",
      createdAt: now,
      orderId,
    };

    await db.ref(`checkoutSessions/${orderId}`).set(session);
    await db.ref(`userPayments/${uid}/${orderId}`).update({
      betslipId,
      amount,
      currency,
      status: "pending",
      createdAt: now,
      orderId,
    });

    console.log("PalmPesa Request:", {
      userId,
      vendor,
      orderId,
      buyerPhone: String(buyer.phone).trim(),
      amount,
    });

    const palmpesaResp = await createPalmpesaOrder({
      apiKey,
      userId,
      vendor,
      orderId,
      buyerEmail: String(buyer.email).trim(),
      buyerName: String(buyer.name).trim(),
      buyerPhone: String(buyer.phone).trim(),
      amount,
      webhookUrl,
    });

    console.log("PalmPesa Response:", palmpesaResp);

    if (!isPalmpesaSuccess(palmpesaResp)) {
      await db.ref(`checkoutSessions/${orderId}`).update({ status: "palmpesa_error", palmpesa: palmpesaResp });
      await db.ref(`userPayments/${uid}/${orderId}`).update({
        status: "failed",
        updatedAt: Date.now(),
        palmpesa: palmpesaResp,
      });
      return res.status(502).json({
        error: palmpesaResp?.message || palmpesaResp?.error || "PalmPesa order creation failed.",
        details: palmpesaResp,
      });
    }

    await db.ref(`checkoutSessions/${orderId}`).update({
      status: "awaiting_payment",
      palmpesaReference: palmpesaResp?.order_id ?? null,
    });

    if (palmpesaResp?.order_id) {
      await db.ref(`checkoutSessions/${palmpesaResp.order_id}`).set({
        aliasFor: orderId,
        uid,
        betslipId,
        amount,
        currency
      });
    }

    res.json({ orderId, message: palmpesaResp?.message || "Payment initiated. Check your phone." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.post("/api/palmpesa/webhook", async (req, res) => {
  try {
    const admin = getAdmin();
    const body = req.body || {};
    console.log("Webhook Received:", body);

    let orderId = body.order_id || body.orderId;
    let transid = body.transid;
    let reference = body.reference;
    let payment_status = body.payment_status;

    if (body.data && Array.isArray(body.data) && body.data.length > 0) {
      const item = body.data[0];
      orderId = orderId || item.order_id || item.orderId;
      transid = transid || item.transid;
      reference = reference || item.reference;
      payment_status = payment_status || item.payment_status;
    }

    if (!orderId && !transid) {
      return res.status(400).send("missing ids");
    }

    const db = admin.database();
    const key = orderId || transid;
    let sessionSnap = await db.ref(`checkoutSessions/${key}`).get();
    if (!sessionSnap.exists()) {
      return res.status(404).send("unknown session");
    }

    let session = sessionSnap.val();
    console.log("Session Found:", session);

    let actualOrderId = key;
    if (session.aliasFor) {
      actualOrderId = session.aliasFor;
      sessionSnap = await db.ref(`checkoutSessions/${actualOrderId}`).get();
      session = sessionSnap.val();
      console.log("Resolved Actual OrderId:", actualOrderId);
    }
    const ok = paymentSuccess(body);
    console.log("Payment Success Check:", ok);

    await db.ref(`checkoutSessions/${actualOrderId}`).update({
      status: ok ? "completed" : "failed",
      webhookAt: Date.now(),
      reference: reference ?? null,
      payment_status: payment_status ?? null,
      transid: transid ?? null,
    });

    await db.ref(`userPayments/${session.uid}/${actualOrderId}`).update({
      status: ok ? "completed" : "failed",
      updatedAt: Date.now(),
      reference: reference ?? null,
      payment_status: payment_status ?? null,
      palmpesaTransid: transid ?? null,
    });

    if (ok) {
      await db.ref(`purchases/${session.uid}/${session.betslipId}`).set({
        status: "completed",
        paidAt: Date.now(),
        amount: session.amount,
        orderId: actualOrderId,
        reference: reference ?? null,
      });
    }

    return res.status(200).send("ok");
  } catch (e) {
    console.error(e);
    return res.status(500).send("error");
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Betslips API listening on http://127.0.0.1:${PORT}`);
  });
}

export default app;
