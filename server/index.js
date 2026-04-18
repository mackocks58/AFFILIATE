import "dotenv/config";
import express from "express";
import cors from "cors";
import { getAdmin } from "./firebaseAdmin.js";
import { createSelcomOrderMinimal, extractGatewayUrl, isSelcomSuccess } from "./selcom.js";
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

    const vendor = process.env.SELCOM_VENDOR_ID;
    const apiKey = process.env.SELCOM_API_KEY;
    const apiSecret = process.env.SELCOM_API_SECRET;
    if (!vendor || !apiKey || !apiSecret) {
      return res.status(500).json({ error: "Selcom is not configured on the server." });
    }

    const publicBase = process.env.PUBLIC_APP_URL || "http://localhost:5173";
    const redirectUrl = `${publicBase.replace(/\/$/, "")}/payment/return`;
    const cancelUrl = `${publicBase.replace(/\/$/, "")}/payment/cancel`;
    const webhookUrl = `${process.env.SELCOM_WEBHOOK_PUBLIC_URL || publicBase}/api/selcom/webhook`;

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

    const selcomResp = await createSelcomOrderMinimal({
      vendor,
      apiKey,
      apiSecret,
      live: String(process.env.SELCOM_LIVE).toLowerCase() === "true",
      orderId,
      buyerEmail: String(buyer.email).trim(),
      buyerName: String(buyer.name).trim(),
      buyerPhone: String(buyer.phone).trim(),
      amount,
      currency,
      redirectUrl,
      cancelUrl,
      webhookUrl,
      expiryMinutes: Number(process.env.SELCOM_PAYMENT_EXPIRY_MINUTES || 60),
      colors: {
        header: process.env.SELCOM_HEADER_COLOR || "#0b1220",
        link: process.env.SELCOM_LINK_COLOR || "#7dd3fc",
        button: process.env.SELCOM_BUTTON_COLOR || "#34d399",
      },
    });

    if (!isSelcomSuccess(selcomResp)) {
      await db.ref(`checkoutSessions/${orderId}`).update({ status: "selcom_error", selcom: selcomResp });
      await db.ref(`userPayments/${uid}/${orderId}`).update({
        status: "failed",
        updatedAt: Date.now(),
        selcom: selcomResp,
      });
      return res.status(502).json({
        error: selcomResp?.message || "Selcom order creation failed.",
        details: selcomResp,
      });
    }

    const paymentUrl = extractGatewayUrl(selcomResp);
    if (!paymentUrl) {
      return res.status(502).json({ error: "Selcom did not return a payment URL.", details: selcomResp });
    }

    await db.ref(`checkoutSessions/${orderId}`).update({
      status: "awaiting_payment",
      paymentUrl,
      selcomReference: selcomResp?.reference ?? null,
    });

    res.json({ orderId, paymentUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.post("/api/selcom/webhook", async (req, res) => {
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
      selcomTransid: transid ?? null,
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
