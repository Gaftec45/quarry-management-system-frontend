import { useEffect, useState } from "react";
import api from "../lib/api";

function StockBalances() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get("/inventory/balances");
        if (active) setBalances(response.data.balances || []);
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Unable to load balances.");
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
          <h1>Stock Balances</h1>
          <p>Material availability by location.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <section className="card">
        <div className="card-body">
          {loading ? (
            <p>Loading balances...</p>
          ) : balances.length === 0 ? (
            <p className="text-muted">No stock balances recorded yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Location</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Last movement</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((balance) => (
                    <tr key={`${balance.location?._id || balance.location}-${balance.material?._id || balance.material}`}>
                      <td>{balance.material?.name || "—"}</td>
                      <td>{balance.location?.name || "—"}</td>
                      <td>{Number(balance.quantity || 0).toFixed(2)}</td>
                      <td>{balance.unit || "—"}</td>
                      <td>{balance.lastMovementAt ? new Date(balance.lastMovementAt).toLocaleString() : "—"}</td>
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

export default StockBalances;
