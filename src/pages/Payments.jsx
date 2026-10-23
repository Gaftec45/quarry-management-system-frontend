import { useEffect, useState } from "react";
import api from "../lib/api";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("/sales/payments");
        setPayments(response.data.payments || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load payments.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="page-container">
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Payments</h2>
          {loading ? <p>Loading...</p> : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead><tr><th>Reference</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}><td>{payment.paymentReference}</td><td>{payment.customer?.name || "—"}</td><td>{payment.amount} {payment.currency}</td><td>{payment.status}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
