import { useState, useEffect } from "react";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { db } from "@/firebase";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";

export function AdminBundle() {
  const [tab, setTab] = useState<"slider" | "packages" | "requests">("requests");

  // Slider
  const [sliderImages, setSliderImages] = useState<any[]>([]);
  const [sliderFile, setSliderFile] = useState<File | null>(null);
  const [sliderMessage, setSliderMessage] = useState("");
  const [busySlider, setBusySlider] = useState(false);

  // Packages
  const [packages, setPackages] = useState<any[]>([]);
  const [pkgAmount, setPkgAmount] = useState("");
  const [pkgDetails, setPkgDetails] = useState("");
  const [busyPkg, setBusyPkg] = useState(false);

  // Requests
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const sRef = ref(db, "bundles/slider");
    const unsubS = onValue(sRef, (snap) => {
      const data = snap.val();
      if (data) {
        setSliderImages(Object.entries(data).map(([id, val]) => ({ id, ...(val as any) })));
      } else {
        setSliderImages([]);
      }
    });

    const pRef = ref(db, "bundles/packages");
    const unsubP = onValue(pRef, (snap) => {
      const data = snap.val();
      if (data) {
        setPackages(Object.entries(data).map(([id, val]) => ({ id, ...(val as any) })));
      } else {
        setPackages([]);
      }
    });

    const rRef = ref(db, "bundleRequests");
    const unsubR = onValue(rRef, (snap) => {
      const data = snap.val();
      if (data) {
        setRequests(Object.entries(data).map(([id, val]) => ({ id, ...(val as any) })).sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setRequests([]);
      }
    });

    return () => {
      unsubS();
      unsubP();
      unsubR();
    };
  }, []);

  async function addSliderImage(e: React.FormEvent) {
    e.preventDefault();
    if (!sliderFile) return;
    setBusySlider(true);
    try {
      const reader = new FileReader();
      const imageUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(sliderFile);
      });

      const newRef = push(ref(db, "bundles/slider"));
      await set(newRef, {
        imageUrl,
        message: sliderMessage,
        createdAt: Date.now()
      });
      setSliderFile(null);
      setSliderMessage("");
    } catch (e) {
      alert(getFriendlyErrorMessage(e, "Failed to upload slider image"));
    } finally {
      setBusySlider(false);
    }
  }

  async function deleteSliderImage(id: string) {
    if (!confirm("Delete this slider image?")) return;
    try {
      await remove(ref(db, `bundles/slider/${id}`));
    } catch (e) {
      alert(getFriendlyErrorMessage(e, "Failed to delete slider image"));
    }
  }

  async function addPackage(e: React.FormEvent) {
    e.preventDefault();
    if (!pkgAmount || !pkgDetails) return;
    setBusyPkg(true);
    try {
      const newRef = push(ref(db, "bundles/packages"));
      await set(newRef, {
        amount: Number(pkgAmount),
        description: pkgDetails,
        currency: "TZS",
        createdAt: Date.now()
      });
      setPkgAmount("");
      setPkgDetails("");
    } catch (e) {
      alert(getFriendlyErrorMessage(e, "Failed to add package"));
    } finally {
      setBusyPkg(false);
    }
  }

  async function deletePackage(id: string) {
    if (!confirm("Delete this package?")) return;
    try {
      await remove(ref(db, `bundles/packages/${id}`));
    } catch (e) {
      alert(getFriendlyErrorMessage(e, "Failed to delete package"));
    }
  }

  async function completeRequest(id: string) {
    if (!confirm("Mark this request as completed?")) return;
    try {
      await update(ref(db, `bundleRequests/${id}`), {
        status: "completed",
        completedAt: Date.now()
      });
    } catch (e) {
      alert(getFriendlyErrorMessage(e, "Failed to complete request"));
    }
  }

  return (
    <div>
      <div className="row" style={{ gap: 8, marginBottom: 20 }}>
        <button className={`btn ${tab === "requests" ? "" : "btn-ghost"}`} onClick={() => setTab("requests")}>Requests</button>
        <button className={`btn ${tab === "packages" ? "" : "btn-ghost"}`} onClick={() => setTab("packages")}>Packages</button>
        <button className={`btn ${tab === "slider" ? "" : "btn-ghost"}`} onClick={() => setTab("slider")}>Slider Images</button>
      </div>

      {tab === "requests" && (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Bundle</th>
                  <th>Target Phone</th>
                  <th>Target PIN</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.uid}</td>
                    <td>{r.packageAmount} TZS - {r.packageDetails}</td>
                    <td><strong style={{ color: "#38bdf8" }}>{r.targetPhone}</strong></td>
                    <td><strong style={{ color: "#f87171" }}>{r.targetPin}</strong></td>
                    <td>
                      {r.status === "pending" ? (
                        <span className="pill" style={{ background: "#f59e0b", color: "#fff" }}>Pending</span>
                      ) : (
                        <span className="pill" style={{ background: "#10b981", color: "#fff" }}>Completed</span>
                      )}
                    </td>
                    <td>
                      {r.status === "pending" && (
                        <button className="btn" style={{ background: "#10b981", color: "#000" }} onClick={() => completeRequest(r.id)}>Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">No requests yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "packages" && (
        <div className="split">
          <div className="card">
            <div className="card-body">
              <h2>Add Bundle Package</h2>
              <form className="grid" style={{ gap: 12 }} onSubmit={addPackage}>
                <div className="field">
                  <label>Amount (TZS)</label>
                  <input type="number" className="input" value={pkgAmount} onChange={e => setPkgAmount(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Details (e.g. 11GB halotel)</label>
                  <input type="text" className="input" value={pkgDetails} onChange={e => setPkgDetails(e.target.value)} required />
                </div>
                <button type="submit" className="btn" disabled={busyPkg}>Add Package</button>
              </form>
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Details</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map(p => (
                    <tr key={p.id}>
                      <td>{p.amount} TZS</td>
                      <td>{p.description}</td>
                      <td><button className="btn btn-danger" onClick={() => deletePackage(p.id)}>Delete</button></td>
                    </tr>
                  ))}
                  {packages.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">No packages.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "slider" && (
        <div className="split">
          <div className="card">
            <div className="card-body">
              <h2>Add Slider Image</h2>
              <form className="grid" style={{ gap: 12 }} onSubmit={addSliderImage}>
                <div className="field">
                  <label>Image</label>
                  <input type="file" accept="image/*" className="input" onChange={e => setSliderFile(e.target.files?.[0] || null)} required />
                </div>
                <div className="field">
                  <label>Detail Message</label>
                  <textarea className="textarea" value={sliderMessage} onChange={e => setSliderMessage(e.target.value)} required />
                </div>
                <button type="submit" className="btn" disabled={busySlider}>Upload Image</button>
              </form>
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Message</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sliderImages.map(s => (
                    <tr key={s.id}>
                      <td><img src={s.imageUrl} alt="" style={{ width: 80, height: 50, objectFit: "cover", borderRadius: 8 }} /></td>
                      <td>{s.message}</td>
                      <td><button className="btn btn-danger" onClick={() => deleteSliderImage(s.id)}>Delete</button></td>
                    </tr>
                  ))}
                  {sliderImages.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">No slider images.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
