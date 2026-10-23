
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";

const modules = [
  ["users", "Users"],
  ["departments", "Departments"],
  ["trucks", "Trucks"],
  ["dispatches", "Dispatches"],
  ["inventory", "Inventory"],
  ["sales", "Sales"],
  ["other", "Other"],
];

const emptyForm = {
  targetModule: "trucks",
  targetRecordId: "",
  fieldName: "",
  originalValue: "",
  proposedValue: "",
  reason: "",
};

function errorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function Corrections() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentUser = JSON.parse(
    sessionStorage.getItem("currentUser") || "{}"
  );
  const canReview = ["super_admin", "general_manager"].includes(
    currentUser.role
  );

  const loadRequests = useCallback(async () => {
    const params = statusFilter ? { status: statusFilter } : {};
    const response = await api.get("/correction-requests", { params });
    const records = response.data?.requests;

    if (!Array.isArray(records)) {
      throw new Error("Unexpected response from correction requests API.");
    }

    setRequests(records);
  }, [statusFilter]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const params = statusFilter ? { status: statusFilter } : {};
        const response = await api.get("/correction-requests", { params });

        if (!Array.isArray(response.data?.requests)) {
          throw new Error("Unexpected response from correction requests API.");
        }

        if (active) setRequests(response.data.requests);
      } catch (err) {
        if (active) {
          setError(errorMessage(err, "Could not load correction requests."));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [statusFilter]);

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      targetModule: form.targetModule,
      targetRecordId: form.targetRecordId.trim(),
      fieldName: form.fieldName.trim(),
      originalValue: form.originalValue,
      proposedValue: form.proposedValue,
      reason: form.reason.trim(),
    };

    try {
      await api.post("/correction-requests", payload);
      setSuccess("Correction request submitted successfully.");
      setForm({ ...emptyForm });
      setShowForm(false);
      await loadRequests();
    } catch (err) {
      setError(errorMessage(err, "Could not submit correction request."));
    } finally {
      setSaving(false);
    }
  }

  async function openRequest(id) {
    setError("");
    setSuccess("");

    try {
      const response = await api.get(`/correction-requests/${id}`);
      setSelected(response.data?.request || null);
      setReviewComment("");
    } catch (err) {
      setError(errorMessage(err, "Could not open correction request."));
    }
  }

  async function reviewRequest(decision) {
    if (!selected) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        `/correction-requests/${selected._id}/${decision}`,
        { comment: reviewComment.trim() }
      );

      setSuccess(response.data?.message || "Review completed.");
      setSelected(null);
      setReviewComment("");
      await loadRequests();
    } catch (err) {
      setError(errorMessage(err, "Could not review correction request."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="corrections-page">
      <div className="corrections-heading">
        <div>
          <p className="users-eyebrow">GOVERNANCE / DATA QUALITY</p>
          <h2>Correction Requests</h2>
          <p>
            Request corrections to records and track management decisions.
          </p>
        </div>

        <button
          className="users-primary-button"
          onClick={() => {
            setShowForm((value) => !value);
            setError("");
            setSuccess("");
          }}
        >
          {showForm ? "Cancel" : "+ New Request"}
        </button>
      </div>

      {error && <div className="users-error" role="alert">{error}</div>}
      {success && <div className="users-success" role="status">{success}</div>}

      <div className="corrections-summary">
        {["pending", "approved", "rejected"].map((status) => (
          <button
            type="button"
            key={status}
            className={`correction-summary-card ${
              statusFilter === status ? "correction-summary-selected" : ""
            }`}
            onClick={() =>
              setStatusFilter((current) => current === status ? "" : status)
            }
          >
            <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
            <strong>
              {requests.filter((request) => request.status === status).length}
            </strong>
          </button>
        ))}
      </div>

      {showForm && (
        <form className="create-user-form" onSubmit={handleSubmit}>
          <div className="create-user-form-heading">
            <h3>Submit Correction Request</h3>
            <p>Explain which record needs correction and why.</p>
          </div>

          <div className="create-user-grid">
            <div className="create-user-field">
              <label htmlFor="targetModule">Module *</label>
              <select
                id="targetModule"
                name="targetModule"
                value={form.targetModule}
                onChange={handleChange}
                required
              >
                {modules.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="create-user-field">
              <label htmlFor="targetRecordId">Record ID *</label>
              <input
                id="targetRecordId"
                name="targetRecordId"
                value={form.targetRecordId}
                onChange={handleChange}
                maxLength={100}
                required
              />
            </div>

            <div className="create-user-field">
              <label htmlFor="fieldName">Field to correct *</label>
              <input
                id="fieldName"
                name="fieldName"
                value={form.fieldName}
                onChange={handleChange}
                maxLength={100}
                placeholder="e.g. registrationNumber"
                required
              />
            </div>

            <div className="create-user-field">
              <label htmlFor="originalValue">Current value</label>
              <textarea
                id="originalValue"
                name="originalValue"
                value={form.originalValue}
                onChange={handleChange}
                rows={2}
              />
            </div>

            <div className="create-user-field">
              <label htmlFor="proposedValue">Proposed value *</label>
              <textarea
                id="proposedValue"
                name="proposedValue"
                value={form.proposedValue}
                onChange={handleChange}
                rows={2}
                required
              />
            </div>

            <div className="create-user-field department-description">
              <label htmlFor="reason">Reason for correction *</label>
              <textarea
                id="reason"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                minLength={10}
                maxLength={2000}
                rows={4}
                required
              />
              <small>Provide at least 10 characters.</small>
            </div>
          </div>

          <div className="create-user-actions">
            <button
              type="button"
              className="users-secondary-button"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="users-primary-button"
              disabled={saving}
            >
              {saving ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      )}

      {selected && (
        <div className="correction-detail">
          <div className="correction-detail-heading">
            <h3>Request Details</h3>
            <button
              type="button"
              className="users-secondary-button"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>

          <dl className="correction-detail-grid">
            <div><dt>Module</dt><dd>{selected.targetModule}</dd></div>
            <div><dt>Record ID</dt><dd>{selected.targetRecordId}</dd></div>
            <div><dt>Field</dt><dd>{selected.fieldName}</dd></div>
            <div><dt>Requested by</dt><dd>{selected.requestedBy?.fullName || "—"}</dd></div>
            <div><dt>Current value</dt><dd>{displayValue(selected.originalValue)}</dd></div>
            <div><dt>Proposed value</dt><dd>{displayValue(selected.proposedValue)}</dd></div>
            <div className="correction-detail-wide"><dt>Reason</dt><dd>{selected.reason}</dd></div>
            <div><dt>Status</dt><dd>{selected.status}</dd></div>
            {selected.reviewedBy && (
              <div><dt>Reviewed by</dt><dd>{selected.reviewedBy.fullName}</dd></div>
            )}
            {selected.reviewComment && (
              <div className="correction-detail-wide">
                <dt>Review comment</dt><dd>{selected.reviewComment}</dd>
              </div>
            )}
          </dl>

          {canReview && selected.status === "pending" && (
            <div className="correction-review">
              <label htmlFor="reviewComment">Review comment (optional)</label>
              <textarea
                id="reviewComment"
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                maxLength={1000}
                rows={3}
              />
              <div className="create-user-actions">
                <button
                  className="correction-reject-button"
                  type="button"
                  disabled={saving}
                  onClick={() => reviewRequest("reject")}
                >
                  Reject Request
                </button>
                <button
                  className="users-primary-button"
                  type="button"
                  disabled={saving}
                  onClick={() => reviewRequest("approve")}
                >
                  Approve Request
                </button>
              </div>
              <small>
                Approval records the decision; it does not automatically edit
                the target record.
              </small>
            </div>
          )}
        </div>
      )}

      <div className="corrections-toolbar">
        <h3>{statusFilter ? `${statusFilter} requests` : "All requests"}</h3>
        <select
          aria-label="Filter correction requests"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p className="users-message">Loading correction requests...</p>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Record ID</th>
                <th>Field</th>
                {canReview && <th>Requested by</th>}
                <th>Status</th>
                <th>Date submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request._id}>
                  <td>{request.targetModule}</td>
                  <td>{request.targetRecordId}</td>
                  <td>{request.fieldName}</td>
                  {canReview && (
                    <td>{request.requestedBy?.fullName || "—"}</td>
                  )}
                  <td>
                    <span className={`user-status ${
                      request.status === "approved"
                        ? "user-status-active"
                        : "user-status-inactive"
                    }`}>
                      {request.status}
                    </span>
                  </td>
                  <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="department-action-button"
                      onClick={() => openRequest(request._id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={canReview ? 7 : 6} className="users-empty">
                    No correction requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
