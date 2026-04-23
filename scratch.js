/**
 * Full end-to-end simulation of the activation checkout flow.
 * Shows exactly what PalmPesa receives and what it responds.
 * Run: node -r dotenv/config scratch.js
 */
import { getAdmin } from "./api/_lib/firebaseAdmin.js";
import fetch from "node-fetch";

// ── CONFIG: change these to match a real test user ──────────────────────────
const TEST_UID = "IrNRcBCGAFMbZIxABv4BmbMIhf43";  // from earlier DB inspection
// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  const apiKey  = process.env.PALMPESA_API_KEY;
  const userId  = process.env.PALMPESA_USER_ID;
  const vendor  = process.env.PALMPESA_VENDOR;

  if (!apiKey || !userId) {
    console.error("❌ Missing PALMPESA_API_KEY or PALMPESA_USER_ID in .env");
    process.exit(1);
  }

  // 1) Pull user data from Firebase to see what name/email/phone we have
  const admin = getAdmin();
  const db = admin.database();
  const userSnap = await db.ref(`users/${TEST_UID}`).get();
  if (!userSnap.exists()) {
    console.error("❌ User not found in DB:", TEST_UID);
    process.exit(1);
  }
  const userData = userSnap.val();
  console.log("👤 User data in DB:");
  console.log("  displayName:", userData.displayName);
  console.log("  email      :", userData.email);
  console.log("  phone      :", userData.phone);
  console.log("  country    :", userData.country);
  console.log("  status     :", userData.status);
  console.log("  referredBy :", userData.referredBy);

  // 2) Determine what name the frontend would send
  const displayName = userData.displayName || "";
  const hasTwoWords = displayName.trim().split(/\s+/).length >= 2;
  const buyerName = hasTwoWords ? displayName : "Eagle Star User";
  const buyerEmail = userData.email || "user@example.com";
  const buyerPhone = userData.phone || "255700000000"; // <-- this is critical

  console.log("\n📤 Would send to PalmPesa:");
  console.log("  name  :", buyerName);
  console.log("  email :", buyerEmail);
  console.log("  phone :", buyerPhone);

  // 3) Format phone the same way the backend does
  let phone = String(buyerPhone).replace(/\s+/g, "").replace(/^\+/, "");
  if (phone.startsWith("0")) {
    phone = "255" + phone.substring(1);
  } else if (!phone.startsWith("255")) {
    phone = "255" + phone;
  }
  console.log("  phone (formatted):", phone);

  // 4) Check name validation
  const nameParts = String(buyerName).trim().split(/\s+/);
  if (nameParts.length < 2) {
    console.error("\n❌ NAME VALIDATION WILL FAIL: less than 2 words →", buyerName);
    console.error("  The frontend needs to collect the user's full name.");
    process.exit(1);
  }
  console.log("\n✅ Name validation OK:", buyerName);

  // 5) Make the actual PalmPesa request
  const orderId = "DRYRUN" + Date.now();
  const body = {
    user_id: userId,
    vendor,
    name: buyerName,
    email: buyerEmail,
    phone,
    amount: 500,
    transaction_id: orderId,
    address: "Tanzania",
    postcode: "00000",
    callback_url: "https://eagle-star.onrender.com/api/palmpesa/webhook",
  };

  console.log("\n📡 Calling PalmPesa initiate with:");
  console.log(JSON.stringify(body, null, 2));

  const response = await fetch("https://palmpesa.drmlelwa.co.tz/api/palmpesa/initiate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  console.log("\n📨 PalmPesa HTTP Status:", response.status);
  console.log("📨 PalmPesa Response:", text);

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
