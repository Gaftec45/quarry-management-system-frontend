
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyLine = () => ({
  material: "",
  quantity: 1,
  unit: "ton",
  unitCost: 0,
});

const createEmptyForm = () => ({
  poNumber: generateReference("PO"),
  supplier: "",
  currency: "NGN",
  items: [createEmptyLine()],
});

function getList(response, key) {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

function getId(record) {
  return record?._id || record?.id || "";
}

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [ordersRes, suppliersRes, materialsRes] =
        await Promise.all([
          api.get("/procurement/purchase-orders"),
          api.get("/procurement/suppliers"),
          api.get("/sales/materials"),
        ]);

      setOrders(getList(ordersRes, "orders"));
      setSuppliers(getList(suppliersRes, "suppliers"));
      setMaterials(getList(materialsRes, "materials"));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load purchase orders, suppliers, and materials."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  };

  const updateLine = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      ),
    }));

    setError("");
    setSuccess("");
  };

  const addLine = () => {
    setForm((previous) => ({
      ...previous,
      items: [...previous.items, createEmptyLine()],
    }));
  };

  const removeLine = (index) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.filter((_, i) => i !== index),
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.supplier) {
      setError("Please select a supplier.");
      return;
    }

    if (form.items.length === 0) {
      setError("Add at least one purchase order item.");
      return;
    }

    const invalidItem = form.items.some(
      (item) =>
        !item.material ||
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) <= 0 ||
        !Number.isFinite(Number(item.unitCost)) ||
        Number(item.unitCost) < 0
    );

    if (invalidItem) {
      setError(
        "Select a material for every line. Quantity must be greater than zero, and unit cost cannot be negative."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        poNumber: form.poNumber.trim(),
        items: form.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
        })),
      };

      await api.post("/procurement/purchase-orders", payload);

      setForm(createEmptyForm());
      setSuccess("Purchase order created successfully.");

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create purchase order."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Create purchase order</h2>

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

          <form onSubmit={submit} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">PO number</label>
              <input
                className="form-control"
                value={form.poNumber}
                readOnly
                required
              />
              <small className="text-muted">
                Generated automatically
              </small>
            </div>

            <div className="col-md-4">
              <label className="form-label">Supplier *</label>
              <select
                className="form-select"
                value={form.supplier}
                onChange={(e) =>
                  updateForm("supplier", e.target.value)
                }
                required
              >
                <option value="">Select supplier</option>

                {suppliers.map((supplier) => (
                  <option
                    key={getId(supplier)}
                    value={getId(supplier)}
                  >
                    {supplier.supplierCode
                      ? `${supplier.supplierCode} - `
                      : ""}
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Currency</label>
              <select
                className="form-select"
                value={form.currency}
                onChange={(e) =>
                  updateForm("currency", e.target.value)
                }
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
                <option value="ZAR">ZAR</option>
                <option value="KES">KES</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div className="col-12">
              <hr />
              <h3 className="h6">Purchase order items</h3>
            </div>

            {form.items.map((line, index) => (
              <div className="col-12" key={index}>
                <div className="row g-2 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label">
                      Material *
                    </label>
                    <select
                      className="form-select"
                      value={line.material}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "material",
                          e.target.value
                        )
                      }
                      required
                    >
                      <option value="">Select material</option>

                      {materials.map((material) => (
                        <option
                          key={getId(material)}
                          value={getId(material)}
                        >
                          {material.code
                            ? `${material.code} - `
                            : ""}
                          {material.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-2">
                    <label className="form-label">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="0.001"
                      step="any"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "quantity",
                          e.target.value
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
                    >
                      <option value="ton">ton</option>
                      <option value="kg">kg</option>
                      <option value="m3">m³</option>
                      <option value="bag">bag</option>
                      <option value="piece">piece</option>
                      <option value="litre">litre</option>
                    </select>
                  </div>

                  <div className="col-md-2">
                    <label className="form-label">
                      Unit cost *
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step="any"
                      value={line.unitCost}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "unitCost",
                          e.target.value
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
                      disabled={form.items.length === 1}
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
                disabled={materials.length === 0}
              >
                Add line
              </button>

              {materials.length === 0 && !loading && (
                <p className="text-muted mt-2 mb-0">
                  No materials found. Add or activate materials first.
                </p>
              )}
            </div>

            <div className="col-12">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  saving ||
                  loading ||
                  suppliers.length === 0 ||
                  materials.length === 0
                }
              >
                {saving ? "Saving..." : "Save purchase order"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Purchase order list</h2>

          {loading ? (
            <p>Loading purchase orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-muted mb-0">
              No purchase orders found.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>PO number</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={getId(order)}>
                      <td>{order.poNumber || "—"}</td>
                      <td>
                        {typeof order.supplier === "object"
                          ? order.supplier?.name || "—"
                          : suppliers.find(
                              (supplier) =>
                                getId(supplier) === order.supplier
                            )?.name || "—"}
                      </td>
                      <td>{order.status || "—"}</td>
                      <td>
                        {order.total ?? "—"}{" "}
                        {order.currency || ""}
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
