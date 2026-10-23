import { useEffect, useState } from "react";
import api from "../lib/api";

function InventoryDashboard() {
  const [locations, setLocations] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [balances, setBalances] = useState([]);
  const [movements, setMovements] = useState([]);
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [locationsRes, materialsRes, balancesRes, movementsRes, productionsRes] = await Promise.all([
          api.get("/inventory/locations"),
          api.get("/inventory/materials"),
          api.get("/inventory/balances"),
          api.get("/inventory/ledger"),
          api.get("/productions"),
        ]);

        if (!active) return;

        setLocations(locationsRes.data.locations || []);
        setMaterials(materialsRes.data.materials || []);
        setBalances(balancesRes.data.balances || []);
        setMovements(movementsRes.data.entries || []);
        setProductions(productionsRes.data.productions || []);
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || "Unable to load inventory dashboard.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="alert alert-light">Loading inventory dashboard...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Inventory Dashboard</h1>
          <p>Real stock and production snapshot from the API.</p>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted">Active locations</div>
              <h3>{locations.filter((item) => item.status === "active").length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted">Materials</div>
              <h3>{materials.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted">Material balances</div>
              <h3>{balances.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted">Recent movements</div>
              <h3>{movements.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted">Recent production</div>
              <h3>{productions.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-body">
              <h3 className="h5">Balance snapshot</h3>
              {balances.length === 0 ? (
                <p className="text-muted">No balances recorded yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr><th>Material</th><th>Location</th><th>Quantity</th></tr>
                    </thead>
                    <tbody>
                      {balances.slice(0, 8).map((item) => (
                        <tr key={`${item.location?._id || item.location}-${item.material?._id || item.material}`}>
                          <td>{item.material?.name || "—"}</td>
                          <td>{item.location?.name || "—"}</td>
                          <td>{Number(item.quantity || 0).toFixed(2)} {item.unit || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-body">
              <h3 className="h5">Recent stock movements</h3>
              {movements.length === 0 ? (
                <p className="text-muted">No stock movements recorded yet.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {movements.slice(0, 6).map((entry) => (
                    <li key={entry._id} className="list-group-item">
                      <strong>{entry.movementType}</strong> — {entry.material?.name || "Material"} ({entry.quantity} {entry.unit})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InventoryDashboard;
