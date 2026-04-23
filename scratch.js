import "dotenv/config";
import fetch from "node-fetch";

async function run() {
  const apiKey = process.env.PALMPESA_API_KEY;
  const userId = process.env.PALMPESA_USER_ID;
  const vendor = process.env.PALMPESA_VENDOR;

  const url = "https://palmpesa.drmlelwa.co.tz/api/palmpesa/initiate";
  const body = {
    user_id: userId,
    vendor: vendor,
    name: "Test User",
    email: "test@example.com",
    phone: "255755123456",
    amount: 500,
    transaction_id: "TEST" + Date.now(),
    address: "Tanzania",
    postcode: "00000",
    callback_url: "https://example.com",
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

  const initData = await response.json();
  console.log("Initiate:", initData);

  if (initData.order_id) {
    const statusUrl = "https://palmpesa.drmlelwa.co.tz/api/order-status";
    const statusBody = { order_id: initData.order_id };
    const statusResponse = await fetch(statusUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(statusBody),
    });
    const statusData = await statusResponse.json();
    console.log("Status:", JSON.stringify(statusData, null, 2));
  }
}
run();
