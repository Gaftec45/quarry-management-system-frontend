import { useEffect, useState } from "react";
import api from "../lib/api";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("/sales/invoices");
        setInvoices(response.data.invoices || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load invoices.");
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
          <h2 className="h5 mb-3">Invoices</h2>
          {loading ? <p>Loading...</p> : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead><tr><th>Invoice</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice._id}><td>{invoice.invoiceNumber}</td><td>{invoice.customer?.name || "—"}</td><td>{invoice.status}</td><td>{invoice.total} {invoice.currency}</td></tr>
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
