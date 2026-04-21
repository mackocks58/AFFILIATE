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

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error("JSON Parsing Error:", err.message);
    return res.status(400).send("Invalid JSON payload");
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

function generateOrderId() {
  const prefix = (process.env.SELCOM_ORDER_PREFIX || "BS").toUpperCase();
  return `${prefix}${Date.now()}${crypto.randomInt(1000, 9999)}`;
}

function paymentSuccess(payload) {
  const getVal = (obj, keys) => {
    if (!obj) return "";
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) return String(obj[key]).toUpperCase();
    }
    return "";
  };

  const statusKeys = ["payment_status", "status", "state", "payment_state"];
  const resultKeys = ["result", "result_text", "result_message", "message"];
  const codeKeys = ["resultcode", "res_code", "result_code", "code", "status_code"];

  let status = getVal(payload, statusKeys);
  let result = getVal(payload, resultKeys);
  let code = getVal(payload, codeKeys);

  if (payload?.data && Array.isArray(payload.data) && payload.data.length > 0) {
    const item = payload.data[0];
    status = status || getVal(item, statusKeys);
    result = result || getVal(item, resultKeys);
    code = code || getVal(item, codeKeys);
  }

  console.log("Success Check - Status:", status, "Result:", result, "Code:", code);

  const successValues = ["COMPLETED", "SUCCESS", "PAID", "DONE", "OK", "000", "00", "0"];
  
  return (
    successValues.includes(status) ||
    successValues.includes(result) ||
    successValues.includes(code) ||
    status.includes("SUCCESS") ||
    result.includes("SUCCESS") ||
    status.includes("COMPLETED") ||
    result.includes("COMPLETED")
  );
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

    const reqProtocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
    const dynamicBase = `${reqProtocol}://${reqHost}`;
    
    // Priority: 1. SELCOM_WEBHOOK_PUBLIC_URL, 2. VITE_API_BASE_URL, 3. dynamic host, 4. PUBLIC_APP_URL
    const webhookBase = process.env.SELCOM_WEBHOOK_PUBLIC_URL || process.env.VITE_API_BASE_URL || dynamicBase || process.env.PUBLIC_APP_URL;
    const webhookUrl = `${webhookBase.replace(/\/$/, "")}/api/palmpesa/webhook`;

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

app.all("/api/palmpesa/webhook", async (req, res) => {
  try {
    const admin = getAdmin();
    // Combine req.body and req.query in case they send via GET
    const body = { ...(req.query || {}), ...(req.body || {}) };
    console.log("--- Webhook Received ---");
    console.log(JSON.stringify(body, null, 2));

    const db = admin.database();
    
    // Save the raw webhook to the database for debugging
    const logId = `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await db.ref(`webhookLogs/${logId}`).set({
      receivedAt: Date.now(),
      payload: body
    });

    let orderId = body.order_id || body.orderId || body.transaction_id || body.transactionId;
    let transid = body.transid || body.transaction_id;
    let reference = body.reference || body.ref || body.payment_reference;
    let payment_status = body.payment_status || body.status;

    if (body.data && Array.isArray(body.data) && body.data.length > 0) {
      const item = body.data[0];
      orderId = orderId || item.order_id || item.orderId || item.transaction_id || item.transactionId;
      transid = transid || item.transid || item.transaction_id;
      reference = reference || item.reference || item.ref || item.payment_reference;
      payment_status = payment_status || item.payment_status || item.status;
    }

    console.log("Resolved IDs - orderId:", orderId, "transid:", transid);

    if (!orderId && !transid) {
      console.error("Webhook error: No identifying IDs found in payload.");
      return res.status(400).send("missing ids");
    }

    const lookupKey = orderId || transid;
    let sessionSnap = await db.ref(`checkoutSessions/${lookupKey}`).get();
    
    if (!sessionSnap.exists()) {
      console.error(`Webhook error: Unknown session for key ${lookupKey}`);
      return res.status(404).send("unknown session");
    }

    let session = sessionSnap.val();
    let actualOrderId = lookupKey;

    if (session.aliasFor) {
      actualOrderId = session.aliasFor;
      console.log("Alias found. Resolving to actual orderId:", actualOrderId);
      sessionSnap = await db.ref(`checkoutSessions/${actualOrderId}`).get();
      if (!sessionSnap.exists()) {
        console.error(`Webhook error: Alias points to non-existent session ${actualOrderId}`);
        return res.status(404).send("actual session not found");
      }
      session = sessionSnap.val();
    }

    const ok = paymentSuccess(body);
    console.log("Payment Success result:", ok);

    const updatePayload = {
      status: ok ? "completed" : "failed",
      webhookAt: Date.now(),
      reference: reference ?? null,
      payment_status: payment_status ?? null,
      transid: transid ?? null,
      raw_webhook: body
    };

    // Update checkout session
    await db.ref(`checkoutSessions/${actualOrderId}`).update(updatePayload);

    // Update user's payment record if UID is available
    if (session.uid) {
      await db.ref(`userPayments/${session.uid}/${actualOrderId}`).update({
        status: ok ? "completed" : "failed",
        updatedAt: Date.now(),
        reference: reference ?? null,
        payment_status: payment_status ?? null,
        palmpesaTransid: transid ?? null,
      });

      // If successful, create the purchase record
      if (ok && session.betslipId) {
        await db.ref(`purchases/${session.uid}/${session.betslipId}`).set({
          status: "completed",
          paidAt: Date.now(),
          amount: session.amount || 0,
          orderId: actualOrderId,
          reference: reference ?? null,
        });
        console.log(`Purchase completed for user ${session.uid}, betslip ${session.betslipId}`);
      }
    } else {
      console.warn("No UID found in session. Could not update userPayments or purchases.");
    }

    return res.status(200).send("ok");
  } catch (e) {
    console.error("Webhook processing error:", e);
    return res.status(500).send("error");
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Betslips API listening on http://127.0.0.1:${PORT}`);
  });
}

export default app;
