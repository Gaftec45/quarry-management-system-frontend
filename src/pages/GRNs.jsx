
import { useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyLine = () => ({
  material: "",
  quantity: 1,
  unit: "ton",
  unitCost: 0,
});

const createInitialForm = () => ({
  grnNumber: generateReference("GRN"),
  purchaseOrder: "",
  receivingLocation: "",
  items: [createEmptyLine()],
});

function getList(responseData, key) {
  if (Array.isArray(responseData?.[key])) return responseData[key];
  if (Array.isArray(responseData?.data?.[key])) return responseData.data[key];
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData)) return responseData;
  return [];
}

export default function GRNs() {
  const [grns, setGrns] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/procurement/grns");
      setGrns(getList(response.data, "grns"));
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load GRNs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateLine = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((line, lineIndex) =>
        lineIndex === index
          ? { ...line, [field]: value }
          : line
      ),
    }));
  };

  const addLine = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, createEmptyLine()],
    }));
  };

  const removeLine = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter(
        (_, lineIndex) => lineIndex !== index
      ),
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.grnNumber.trim()) {
      setError("GRN number is required.");
      return;
    }

    if (!form.purchaseOrder.trim()) {
      setError("Purchase order ID is required.");
      return;
    }

    if (!form.receivingLocation.trim()) {
      setError("Receiving location ID is required.");
      return;
    }

    if (!form.items.length) {
      setError("Add at least one item to the GRN.");
      return;
    }

    const invalidLine = form.items.findIndex(
      (line) =>
        !line.material.trim() ||
        !Number.isFinite(line.quantity) ||
        line.quantity <= 0 ||
        !Number.isFinite(line.unitCost) ||
        line.unitCost < 0 ||
        !line.unit
    );

    if (invalidLine !== -1) {
      setError(
        `Please check item ${invalidLine + 1}. Material, positive quantity, valid unit, and non-negative unit cost are required.`
      );
      return;
    }

    setSaving(true);

    try {
      await api.post("/procurement/grns", {
        ...form,
        grnNumber: form.grnNumber.trim(),
        purchaseOrder: form.purchaseOrder.trim(),
        receivingLocation: form.receivingLocation.trim(),
        items: form.items.map((line) => ({
          ...line,
          material: line.material.trim(),
          quantity: Number(line.quantity),
          unitCost: Number(line.unitCost),
        })),
      });

      setForm(createInitialForm());
      setSuccess("Goods received note posted successfully.");

      try {
        await load();
      } catch {
        // The posting succeeded; a list refresh failure should not
        // be reported as a failed GRN submission.
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to post GRN."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Post goods received</h2>

          <form onSubmit={submit} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">GRN number</label>
              <input
                className="form-control"
                value={form.grnNumber}
                readOnly
                required
              />
              <small className="text-muted">
                Generated automatically
              </small>
            </div>

            <div className="col-md-4">
              <label className="form-label">Purchase order ID</label>
              <input
                className="form-control"
                placeholder="Enter purchase order ID"
                value={form.purchaseOrder}
                onChange={(e) =>
                  updateField("purchaseOrder", e.target.value)
                }
                required
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">
                Receiving location ID
              </label>
              <input
                className="form-control"
                placeholder="Enter receiving location ID"
                value={form.receivingLocation}
                onChange={(e) =>
                  updateField("receivingLocation", e.target.value)
                }
                required
              />
            </div>

            <div className="col-12">
              <h3 className="h6 mb-0">Received items</h3>
            </div>

            {form.items.map((line, index) => (
              <div
                key={index}
                className="col-12 border rounded p-3"
              >
                <div className="row g-2 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label">
                      Material ID
                    </label>
                    <input
                      className="form-control"
                      placeholder="Enter material ID"
                      value={line.material}
                      onChange={(e) =>
                        updateLine(index, "material", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="col-md-2">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      className="form-control"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "quantity",
                          e.target.value === ""
                            ? ""
                            : Number(e.target.value)
                        )
                      }
                      required
                    />
                  </div>

                  <div className="col-md-2">
                    <label className="form-label">Unit</label>
                    <select
                      className="form-select"
                      value={line.unit}
                      onChange={(e) =>
                        updateLine(index, "unit", e.target.value)
                      }
                      required
                    >
                      <option value="ton">ton</option>
                      <option value="kg">kg</option>
                      <option value="m3">m3</option>
                      <option value="bag">bag</option>
                      <option value="piece">piece</option>
                      <option value="litre">litre</option>
                    </select>
                  </div>

                  <div className="col-md-2">
                    <label className="form-label">Unit cost</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-control"
                      value={line.unitCost}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "unitCost",
                          e.target.value === ""
                            ? ""
                            : Number(e.target.value)
                        )
                      }
                      required
                    />
                  </div>

                  <div className="col-md-2">
                    <button
                      type="button"
                      className="btn btn-outline-danger w-100"
                      onClick={() => removeLine(index)}
                      disabled={form.items.length === 1 || saving}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="col-12">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={addLine}
                disabled={saving}
              >
                Add item
              </button>
            </div>

            <div className="col-12">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Posting..." : "Post GRN"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="status">
          {success}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">GRN log</h2>

          {loading ? (
            <p>Loading...</p>
          ) : grns.length === 0 ? (
            <p className="text-muted mb-0">
              No goods received notes found.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>GRN</th>
                    <th>PO</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {grns.map((grn) => (
                    <tr key={grn._id}>
                      <td>{grn.grnNumber || "—"}</td>
                      <td>
                        {grn.purchaseOrder?.poNumber ||
                          grn.purchaseOrder?.orderNumber ||
                          (typeof grn.purchaseOrder === "string"
                            ? grn.purchaseOrder
                            : "—")}
                      </td>
                      <td>
                        <span className="badge text-bg-secondary">
                          {grn.status || "—"}
                        </span>
                      </td>
                      <td>
                        {grn.receivedDate
                          ? new Date(
                              grn.receivedDate
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
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
