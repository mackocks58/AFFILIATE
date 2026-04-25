import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Shell } from "@/components/Shell";
import { ref, onValue, push, set } from "firebase/database";
import { auth, db } from "@/firebase";
import { apiUrl } from "@/lib/apiBase";

export default function Bundle() {
  const { user, userData } = useAuth();
  
  const [sliderImages, setSliderImages] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState("");
  
  // Payment Details
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [paymentState, setPaymentState] = useState<"idle" | "processing" | "paid" | "submitted">("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [countdown, setCountdown] = useState(300);
  const [paymentReference, setPaymentReference] = useState("");
  const [orderId, setOrderId] = useState("");

  const [targetPhone, setTargetPhone] = useState("");
  const [targetPin, setTargetPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTanzania = userData?.country === "Tanzania";

  useEffect(() => {
    const sRef = ref(db, "bundles/slider");
    const unsubS = onValue(sRef, (snap) => {
      if (snap.exists()) {
        setSliderImages(Object.entries(snap.val()).map(([id, v]) => ({ id, ...(v as any) })));
      } else {
        setSliderImages([]);
      }
    });

    const pRef = ref(db, "bundles/packages");
    const unsubP = onValue(pRef, (snap) => {
      if (snap.exists()) {
        setPackages(Object.entries(snap.val()).map(([id, v]) => ({ id, ...(v as any) })));
      } else {
        setPackages([]);
      }
    });

    return () => {
      unsubS();
      unsubP();
    };
  }, []);

  useEffect(() => {
    if (sliderImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [sliderImages]);

  useEffect(() => {
    let timer: any;
    if (paymentState === "processing" && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [paymentState, countdown]);

  const handlePurchaseClick = () => {
    setShowPurchaseModal(true);
    setPaymentState("idle");
    setPaymentMessage("");
    setTargetPhone("");
    setTargetPin("");
    
    // Auto-fill if available
    const dn = userData?.displayName?.trim() || user?.displayName?.trim();
    if (dn && dn.split(/\s+/).length >= 2) setBuyerName(dn);
    if (userData?.phone) setBuyerPhone(userData.phone);
  };

  const handlePayClick = async () => {
    if (!selectedPkgId || !buyerName || !buyerPhone) return;
    setPaymentState("processing");
    setCountdown(300);
    setPaymentMessage("");

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(apiUrl("/api/checkout/init"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: token,
          bundleId: selectedPkgId,
          buyer: {
            name: buyerName,
            email: userData?.email || user?.email || "user@eaglestar.com",
            phone: buyerPhone
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate payment");

      if (data.paymentReference) setPaymentReference(data.paymentReference);
      setOrderId(data.orderId);

      let pollCount = 0;
      const maxPolls = 75; // 300s / 4s
      const pollInterval = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
          setPaymentState("idle");
          setPaymentMessage("Payment verification timed out. Please try again.");
          return;
        }
        try {
          const checkRes = await fetch(apiUrl(`/api/checkout/status/${data.orderId}`));
          if (!checkRes.ok) return;
          const checkData = await checkRes.json();
          if (checkData.status === "completed") {
            clearInterval(pollInterval);
            setPaymentState("paid");
          } else if (checkData.status === "failed") {
            clearInterval(pollInterval);
            setPaymentState("idle");
            setPaymentMessage("Payment failed. Please try again.");
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 4000);

    } catch (e: any) {
      setPaymentState("idle");
      setPaymentMessage(e.message || "Error");
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPhone || !targetPin) return;
    setIsSubmitting(true);
    try {
      const pkg = packages.find(p => p.id === selectedPkgId);
      if (!pkg) throw new Error("Package not found");

      const reqRef = push(ref(db, "bundleRequests"));
      await set(reqRef, {
        uid: user?.uid,
        bundleId: selectedPkgId,
        packageAmount: pkg.amount,
        packageDetails: pkg.description,
        targetPhone,
        targetPin,
        status: "pending",
        orderId,
        createdAt: Date.now()
      });
      setPaymentState("submitted");
    } catch (e: any) {
      alert("Error submitting request: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!isTanzania) {
    return (
      <Shell>
        <h1 className="page-title">Promotions 🎁</h1>
        <div className="card">
          <div className="card-body">
            <div className="alert">This page is for Tanzanian users only.</div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="page-title">Promotions 🎁</h1>

      {sliderImages.length > 0 && (
        <div className="card" style={{ marginBottom: 20, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "relative", width: "100%", height: 250 }}>
            {sliderImages.map((s, idx) => (
              <div 
                key={s.id} 
                style={{ 
                  position: "absolute", 
                  top: 0, left: 0, right: 0, bottom: 0, 
                  opacity: idx === currentSlide ? 1 : 0, 
                  transition: "opacity 0.5s ease-in-out" 
                }}
              >
                <img src={s.imageUrl} alt="Promotion" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", padding: "12px 16px" }}>
                  <p style={{ margin: 0, color: "#fff", fontWeight: 500 }}>{s.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ textAlign: "center" }}>
        <div className="card-body">
          <h2 style={{ color: "var(--accent)" }}>Get Your Data Bundle Now!</h2>
          <p className="muted" style={{ marginBottom: 20 }}>Select and purchase amazing bundle packages with special offers.</p>
          <button 
            className="btn breathe" 
            style={{ padding: "16px 32px", fontSize: 18, background: "linear-gradient(135deg, #38bdf8, #818cf8)", border: "none", color: "#000", fontWeight: "bold" }}
            onClick={handlePurchaseClick}
          >
            Purchase Bundle
          </button>
        </div>
      </div>

      {showPurchaseModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
          <div className="card" style={{ maxWidth: 450, width: "100%", background: "#050816", border: "1px solid var(--accent)" }}>
            <div className="card-body">
              
              {paymentState === "idle" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h2 style={{ margin: 0, color: "var(--accent)" }}>Select Package</h2>
                    <button onClick={() => setShowPurchaseModal(false)} style={{ background: "transparent", border: "none", color: "var(--text)", cursor: "pointer", fontSize: 24 }}>&times;</button>
                  </div>
                  
                  {paymentMessage && <div className="alert">{paymentMessage}</div>}

                  <div className="field" style={{ marginBottom: 16 }}>
                    <label>Choose Bundle</label>
                    <select className="select" value={selectedPkgId} onChange={e => setSelectedPkgId(e.target.value)}>
                      <option value="">-- Select --</option>
                      {packages.map(p => (
                        <option key={p.id} value={p.id}>{p.amount} TZS : {p.description}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field" style={{ marginBottom: 16 }}>
                    <label>Full Name (Two words minimum)</label>
                    <input className="input" placeholder="e.g. John Doe" value={buyerName} onChange={e => setBuyerName(e.target.value)} />
                  </div>

                  <div className="field" style={{ marginBottom: 20 }}>
                    <label>Phone Number (to pay with)</label>
                    <input type="tel" className="input" placeholder="e.g. 07XXXXXXXX" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} />
                  </div>

                  <button 
                    className="btn" 
                    style={{ width: "100%", padding: 16, background: "#10b981", color: "#000", fontWeight: "bold" }}
                    disabled={!selectedPkgId || !buyerName || !buyerPhone}
                    onClick={handlePayClick}
                  >
                    Pay Automatically
                  </button>
                </>
              )}

              {paymentState === "processing" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <h2 style={{ margin: "0 0 16px", color: "#10b981" }}>Processing Payment</h2>
                  <div className="alert info" style={{ marginBottom: 20 }}>
                    A payment prompt has been sent to your phone. Please approve it.
                  </div>
                  {paymentReference && (
                    <div style={{ marginBottom: 20, padding: 12, background: "rgba(16,185,129,0.1)", borderRadius: 8, border: "1px dashed rgba(16,185,129,0.5)" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 13 }}>Reference Number:</p>
                      <strong style={{ fontSize: 18, color: "#10b981", letterSpacing: 1 }}>{paymentReference}</strong>
                    </div>
                  )}
                  <div style={{ background: "rgba(5, 8, 22, 0.4)", padding: "15px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Time Remaining</div>
                    <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "monospace", color: countdown < 60 ? "#ef4444" : "#e2e8f0" }}>
                      {formatTime(countdown)}
                    </div>
                  </div>
                </div>
              )}

              {paymentState === "paid" && (
                <form onSubmit={handleSubmitRequest}>
                  <h2 style={{ margin: "0 0 16px", color: "#10b981" }}>Payment Successful!</h2>
                  <div className="alert warning" style={{ marginBottom: 20 }}>
                    <strong>Warning!</strong> Please ensure the phone number and PIN below are absolutely correct. We are not responsible for bundles sent to the wrong number.
                  </div>
                  <div className="field" style={{ marginBottom: 16 }}>
                    <label>Target Phone Number</label>
                    <input type="tel" className="input" placeholder="e.g. 07XXXXXXXX" value={targetPhone} onChange={e => setTargetPhone(e.target.value)} required />
                  </div>
                  <div className="field" style={{ marginBottom: 24 }}>
                    <label>PIN Code</label>
                    <input type="password" className="input" placeholder="Enter PIN" value={targetPin} onChange={e => setTargetPin(e.target.value)} required />
                  </div>
                  <button 
                    type="submit" 
                    className="btn" 
                    style={{ width: "100%", padding: 16, background: "linear-gradient(135deg, #38bdf8, #818cf8)", border: "none", color: "#000", fontWeight: "bold" }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Bundle Request"}
                  </button>
                </form>
              )}

              {paymentState === "submitted" && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>✅🎊🎉</div>
                  <h2 style={{ margin: "0 0 16px", color: "#10b981" }}>your bandle request has completde successfull ✅🎊🎉</h2>
                  <p className="muted" style={{ marginBottom: 24 }}>An admin will process your request shortly.</p>
                  <button 
                    className="btn btn-ghost" 
                    style={{ width: "100%" }}
                    onClick={() => setShowPurchaseModal(false)}
                  >
                    Close
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </Shell>
  );
}
