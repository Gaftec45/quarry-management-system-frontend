import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../lib/api";

const roleLabels = {
  super_admin: "Super Admin",
  general_manager: "General Manager",
  department_manager: "Department Manager",
  data_entry_officer: "Data Entry Officer",
  viewer_auditor: "Viewer / Auditor",
};

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  role: "data_entry_officer",
  department: "",
};

const getRecords = (body, key) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data?.[key])) return body.data[key];
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.[key])) return body[key];
  return [];
};

const getUserId = (user) => user?._id || user?.id;

const getDepartmentId = (department) => {
  if (!department) return "";
  if (typeof department === "object") {
    return String(department._id || department.id || "");
  }
  return String(department);
};

const getCurrentUser = (response) =>
  response?.data?.data?.user ??
  response?.data?.user ??
  response?.data?.data ??
  response?.data;

export default function Users() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [departmentChanges, setDepartmentChanges] = useState({});

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadUsers = useCallback(async () => {
    const response = await api.get("/users");
    const records = getRecords(response.data, "users");
    setUsers(records);
    return records;
  }, []);

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [usersResponse, departmentsResponse, meResponse] =
        await Promise.all([
          api.get("/users"),
          api.get("/departments"),
          api.get("/auth/me"),
        ]);

      const userRecords = getRecords(usersResponse.data, "users");
      const departmentRecords = getRecords(
        departmentsResponse.data,
        "departments"
      );

      const me = getCurrentUser(meResponse);

      setUsers(userRecords);
      setDepartments(departmentRecords);
      setCurrentUserId(String(getUserId(me) || ""));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not load users and departments."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter((user) =>
      [
        user.fullName,
        user.email,
        roleLabels[user.role] || user.role,
        user.department?.name,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [users, search]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 12) {
      setError("The initial password must contain at least 12 characters.");
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: form.role,
      department: form.department || null,
    };

    try {
      setSaving(true);

      await api.post("/users", payload);
      await loadUsers();

      setForm(initialForm);
      setShowForm(false);
      setSuccess("Staff account created successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create the staff account."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDepartmentChange = (userId, departmentId) => {
    setDepartmentChanges((current) => ({
      ...current,
      [String(userId)]: departmentId,
    }));

    setError("");
    setSuccess("");
  };

  const handleSaveDepartment = async (user) => {
    const userId = String(getUserId(user) || "");

    if (!userId) {
      setError("This user has no valid ID.");
      return;
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        departmentChanges,
        userId
      )
    ) {
      return;
    }

    const departmentId = departmentChanges[userId];

    if (departmentId) {
      const selectedDepartment = departments.find(
        (department) =>
          String(department._id || department.id) ===
          String(departmentId)
      );

      if (!selectedDepartment) {
        setError("The selected department could not be found.");
        return;
      }

      if (selectedDepartment.isActive === false) {
        setError("You cannot assign a user to an inactive department.");
        return;
      }
    }

    setError("");
    setSuccess("");
    setUpdatingUserId(userId);

    try {
      await api.patch(`/users/${userId}`, {
        department: departmentId || null,
      });

      await loadUsers();

      setDepartmentChanges((current) => {
        const updated = { ...current };
        delete updated[userId];
        return updated;
      });

      setSuccess(
        `Department updated for ${user.fullName || user.email}.`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not update this user's department."
      );
    } finally {
      setUpdatingUserId("");
    }
  };

  const handleToggleStatus = async (user) => {
    const userId = getUserId(user);
    const nextStatus = !user.isActive;

    if (!userId) {
      setError("This user has no valid ID.");
      return;
    }

    if (String(userId) === currentUserId && !nextStatus) {
      setError("You cannot deactivate your own account.");
      return;
    }

    const action = nextStatus ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${
        user.fullName || user.email
      }?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setUpdatingUserId(String(userId));

    try {
      const response = await api.patch(
        `/users/${userId}/status`,
        { isActive: nextStatus }
      );

      const updatedUser =
        response.data?.user ??
        response.data?.data?.user;

      setUsers((currentUsers) =>
        currentUsers.map((item) => {
          if (
            String(getUserId(item)) !== String(userId)
          ) {
            return item;
          }

          return {
            ...item,
            ...(updatedUser || {}),
            isActive: nextStatus,
          };
        })
      );

      setSuccess(
        response.data?.message ||
          `User ${nextStatus ? "activated" : "deactivated"} successfully.`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Could not ${action} this account.`
      );
    } finally {
      setUpdatingUserId("");
    }
  };

  return (
    <section className="users-page">
      <div className="users-heading">
        <div>
          <p className="users-eyebrow">
            WORKSPACE / ACCESS CONTROL
          </p>
          <h2>Staff Management</h2>
          <p>
            Manage staff accounts, departments and access roles.
          </p>
        </div>

        <button
          type="button"
          className="users-primary-button"
          onClick={() => {
            setShowForm((value) => !value);
            setError("");
            setSuccess("");
          }}
          disabled={saving}
        >
          {showForm ? "Cancel" : "+ Create User"}
        </button>
      </div>

      {success && (
        <div className="users-success" role="status">
          {success}
        </div>
      )}

      {error && (
        <div className="users-error" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <form className="create-user-form" onSubmit={handleCreate}>
          <div className="create-user-form-heading">
            <h3>Create staff account</h3>
            <p>Fields marked with * are required.</p>
          </div>

          <div className="create-user-grid">
            <div className="create-user-field">
              <label htmlFor="fullName">Full name *</label>
              <input
                id="fullName"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                maxLength={120}
                autoComplete="name"
                required
              />
            </div>

            <div className="create-user-field">
              <label htmlFor="email">Email address *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="create-user-field">
              <label htmlFor="password">Initial password *</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                minLength={12}
                autoComplete="new-password"
                required
              />
              <small>Use at least 12 characters.</small>
            </div>

            <div className="create-user-field">
              <label htmlFor="role">Role *</label>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="create-user-field">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                name="department"
                value={form.department}
                onChange={handleChange}
              >
                <option value="">Unassigned</option>

                {departments.map((department) => {
                  const departmentId = String(
                    department._id || department.id
                  );

                  return (
                    <option
                      key={departmentId}
                      value={departmentId}
                      disabled={department.isActive === false}
                    >
                      {department.name}
                      {department.isActive === false
                        ? " (Inactive)"
                        : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="create-user-actions">
            <button
              type="button"
              className="users-secondary-button"
              onClick={() => {
                setShowForm(false);
                setForm(initialForm);
                setError("");
              }}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="users-primary-button"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      )}

      <div className="users-toolbar">
        <input
          type="search"
          aria-label="Search staff"
          placeholder="Search name, email, role or department..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <span className="users-count">
          {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {loading ? (
        <p className="users-message">
          Loading staff accounts...
        </p>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Role</th>
                <th>Department assignment</th>
                <th>Status</th>
                <th>Account action</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => {
                const userId = String(getUserId(user) || "");
                const isSelf = userId === currentUserId;
                const isUpdating = updatingUserId === userId;

                const currentDepartmentId = getDepartmentId(
                  user.department
                );

                const selectedDepartmentId =
                  departmentChanges[userId] ??
                  currentDepartmentId;

                const hasDepartmentChange =
                  Object.prototype.hasOwnProperty.call(
                    departmentChanges,
                    userId
                  ) &&
                  departmentChanges[userId] !==
                    currentDepartmentId;

                return (
                  <tr key={userId}>
                    <td>
                      <strong>
                        {user.fullName || "Unnamed user"}
                      </strong>
                      <span className="users-email">
                        {user.email}
                      </span>
                    </td>

                    <td>
                      {roleLabels[user.role] || user.role || "—"}
                    </td>

                    <td>
                      <div className="users-department-control">
                        <select
                          aria-label={`Department for ${
                            user.fullName || user.email
                          }`}
                          value={selectedDepartmentId}
                          onChange={(event) =>
                            handleDepartmentChange(
                              userId,
                              event.target.value
                            )
                          }
                          disabled={isUpdating}
                        >
                          <option value="">Unassigned</option>

                          {departments.map((department) => {
                            const departmentId = String(
                              department._id || department.id
                            );

                            return (
                              <option
                                key={departmentId}
                                value={departmentId}
                                disabled={
                                  department.isActive === false &&
                                  departmentId !== currentDepartmentId
                                }
                              >
                                {department.name}
                                {department.isActive === false
                                  ? " (Inactive)"
                                  : ""}
                              </option>
                            );
                          })}
                        </select>

                        <button
                          type="button"
                          className="users-secondary-button"
                          onClick={() =>
                            handleSaveDepartment(user)
                          }
                          disabled={
                            isUpdating || !hasDepartmentChange
                          }
                        >
                          {isUpdating ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`user-status ${
                          user.isActive
                            ? "user-status-active"
                            : "user-status-inactive"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={
                          user.isActive
                            ? "users-secondary-button"
                            : "users-primary-button"
                        }
                        onClick={() => handleToggleStatus(user)}
                        disabled={
                          isUpdating || (isSelf && user.isActive)
                        }
                        title={
                          isSelf
                            ? "You cannot deactivate your own account"
                            : undefined
                        }
                      >
                        {isUpdating
                          ? "Updating..."
                          : user.isActive
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="users-empty">
                    {users.length
                      ? "No users match your search."
                      : "No staff accounts found."}
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