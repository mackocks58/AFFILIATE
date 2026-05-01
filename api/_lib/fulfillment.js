import { sendSMS } from "./beem.js";

export async function processFulfillment(db, session, actualOrderId, reference) {
  if (!session || !session.uid) return false;

  const uid = session.uid;

  try {
    // Fetch user details to get the phone number and name
    let userPhone = null;
    let userName = "User";
    try {
      const uSnap = await db.ref(`users/${uid}`).get();
      if (uSnap.exists()) {
        const uVal = uSnap.val();
        userPhone = uVal.phone;
        userName = uVal.username || uVal.displayName || "User";
      }
    } catch (e) {
      console.error("Error fetching user details for SMS:", e);
    }

    if (session.betslipId) {
      await db.ref(`purchases/${uid}/${session.betslipId}`).set({
        status: "completed",
        paidAt: Date.now(),
        amount: session.amount || 0,
        orderId: actualOrderId,
        reference: reference ?? null,
      });
      console.log(`Purchase completed for user ${uid}, betslip ${session.betslipId}`);
      if (userPhone) {
        await sendSMS(userPhone, `Hello ${userName}, your payment of ${session.amount} for Betslip ${session.title || session.betslipId} was successful! Ref: ${reference || actualOrderId}. Thank you!`);
      }
      return true;
    } else if (session.movieGroupId) {
      await db.ref(`purchases/${uid}/movieGroups/${session.movieGroupId}`).set({
        status: "completed",
        paidAt: Date.now(),
        amount: session.amount || 0,
        orderId: actualOrderId,
        reference: reference ?? null,
      });
      console.log(`Purchase completed for user ${uid}, movie group ${session.movieGroupId}`);
      if (userPhone) {
        await sendSMS(userPhone, `Hello ${userName}, your payment of ${session.amount} for Movie Group access was successful! Ref: ${reference || actualOrderId}. Enjoy watching!`);
      }
      return true;
    } else if (session.bundleId) {
      await db.ref(`purchases/${uid}/bundles/${session.bundleId}_${actualOrderId}`).set({
        status: "completed",
        paidAt: Date.now(),
        amount: session.amount || 0,
        orderId: actualOrderId,
        reference: reference ?? null,
      });
      console.log(`Purchase completed for user ${uid}, bundle ${session.bundleId}`);
      if (userPhone) {
        await sendSMS(userPhone, `Hello ${userName}, your bundle payment of ${session.amount} was successful! Ref: ${reference || actualOrderId}. Thank you!`);
      }
      return true;
    } else if (session.activationPayment) {
      console.log(`Processing activation payment for ${uid}`);
      // First explicitly activate the user and wait for it
      await db.ref(`users/${uid}`).update({
        status: "active",
        activationDate: Date.now()
      });
      console.log(`User ${uid} successfully activated.`);
      if (userPhone) {
        await sendSMS(userPhone, `Hello ${userName}, your account activation payment of ${session.amount} was successful! Ref: ${reference || actualOrderId}. You are now an active member of EAGLE STAR.`);
      }

      // Distribute commissions
      try {
        const userSnap = await db.ref(`users/${uid}`).get();
        if (userSnap.exists()) {
          const userData = userSnap.val();
          let currentRefCode = userData.referredBy;
          const referralCountry = userData.country || "Tanzania";
          
          const percentages = [0.45, 0.15, 0.01]; // Level 1, 2, 3
          
          let exchangeRatesToTZS = { "Tanzania": 1, "Zambia": 0.0105, "Burundi": 1.15 };
          const ratesSnap = await db.ref("settings/exchangeRates").get();
          if (ratesSnap.exists()) {
            exchangeRatesToTZS = { ...exchangeRatesToTZS, ...ratesSnap.val() };
          }
          
          const referralRateToTZS = exchangeRatesToTZS[referralCountry] || 1;
          const amountInTZS = session.amount / referralRateToTZS;
          
          for (let level = 0; level < 3; level++) {
            if (!currentRefCode) break;
            
            const refQuery = await db.ref('users').orderByChild('affiliateCode').equalTo(currentRefCode).once('value');
            if (refQuery.exists()) {
              const refObj = refQuery.val();
              const referrerUid = Object.keys(refObj)[0];
              const referrerData = refObj[referrerUid];
              const referrerCountry = referrerData.country || "Tanzania";
              const referrerRateToTZS = exchangeRatesToTZS[referrerCountry] || 1;
              
              const commissionInTZS = amountInTZS * percentages[level];
              const commissionAmount = commissionInTZS * referrerRateToTZS;
              
              const currentBalance = Number(referrerData.balance || 0);
              const currentCommissionTotal = Number(referrerData.commissionTotal || 0);
              
              await db.ref(`users/${referrerUid}`).update({
                balance: currentBalance + commissionAmount,
                commissionTotal: currentCommissionTotal + commissionAmount
              });
              
              await db.ref(`commissions/${referrerUid}/${actualOrderId}_L${level+1}`).set({
                amount: commissionAmount,
                currency: referrerCountry === "Zambia" ? "ZMW" : referrerCountry === "Burundi" ? "BIF" : "TZS",
                fromUser: uid,
                level: level + 1,
                createdAt: Date.now()
              });
              
              currentRefCode = referrerData.referredBy; // move up to next level
            } else {
              break;
            }
          }
        }
      } catch (err) {
        console.error("Error distributing commissions:", err);
        // We still return true because activation succeeded
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error in processFulfillment:", error);
    return false;
  }
}
