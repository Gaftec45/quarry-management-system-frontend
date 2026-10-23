import { useEffect, useState } from "react";
import api from "../lib/api";

export default function FactoryDashboard() {
  const [summary, setSummary] = useState({});
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboardRes, batchesRes] = await Promise.all([
          api.get("/factory/dashboard"),
          api.get("/factory/batches"),
        ]);

        setSummary(dashboardRes.data?.dashboard?.summary || {});
        setBatches(batchesRes.data?.batches || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load factory dashboard.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Factory Dashboard</h1>
          <p>Track production batches, pending completions, and stock movement health.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <p>Loading factory operations...</p>
      ) : (
        <>
          <section className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card h-100">
                <div className="card-body">
                  <div className="text-muted">Total batches</div>
                  <h3>{summary.totalBatches ?? 0}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100">
                <div className="card-body">
                  <div className="text-muted">Pending</div>
                  <h3>{summary.pendingBatches ?? 0}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100">
                <div className="card-body">
                  <div className="text-muted">Tracked balances</div>
                  <h3>{summary.stockBalancesTracked ?? 0}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100">
                <div className="card-body">
                  <div className="text-muted">Finished products</div>
                  <h3>{summary.finishedProducts ?? 0}</h3>
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-body">
              <h2 className="h5 mb-3">Recent batches</h2>
              {batches.length === 0 ? (
                <p className="text-muted">No factory batches recorded.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Batch</th>
                        <th>Product</th>
                        <th>Location</th>
                        <th>Quantity</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((batch) => (
                        <tr key={batch._id}>
                          <td>{batch.batchReference}</td>
                          <td>{batch.finishedProduct?.name || "—"}</td>
                          <td>{batch.factoryLocation?.name || "—"}</td>
                          <td>{batch.quantity} {batch.unit}</td>
                          <td>{batch.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
