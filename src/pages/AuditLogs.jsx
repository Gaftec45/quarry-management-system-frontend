import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";


const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleString();
};

const formatDetails = (details) => {
  if (!details || typeof details !== "object") {
    return String(details ?? "No details recorded");
  }

  return JSON.stringify(details, null, 2);
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/audit-logs", {
        params: {
          page,
          limit: 20,
          ...(action.trim() && { action: action.trim() }),
          ...(entityType.trim() && { entityType: entityType.trim() }),
        },
      });

      setLogs(response.data.logs || []);
      setPagination(
        response.data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "Access denied. Only super administrators can view audit logs."
          : err.response?.data?.message || "Unable to load audit logs."
      );
    } finally {
      setLoading(false);
    }
  }, [page, action, entityType]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setAction("");
    setEntityType("");
    setPage(1);
  };

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div>
          <h2>Audit Logs</h2>
          <p>Review recorded system activities and accountability events.</p>
        </div>

        <button
          type="button"
          className="audit-refresh-btn"
          onClick={loadLogs}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="audit-summary">
        <div className="audit-summary-card">
          <span>Total records</span>
          <strong>{pagination.total}</strong>
        </div>

        <div className="audit-summary-card">
          <span>Current page</span>
          <strong>
            {pagination.totalPages ? pagination.page : 0} /{" "}
            {pagination.totalPages}
          </strong>
        </div>
      </div>

      <form className="audit-filters" onSubmit={applyFilters}>
        <div className="audit-filter-field">
          <label htmlFor="audit-action">Action</label>
          <input
            id="audit-action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="e.g. user.created"
            maxLength={100}
          />
        </div>

        <div className="audit-filter-field">
          <label htmlFor="audit-entity">Entity type</label>
          <input
            id="audit-entity"
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            placeholder="e.g. User, Truck, Department"
            maxLength={100}
          />
        </div>

        <div className="audit-filter-actions">
          <button type="submit" className="audit-apply-btn">
            Apply filters
          </button>

          <button
            type="button"
            className="audit-clear-btn"
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>
      </form>

      {error && <div className="audit-error">{error}</div>}

      <div className="audit-table-container">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Date and time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Record ID</th>
              <th>Details</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="audit-empty">
                  Loading audit records...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="6" className="audit-empty">
                  No audit records found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td>{formatDate(log.createdAt)}</td>

                  <td>
                    <strong>{log.actor?.fullName || "System / Unknown"}</strong>
                    <small className="audit-secondary">
                      {log.actor?.email || "No actor email"}
                    </small>
                  </td>

                  <td>
                    <span className="audit-action-badge">
                      {log.action}
                    </span>
                  </td>

                  <td>{log.entityType}</td>

                  <td className="audit-record-id">
                    {log.entityId || "—"}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="audit-details-btn"
                      onClick={() => setSelectedLog(log)}
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="audit-pagination">
        <span>
          Showing {logs.length} of {pagination.total} records
        </span>

        <div>
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>

          <span>
            Page {pagination.totalPages ? pagination.page : 0} of{" "}
            {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={loading || page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {selectedLog && (
        <div
          className="audit-modal-backdrop"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="audit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="audit-modal-header">
              <div>
                <h3 id="audit-modal-title">Audit Record Details</h3>
                <p>{selectedLog.action}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className="audit-detail-grid">
              <div>
                <span>Actor</span>
                <strong>
                  {selectedLog.actor?.fullName || "System / Unknown"}
                </strong>
              </div>

              <div>
                <span>Role</span>
                <strong>{selectedLog.actor?.role || "—"}</strong>
              </div>

              <div>
                <span>Entity type</span>
                <strong>{selectedLog.entityType}</strong>
              </div>

              <div>
                <span>Entity ID</span>
                <strong>{selectedLog.entityId || "—"}</strong>
              </div>

              <div>
                <span>IP address</span>
                <strong>{selectedLog.ipAddress || "—"}</strong>
              </div>

              <div>
                <span>Timestamp</span>
                <strong>{formatDate(selectedLog.createdAt)}</strong>
              </div>
            </div>

            <h4>Recorded details</h4>
            <pre className="audit-json">
              {formatDetails(selectedLog.details)}
            </pre>

            <h4>User agent</h4>
            <p className="audit-user-agent">
              {selectedLog.userAgent || "Not recorded"}
            </p>

            <button
              type="button"
              className="audit-apply-btn"
              onClick={() => setSelectedLog(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
