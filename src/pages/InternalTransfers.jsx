
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const emptyForm = {
  transferNumber: "",
  materialId: "",
  sourceLocationId: "",
  destinationLocationId: "",
  quantity: "",
  description: "",
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function getList(data, key) {
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getId(item) {
  return String(item?.id || item?._id || "");
}

function getStatusClass(status) {
  return (
    {
      draft: "bg-secondary",
      pending: "bg-warning text-dark",
      approved: "bg-success",
      rejected: "bg-danger",
      cancelled: "bg-dark",
    }[status] || "bg-secondary"
  );
}


export default function InternalTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [locations, setLocations] = useState([]);
const [form, setForm] = useState(() => ({
  ...emptyForm,
  transferNumber: generateReference("TRF"),
}));
  const [statusFilter, setStatusFilter] = useState("");
  const [reviewComments, setReviewComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  let user = null;

  try {
    user = JSON.parse(sessionStorage.getItem("currentUser") || "null");
  } catch {
    user = null;
  }

  const canReview = ["super_admin", "general_manager"].includes(user?.role);

  const activeMaterials = materials.filter(
    (material) => material.isActive === true
  );

  const activeLocations = locations.filter(
    (location) =>
      location.status === "active" || location.status === "Active"
  );

  const selectedMaterial = activeMaterials.find(
    (material) => getId(material) === String(form.materialId)
  );

  const sourceLocation = activeLocations.find(
    (location) => getId(location) === String(form.sourceLocationId)
  );

  const destinationLocation = activeLocations.find(
    (location) => getId(location) === String(form.destinationLocationId)
  );

  const availableDestinationLocations = activeLocations.filter(
    (location) => getId(location) !== String(form.sourceLocationId)
  );

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [transferResponse, materialResponse, locationResponse] =
        await Promise.all([
          api.get("/internal-transfers", {
            params: statusFilter ? { status: statusFilter } : {},
          }),
          api.get("/inventory/materials"),
          api.get("/inventory/locations"),
        ]);

      setTransfers(getList(transferResponse.data, "transfers"));
      setMaterials(getList(materialResponse.data, "materials"));
      setLocations(getList(locationResponse.data, "locations"));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load transfers, materials or inventory locations."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => {
      const next = { ...previous, [name]: value };

      if (
        name === "sourceLocationId" &&
        value === previous.destinationLocationId
      ) {
        next.destinationLocationId = "";
      }

      if (name === "materialId") {
        next.quantity = "";
      }

      return next;
    });
  }

  async function createTransfer(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedMaterial) {
      setError("Select an active material.");
      return;
    }

    if (!sourceLocation || !destinationLocation) {
      setError("Select valid source and destination locations.");
      return;
    }

    if (getId(sourceLocation) === getId(destinationLocation)) {
      setError("Source and destination locations must be different.");
      return;
    }

    const quantity = Number(form.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be a positive number.");
      return;
    }

    if (!selectedMaterial.unit) {
      setError("The selected material has no configured unit.");
      return;
    }

    if (!form.transferNumber.trim()) {
      setError("Enter a transfer number.");
      return;
    }

    if (!form.description.trim()) {
      setError("Enter a description or reason for the transfer.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        transferNumber: form.transferNumber.trim(),
        materialId: getId(selectedMaterial),
        sourceLocationId: getId(sourceLocation),
        destinationLocationId: getId(destinationLocation),
        quantity,
        unit: selectedMaterial.unit,
        description: form.description.trim(),
      };

      const response = await api.post("/internal-transfers", payload);

setForm({
  ...emptyForm,
  transferNumber: generateReference("TRF"),
});
      setNotice(response.data.message || "Transfer draft created.");
      await loadTransfers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create transfer."
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitTransfer(id) {
    setError("");
    setNotice("");

    try {
      const response = await api.post(`/internal-transfers/${id}/submit`);
      setNotice(response.data.message || "Transfer submitted for review.");
      await loadTransfers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to submit transfer."
      );
    }
  }

  async function reviewTransfer(id, decision) {
    setError("");
    setNotice("");

    try {
      const response = await api.post(`/internal-transfers/${id}/review`, {
        decision,
        comment: reviewComments[id] || "",
      });

      setNotice(response.data.message || `Transfer ${decision}.`);
      setReviewComments((previous) => ({ ...previous, [id]: "" }));
      await loadTransfers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to review transfer."
      );
    }
  }

  async function cancelTransfer(id) {
    if (!window.confirm("Cancel this internal transfer?")) return;

    setError("");
    setNotice("");

    try {
      const response = await api.post(`/internal-transfers/${id}/cancel`);
      setNotice(response.data.message || "Transfer cancelled.");
      await loadTransfers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to cancel transfer."
      );
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Internal Transfers</h1>
          <p>
            Request material transfers between inventory locations and track
            approvals.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}

      <section className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Create Transfer Request</h2>

          {activeMaterials.length === 0 && (
            <div className="alert alert-warning">
              No active materials found. Create or activate a material first.
            </div>
          )}

          {activeLocations.length < 2 && (
            <div className="alert alert-warning">
              At least two active inventory locations are required.
            </div>
          )}

          <form onSubmit={createTransfer}>
            <div className="row g-3">
<div className="col-md-4">
  <label className="form-label">Transfer Number</label>

  <input
    className="form-control"
    name="transferNumber"
    value={form.transferNumber}
    readOnly
    required
  />

  <small className="text-muted">
    Automatically generated by QuarryOS.
  </small>
</div>

              <div className="col-md-4">
                <label className="form-label">Material</label>
                <select
                  className="form-select"
                  name="materialId"
                  value={form.materialId}
                  onChange={updateField}
                  required
                >
                  <option value="">Select material</option>
                  {activeMaterials.map((material) => (
                    <option key={getId(material)} value={getId(material)}>
                      {material.code} - {material.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Quantity</label>
                <div className="input-group">
                  <input
                    className="form-control"
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={updateField}
                    min="0.0001"
                    step="any"
                    placeholder="Enter quantity"
                    required
                  />
                  <span className="input-group-text">
                    {selectedMaterial?.unit || "Unit"}
                  </span>
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label">Source Location</label>
                <select
                  className="form-select"
                  name="sourceLocationId"
                  value={form.sourceLocationId}
                  onChange={updateField}
                  required
                >
                  <option value="">Select source location</option>
                  {activeLocations.map((location) => (
                    <option key={getId(location)} value={getId(location)}>
                      {location.code
                        ? `${location.code} — ${location.name}`
                        : location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Destination Location</label>
                <select
                  className="form-select"
                  name="destinationLocationId"
                  value={form.destinationLocationId}
                  onChange={updateField}
                  required
                >
                  <option value="">Select destination location</option>
                  {availableDestinationLocations.map((location) => (
                    <option key={getId(location)} value={getId(location)}>
                      {location.code
                        ? `${location.code} — ${location.name}`
                        : location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">Description / Reason</label>
                <textarea
                  className="form-control"
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  maxLength={1000}
                  rows={3}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary mt-3"
              disabled={
                saving ||
                loading ||
                activeMaterials.length === 0 ||
                activeLocations.length < 2
              }
            >
              {saving ? "Creating..." : "Create Draft"}
            </button>
          </form>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
            <h2 className="h5 mb-0">Transfer Register</h2>

            <select
              className="form-select"
              style={{ maxWidth: 200 }}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter transfers by status"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loading ? (
            <p>Loading transfers...</p>
          ) : transfers.length === 0 ? (
            <p className="text-muted">No internal transfers found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Transfer No.</th>
                    <th>Material / Quantity</th>
                    <th>Route</th>
                    <th>Description</th>
                    <th>Requester</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Review / Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {transfers.map((transfer) => {
                    const isRequester =
                      String(
                        transfer.requestedBy?._id ||
                          transfer.requestedBy?.id ||
                          transfer.requestedBy
                      ) === String(user?._id || user?.id);

                    const materialName =
                      transfer.material?.name || "Legacy / unspecified";

                    const quantityLabel =
                      transfer.quantity != null
                        ? `${transfer.quantity} ${transfer.unit || ""}`.trim()
                        : "Quantity not recorded";

                    return (
                      <tr key={getId(transfer)}>
                        <td className="fw-semibold">
                          {transfer.transferNumber}
                        </td>

                        <td>
                          <div>{materialName}</div>
                          <div className="text-muted small">
                            {quantityLabel}
                          </div>
                        </td>

                        <td>
                          <div>
                            {transfer.sourceLocation?.name || transfer.source}
                          </div>
                          <div className="text-muted small">
                            to{" "}
                            {transfer.destinationLocation?.name ||
                              transfer.destination}
                          </div>
                        </td>

                        <td style={{ minWidth: 180 }}>
                          {transfer.description}
                        </td>

                        <td>{transfer.requestedBy?.fullName || "—"}</td>

                        <td>
                          <span
                            className={`badge ${getStatusClass(
                              transfer.status
                            )}`}
                          >
                            {transfer.status}
                          </span>

                          {transfer.stockPostedAt && (
                            <div className="small text-success mt-1">
                              Stock posted
                            </div>
                          )}
                        </td>

                        <td>{formatDate(transfer.createdAt)}</td>

                        <td style={{ minWidth: 220 }}>
                          {transfer.status === "draft" && isRequester && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary me-2 mb-2"
                                onClick={() => submitTransfer(getId(transfer))}
                              >
                                Submit
                              </button>

                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger mb-2"
                                onClick={() => cancelTransfer(getId(transfer))}
                              >
                                Delete / Cancel
                              </button>
                            </>
                          )}

                          {transfer.status === "pending" && isRequester && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger me-2 mb-2"
                              onClick={() => cancelTransfer(getId(transfer))}
                            >
                              Cancel
                            </button>
                          )}

                          {transfer.status === "pending" &&
                            canReview &&
                            !isRequester && (
                              <>
                                <textarea
                                  className="form-control form-control-sm mb-2"
                                  placeholder="Optional review comment"
                                  value={reviewComments[getId(transfer)] || ""}
                                  onChange={(event) =>
                                    setReviewComments((previous) => ({
                                      ...previous,
                                      [getId(transfer)]: event.target.value,
                                    }))
                                  }
                                  maxLength={1000}
                                />

                                <button
                                  type="button"
                                  className="btn btn-sm btn-success me-2 mb-2"
                                  onClick={() =>
                                    reviewTransfer(getId(transfer), "approved")
                                  }
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger mb-2"
                                  onClick={() =>
                                    reviewTransfer(getId(transfer), "rejected")
                                  }
                                >
                                  Reject
                                </button>
                              </>
                            )}

                          {transfer.reviewComment && (
                            <div className="small text-muted mt-1">
                              Review: {transfer.reviewComment}
                            </div>
                          )}

                          {transfer.reviewedBy?.fullName && (
                            <div className="small text-muted">
                              By {transfer.reviewedBy.fullName}
                            </div>
                          )}

                          {transfer.stockPostedAt && (
                            <div className="small text-muted">
                              Posted: {formatDate(transfer.stockPostedAt)}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={loadTransfers}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </section>
    </div>
  );
}
