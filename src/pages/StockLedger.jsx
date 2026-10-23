import { useEffect, useState } from "react";
import api from "../lib/api";

function StockLedger() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get("/inventory/ledger");
        if (active) setEntries(response.data.entries || []);
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Unable to load stock ledger.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Stock Ledger</h1>
          <p>Append-only movement history for inventory transactions.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <section className="card">
        <div className="card-body">
          {loading ? (
            <p>Loading ledger entries...</p>
          ) : entries.length === 0 ? (
            <p className="text-muted">No stock movements recorded yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Movement</th>
                    <th>Material</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Quantity</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry._id}>
                      <td>{entry.movementReference}</td>
                      <td>{entry.material?.name || "—"}</td>
                      <td>{entry.fromLocation?.name || "—"}</td>
                      <td>{entry.toLocation?.name || "—"}</td>
                      <td>{entry.quantity} {entry.unit}</td>
                      <td>{entry.movementType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default StockLedger;
