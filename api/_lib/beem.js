export async function sendSMS(phones, message) {
  try {
    const apiKey = process.env.BEEM_API_KEY;
    const secretKey = process.env.BEEM_SECRET_KEY;
    
    if (!apiKey || !secretKey) {
      console.warn("Beem SMS is not configured.");
      return { success: false, submitted: 0, message: "Not configured" };
    }

    const phoneArray = Array.isArray(phones) ? phones : [phones];
    const recipients = phoneArray
      .filter(p => p)
      .map((p, i) => {
        let clean = String(p).replace(/\D/g, "");
        if (clean.startsWith("0")) {
          clean = "255" + clean.slice(1);
        }
        return { recipient_id: i + 1, dest_addr: clean };
      });

    if (recipients.length === 0) {
      return { success: false, submitted: 0, message: "No valid phones" };
    }

    const authHeader = "Basic " + Buffer.from(apiKey + ":" + secretKey).toString("base64");

    const response = await fetch("https://apisms.beem.africa/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader
      },
      body: JSON.stringify({
        source_addr: "EAGLE STAR",
        schedule_time: "",
        encoding: 0,
        message: message,
        recipients: recipients
      })
    });

    const data = await response.json();
    console.log("Beem SMS sent to", recipients.length, "recipients. Response:", data);
    
    // Check if Beem returned success code 100
    if (data && data.code === 100) {
        return { success: true, submitted: recipients.length, data };
    } else {
        return { success: false, submitted: 0, data };
    }
  } catch (error) {
    console.error("Beem SMS error:", error);
    return { success: false, submitted: 0, error: error.message };
  }
}
