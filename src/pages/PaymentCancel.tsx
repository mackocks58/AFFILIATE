import { Link } from "react-router-dom";
import { Shell } from "@/components/Shell";

export default function PaymentCancel() {
  return (
    <Shell>
      <h1 className="page-title">Payment cancelled</h1>
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="card-body">
          <p className="muted" style={{ marginTop: 0 }}>
            No charge was completed. You can return to the betslip and try again whenever you are ready.
          </p>
          <div className="row" style={{ marginTop: 12 }}>
            <Link className="btn" to="/">
              Back to betslips
            </Link>
            <Link className="btn btn-ghost" to="/payments">
              Payment history
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
