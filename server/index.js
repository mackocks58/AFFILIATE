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
  const status = String(payload?.payment_status ?? "").toUpperCase();
  const result = String(payload?.result ?? "").toUpperCase();
  const code = String(payload?.resultcode ?? "");
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

    const palmpesaResp = await createPalmpesaOrder({
      userId,
      vendor,
      apiKey,
      orderId,
      buyerEmail: String(buyer.email).trim(),
      buyerName: String(buyer.name).trim(),
      buyerPhone: String(buyer.phone).trim(),
      amount,
      currency,
      redirectUrl,
      cancelUrl,
      webhookUrl,
    });

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

    const paymentUrl = extractPalmpesaUrl(palmpesaResp);
    if (!paymentUrl) {
      return res.status(502).json({ error: "PalmPesa did not return a payment URL.", details: palmpesaResp });
    }

    await db.ref(`checkoutSessions/${orderId}`).update({
      status: "awaiting_payment",
      paymentUrl,
      palmpesaReference: palmpesaResp?.reference ?? null,
    });

    res.json({ orderId, paymentUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.post("/api/palmpesa/webhook", async (req, res) => {
  try {
    const admin = getAdmin();
    const body = req.body || {};
    const orderId = body.order_id || body.orderId;
    const transid = body.transid;
    const reference = body.reference;
    const payment_status = body.payment_status;

    if (!orderId && !transid) {
      return res.status(400).send("missing ids");
    }

    const db = admin.database();
    const key = orderId || transid;
    const sessionSnap = await db.ref(`checkoutSessions/${key}`).get();
    if (!sessionSnap.exists()) {
      return res.status(404).send("unknown session");
    }

    const session = sessionSnap.val();
    const ok = paymentSuccess({ payment_status, result: body.result, resultcode: body.resultcode });

    await db.ref(`checkoutSessions/${key}`).update({
      status: ok ? "completed" : "failed",
      webhookAt: Date.now(),
      reference: reference ?? null,
      payment_status: payment_status ?? null,
      transid: transid ?? null,
    });

    await db.ref(`userPayments/${session.uid}/${key}`).update({
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
        orderId: key,
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
