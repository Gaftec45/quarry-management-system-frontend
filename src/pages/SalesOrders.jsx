
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyLine = () => ({
  product: "",
  quantity: 1,
  unit: "ton",
  unitPrice: 0,
});

const createEmptyForm = () => ({
  orderNumber: generateReference("SO"),
  customer: "",
  currency: "NGN",
  paymentTerms: "Net 30",
  deliveryDestination: "",
  notes: "",
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

export default function SalesOrders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [ordersRes, customersRes, materialsRes] =
        await Promise.all([
          api.get("/sales/orders"),
          api.get("/sales/customers"),
          api.get("/sales/materials"),
        ]);

      setOrders(getList(ordersRes, "orders"));
      setCustomers(getList(customersRes, "customers"));
      setMaterials(getList(materialsRes, "materials"));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load sales orders, customers, and materials."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
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

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.customer) {
      setError("Please select a customer.");
      return;
    }

    if (!form.items.length) {
      setError("Add at least one item to the sales order.");
      return;
    }

    const invalidItem = form.items.some(
      (item) =>
        !item.product ||
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) <= 0 ||
        !Number.isFinite(Number(item.unitPrice)) ||
        Number(item.unitPrice) < 0
    );

    if (invalidItem) {
      setError(
        "Select a material for every item. Quantity must be greater than zero, and price cannot be negative."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        orderNumber: form.orderNumber.trim(),
        deliveryDestination: form.deliveryDestination.trim(),
        paymentTerms: form.paymentTerms.trim(),
        notes: form.notes.trim(),
        items: form.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      await api.post("/sales/orders", payload);

      setForm(createEmptyForm());
      setSuccess("Sales order created successfully.");

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create sales order."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Create sales order</h2>

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
            <div className="col-md-3">
              <label className="form-label">Order number</label>
              <input
                className="form-control"
                value={form.orderNumber}
                readOnly
                required
              />
              <small className="text-muted">
                Generated automatically
              </small>
            </div>

            <div className="col-md-3">
              <label className="form-label">Customer *</label>
              <select
                className="form-select"
                value={form.customer}
                onChange={(e) =>
                  updateForm("customer", e.target.value)
                }
                required
              >
                <option value="">Select customer</option>

                {customers.map((customer) => (
                  <option
                    key={getId(customer)}
                    value={getId(customer)}
                  >
                    {customer.customerReference
                      ? `${customer.customerReference} - `
                      : ""}
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
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
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">
                Delivery destination
              </label>
              <input
                className="form-control"
                placeholder="Delivery destination"
                value={form.deliveryDestination}
                onChange={(e) =>
                  updateForm(
                    "deliveryDestination",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Payment terms</label>
              <input
                className="form-control"
                value={form.paymentTerms}
                onChange={(e) =>
                  updateForm("paymentTerms", e.target.value)
                }
              />
            </div>

            <div className="col-12">
              <hr />
              <h3 className="h6">Order items</h3>
            </div>

            {form.items.map((item, index) => (
              <div className="col-12" key={index}>
                <div className="row g-2 align-items-end">
                  <div className="col-md-5">
                    <label className="form-label">
                      Material *
                    </label>
                    <select
                      className="form-select"
                      value={item.product}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "product",
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
                      min="0.001"
                      step="any"
                      className="form-control"
                      value={item.quantity}
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
                      value={item.unit}
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
                      Unit price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-control"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "unitPrice",
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="col-md-1">
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => removeLine(index)}
                      disabled={form.items.length === 1}
                      title="Remove item"
                      aria-label={`Remove item ${index + 1}`}
                    >
                      ×
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
                Add item
              </button>

              {materials.length === 0 && !loading && (
                <p className="text-muted mt-2 mb-0">
                  No materials found. Add or activate materials first.
                </p>
              )}
            </div>

            <div className="col-12">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Notes"
                value={form.notes}
                onChange={(e) =>
                  updateForm("notes", e.target.value)
                }
              />
            </div>

            <div className="col-12">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  saving ||
                  loading ||
                  customers.length === 0 ||
                  materials.length === 0
                }
              >
                {saving ? "Creating..." : "Create order"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h5 mb-3">Sales orders</h2>

          {loading ? (
            <p>Loading sales orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-muted">
              No sales orders found.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={getId(order)}>
                      <td>{order.orderNumber || "—"}</td>
                      <td>
                        {typeof order.customer === "object"
                          ? order.customer?.name || "—"
                          : customers.find(
                              (customer) =>
                                getId(customer) === order.customer
                            )?.name || "—"}
                      </td>
                      <td>{order.status || "—"}</td>
                      <td>
                        {order.total ?? "—"} {order.currency || ""}
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
