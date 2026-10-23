
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const STATUSES = [
  "issued",
  "in_transit",
  "verified",
  "received",
  "cancelled",
  "expired",
];

const createEmptyForm = () => ({
  dispatchNumber: generateReference("DSP"),
  source: "",
  destination: "",
  truckId: "",
  expiresAt: "",
});

const dateTime = (value) =>
  value ? new Date(value).toLocaleString() : "—";

const getError = (error) =>
  error.response?.data?.message || "The request could not be completed.";

const ACCESS_ROLES = [
  "super_admin",
  "general_manager",
  "department_manager",
  "data_entry_officer",
];

export default function Dispatches() {
  const [dispatches, setDispatches] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 0,
    total: 0,
  });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [issuedToken, setIssuedToken] = useState(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    dispatchId: "",
    token: "",
    destination: "",
  });
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [statusBusy, setStatusBusy] = useState("");

  const currentUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  })();

  const role = currentUser.role;
  const canAccessDispatches = ACCESS_ROLES.includes(role);
  const canCreate = ACCESS_ROLES.includes(role);
  const canManageStatus = ACCESS_ROLES.includes(role);

  const loadDispatches = useCallback(async () => {
    if (!canAccessDispatches) {
      setDispatches([]);
      setPagination({ page: 1, pages: 0, total: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get("/dispatches", {
        params: {
          page,
          limit: 20,
          ...(statusFilter && { status: statusFilter }),
        },
      });

      setDispatches(response.data.dispatches || []);
      setPagination(
        response.data.pagination || {
          page: 1,
          pages: 0,
          total: 0,
        }
      );
    } catch (err) {
      setError(getError(err));
      setDispatches([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, canAccessDispatches]);

  const loadTrucks = useCallback(async () => {
    if (!canCreate) {
      setTrucks([]);
      return;
    }

    try {
      const response = await api.get("/trucks", {
        params: { limit: 100, status: "active" },
      });

      const payload = response.data;
      const list = Array.isArray(payload)
        ? payload
        : payload.trucks || payload.data || [];

      setTrucks(
        list.filter((truck) => truck.status === "active")
      );
    } catch {
      setTrucks([]);
    }
  }, [canCreate]);

  useEffect(() => {
    loadDispatches();
  }, [loadDispatches]);

  useEffect(() => {
    loadTrucks();
  }, [loadTrucks]);

  const changeFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const createDispatch = async (event) => {
    event.preventDefault();

    if (!canCreate) return;

    setSaving(true);
    setError("");

    try {
      if (!form.expiresAt) {
        setError("Please select a token expiry date and time.");
        return;
      }

      const expiryDate = new Date(form.expiresAt);

      if (Number.isNaN(expiryDate.getTime())) {
        setError("Please provide a valid expiry date and time.");
        return;
      }

      if (expiryDate <= new Date()) {
        setError("The token expiry must be in the future.");
        return;
      }

      const payload = {
        ...form,
        dispatchNumber: form.dispatchNumber.trim().toUpperCase(),
        source: form.source.trim(),
        destination: form.destination.trim(),
        expiresAt: expiryDate.toISOString(),
      };

      const response = await api.post("/dispatches", payload);

      setIssuedToken({
        ...response.data,
        dispatchId:
          response.data.dispatch?.id ||
          response.data.dispatch?._id,
      });

      setForm(createEmptyForm());
      setFormOpen(false);
      setPage(1);
      setStatusFilter("");
      await loadDispatches();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (dispatch, status) => {
    if (!canManageStatus) return;

    if (
      !window.confirm(
        `Change dispatch ${dispatch.dispatchNumber} to ${status.replaceAll("_", " ")}?`
      )
    ) {
      return;
    }

    setStatusBusy(dispatch._id);
    setError("");

    try {
      await api.patch(`/dispatches/${dispatch._id}/status`, {
        status,
      });
      await loadDispatches();
    } catch (err) {
      setError(getError(err));
    } finally {
      setStatusBusy("");
    }
  };

  const submitVerification = async (event) => {
    event.preventDefault();

    if (!canAccessDispatches) return;

    setVerifying(true);
    setError("");
    setVerifyResult(null);

    try {
      const response = await api.post(
        "/dispatches/verify",
        verifyForm
      );
      setVerifyResult(response.data);
      await loadDispatches();
    } catch (err) {
      setVerifyResult({
        valid: false,
        message: getError(err),
      });
    } finally {
      setVerifying(false);
    }
  };

  const closeToken = () => {
    setIssuedToken(null);
  };

  const copyToken = async () => {
    if (!issuedToken?.token) return;

    try {
      await navigator.clipboard.writeText(issuedToken.token);
    } catch {
      setError("Copy failed. Select and copy the token manually.");
    }
  };

  if (!canAccessDispatches) {
    return (
      <div className="dispatch-page">
        <div className="dispatch-error" role="alert">
          You are not authorized to access dispatch management.
        </div>
      </div>
    );
  }

  return (
    <div className="dispatch-page">
      <div className="dispatch-header">
        <div>
          <h2>Dispatch Management</h2>
          <p>
            Create dispatches, track status and verify dispatch tokens.
          </p>
        </div>

        <div className="dispatch-header-actions">
          <button
            type="button"
            className="dispatch-secondary-btn"
            onClick={() => {
              setVerifyOpen(true);
              setVerifyResult(null);
            }}
          >
            Verify token
          </button>

          {canCreate && (
            <button
              type="button"
              className="dispatch-primary-btn"
              onClick={() => {
                setFormOpen((open) => !open);
                setError("");
              }}
            >
              {formOpen ? "Close form" : "＋ New dispatch"}
            </button>
          )}
        </div>
      </div>

      <div className="dispatch-summary">
        <div className="dispatch-summary-card">
          <span>Matching dispatches</span>
          <strong>{pagination.total}</strong>
        </div>

        <div className="dispatch-summary-card">
          <span>Page</span>
          <strong>
            {pagination.pages ? pagination.page : 0} /{" "}
            {pagination.pages}
          </strong>
        </div>
      </div>

      {error && (
        <div className="dispatch-error" role="alert">
          {error}
        </div>
      )}

      {formOpen && canCreate && (
        <form className="dispatch-form" onSubmit={createDispatch}>
          <h3>Create dispatch</h3>

          <div className="dispatch-form-grid">
            <label>
              Dispatch number
              <input
                required
                maxLength={50}
                value={form.dispatchNumber}
                readOnly
              />
              <small>Generated automatically</small>
            </label>

            <label>
              Source
              <input
                required
                maxLength={150}
                value={form.source}
                onChange={(e) =>
                  setForm({ ...form, source: e.target.value })
                }
                placeholder="Quarry or loading point"
              />
            </label>

            <label>
              Destination
              <input
                required
                maxLength={150}
                value={form.destination}
                onChange={(e) =>
                  setForm({ ...form, destination: e.target.value })
                }
                placeholder="Factory or delivery point"
              />
            </label>

            <label>
              Active truck
              <select
                required
                value={form.truckId}
                onChange={(e) =>
                  setForm({ ...form, truckId: e.target.value })
                }
              >
                <option value="">Select truck</option>
                {trucks.map((truck) => (
                  <option
                    key={truck._id || truck.id}
                    value={truck._id || truck.id}
                  >
                    {truck.registrationNumber} — {truck.truckType}
                  </option>
                ))}
              </select>

              {trucks.length === 0 && (
                <small>
                  No active trucks found. Check the Truck Registry.
                </small>
              )}
            </label>

            <label>
              Token expiry date and time
              <input
                required
                type="datetime-local"
                min={new Date(Date.now() + 60000)
                  .toISOString()
                  .slice(0, 16)}
                value={form.expiresAt}
                onChange={(e) =>
                  setForm({ ...form, expiresAt: e.target.value })
                }
              />
            </label>
          </div>

          <button
            className="dispatch-primary-btn"
            type="submit"
            disabled={saving || trucks.length === 0}
          >
            {saving ? "Creating..." : "Create dispatch"}
          </button>
        </form>
      )}

      <div className="dispatch-toolbar">
        <label>
          Filter by status
          <select
            value={statusFilter}
            onChange={(e) => changeFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="dispatch-secondary-btn"
          disabled={loading}
          onClick={loadDispatches}
        >
          Refresh
        </button>
      </div>

      <div className="dispatch-table-wrap">
        <table className="dispatch-table">
          <thead>
            <tr>
              <th>Dispatch</th>
              <th>Route</th>
              <th>Truck</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Created by</th>
              {canManageStatus && <th>Actions</th>}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canManageStatus ? 7 : 6}>
                  Loading dispatches...
                </td>
              </tr>
            ) : dispatches.length === 0 ? (
              <tr>
                <td colSpan={canManageStatus ? 7 : 6}>
                  No dispatches found.
                </td>
              </tr>
            ) : (
              dispatches.map((dispatch) => (
                <tr key={dispatch._id || dispatch.id}>
                  <td>
                    <strong>{dispatch.dispatchNumber}</strong>
                    <small>{dateTime(dispatch.createdAt)}</small>
                  </td>

                  <td>
                    <strong>{dispatch.source}</strong>
                    <small>To: {dispatch.destination}</small>
                  </td>

                  <td>
                    {dispatch.truck?.registrationNumber ||
                      "Truck unavailable"}
                    <small>{dispatch.truck?.truckType || ""}</small>
                  </td>

                  <td>
                    <span
                      className={`dispatch-status status-${dispatch.status}`}
                    >
                      {dispatch.status.replaceAll("_", " ")}
                    </span>
                  </td>

                  <td>{dateTime(dispatch.expiresAt)}</td>

                  <td>{dispatch.createdBy?.fullName || "—"}</td>

                  {canManageStatus && (
                    <td>
                      {["issued", "in_transit"].includes(
                        dispatch.status
                      ) ? (
                        <select
                          aria-label={`Update ${dispatch.dispatchNumber} status`}
                          defaultValue=""
                          disabled={
                            statusBusy ===
                            (dispatch._id || dispatch.id)
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value) updateStatus(dispatch, value);
                            e.target.value = "";
                          }}
                        >
                          <option value="">Change status</option>

                          {dispatch.status === "issued" && (
                            <option value="in_transit">
                              In transit
                            </option>
                          )}

                          <option value="cancelled">
                            Cancel dispatch
                          </option>
                        </select>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="dispatch-pagination">
        <span>{pagination.total} total records</span>

        <div>
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>

          <span>
            {pagination.pages ? pagination.page : 0} /{" "}
            {pagination.pages}
          </span>

          <button
            type="button"
            disabled={loading || page >= pagination.pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {issuedToken && (
        <div className="dispatch-modal-backdrop">
          <div
            className="dispatch-modal"
            role="dialog"
            aria-modal="true"
          >
            <h3>Dispatch created</h3>

            <p>
              {issuedToken.message ||
                "Copy and securely share this token now. It will not be shown again."}
            </p>

            <div className="dispatch-token-box">
              <label htmlFor="issued-token">
                One-time dispatch token
              </label>

              <textarea
                id="issued-token"
                rows={4}
                readOnly
                value={issuedToken.token || ""}
              />

              <button
                type="button"
                className="dispatch-primary-btn"
                onClick={copyToken}
              >
                Copy token
              </button>
            </div>

            <p className="dispatch-warning">
              Keep this token secure. Closing this window removes it
              from this page; the dispatch list does not contain the
              token.
            </p>

            <button
              type="button"
              className="dispatch-secondary-btn"
              onClick={closeToken}
            >
              I have saved the token — close
            </button>
          </div>
        </div>
      )}

      {verifyOpen && (
        <div className="dispatch-modal-backdrop">
          <div
            className="dispatch-modal"
            role="dialog"
            aria-modal="true"
          >
            <h3>Verify dispatch token</h3>

            <p>
              Enter the dispatch ID, token and destination. The backend
              validates the token and applies its verification rules.
            </p>

            <form
              onSubmit={submitVerification}
              className="dispatch-form"
            >
              <label>
                Dispatch ID
                <input
                  required
                  value={verifyForm.dispatchId}
                  onChange={(e) =>
                    setVerifyForm({
                      ...verifyForm,
                      dispatchId: e.target.value,
                    })
                  }
                  placeholder="Dispatch database ID"
                />
              </label>

              <label>
                Token
                <textarea
                  required
                  rows={3}
                  value={verifyForm.token}
                  onChange={(e) =>
                    setVerifyForm({
                      ...verifyForm,
                      token: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Destination
                <input
                  required
                  maxLength={150}
                  value={verifyForm.destination}
                  onChange={(e) =>
                    setVerifyForm({
                      ...verifyForm,
                      destination: e.target.value,
                    })
                  }
                />
              </label>

              {verifyResult && (
                <div
                  className={
                    verifyResult.valid
                      ? "dispatch-success"
                      : "dispatch-error"
                  }
                >
                  <strong>
                    {verifyResult.valid
                      ? "Verification successful"
                      : "Not verified"}
                  </strong>

                  <p>{verifyResult.message}</p>

                  {verifyResult.dispatch && (
                    <pre>
                      {JSON.stringify(
                        verifyResult.dispatch,
                        null,
                        2
                      )}
                    </pre>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="dispatch-primary-btn"
                disabled={verifying}
              >
                {verifying ? "Verifying..." : "Verify token"}
              </button>

              <button
                type="button"
                className="dispatch-secondary-btn"
                onClick={() => {
                  setVerifyOpen(false);
                  setVerifyResult(null);
                  setVerifyForm({
                    dispatchId: "",
                    token: "",
                    destination: "",
                  });
                }}
              >
                Close
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
