import { useEffect, useState } from "react";
import api from "../lib/api";

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AccountingReports() {
  const [trialBalance, setTrialBalance] = useState([]);
  const [profitLoss, setProfitLoss] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        setError("");

        const [trialRes, profitRes, balanceRes] = await Promise.all([
          api.get("/accounting/trial-balance"),
          api.get("/accounting/profit-loss"),
          api.get("/accounting/balance-sheet"),
        ]);

        setTrialBalance(trialRes.data.trialBalance || []);
        setProfitLoss(profitRes.data || null);
        setBalanceSheet(balanceRes.data || null);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load accounting reports.");
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  if (loading) {
    return <div className="alert alert-light">Loading accounting reports...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Accounting reports</h1>
          <p>Trial balance, profit and loss, and balance sheet snapshots.</p>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted">Revenue</div>
              <h3>{formatMoney(profitLoss?.revenue || 0)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted">Expenses</div>
              <h3>{formatMoney(profitLoss?.expenses || 0)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted">Net profit</div>
              <h3>{formatMoney(profitLoss?.netProfit || 0)}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-body">
              <h3 className="h5">Trial balance</h3>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Debit</th>
                      <th>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.length === 0 ? (
                      <tr><td colSpan="3" className="text-muted">No posted entries yet.</td></tr>
                    ) : (
                      trialBalance.slice(0, 12).map((row) => (
                        <tr key={row.account?._id || row.account?.code}>
                          <td>{row.account?.code || "—"}</td>
                          <td>{formatMoney(row.debit)}</td>
                          <td>{formatMoney(row.credit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-body">
              <h3 className="h5">Balance sheet summary</h3>
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between">
                  <span>Assets</span>
                  <strong>{formatMoney(balanceSheet?.assets || 0)}</strong>
                </li>
                <li className="list-group-item d-flex justify-content-between">
                  <span>Liabilities</span>
                  <strong>{formatMoney(balanceSheet?.liabilities || 0)}</strong>
                </li>
                <li className="list-group-item d-flex justify-content-between">
                  <span>Equity</span>
                  <strong>{formatMoney(balanceSheet?.equity || 0)}</strong>
                </li>
                <li className="list-group-item d-flex justify-content-between">
                  <span>Total liabilities + equity</span>
                  <strong>{formatMoney(balanceSheet?.totalLiabilitiesAndEquity || 0)}</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
