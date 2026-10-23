
import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { generateReference } from "../utils/referenceGenerator";

const createEmptyForm = () => ({
  name: "",
  code: generateReference("DEP"),
  description: "",
});

function getErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.message ||
    fallback
  );
}

function getDepartmentsFromResponse(body) {
  const records = Array.isArray(body)
    ? body
    : body?.departments ?? body?.data?.departments ?? body?.data;

  if (!Array.isArray(records)) {
    throw new Error("Unexpected response from the departments API.");
  }

  return records;
}

function getUsersFromResponse(body) {
  const records = Array.isArray(body)
    ? body
    : body?.users ?? body?.data?.users ?? body?.data;

  if (!Array.isArray(records)) {
    throw new Error("Unexpected response from the users API.");
  }

  return records;
}

function getId(value) {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
}

function getUserDepartmentId(user) {
  return getId(user.department);
}

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState(null);
  const [assigningUserId, setAssigningUserId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [managingDepartmentId, setManagingDepartmentId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [form, setForm] = useState(createEmptyForm);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDepartments = useCallback(async () => {
    const response = await api.get("/departments");
    const records = getDepartmentsFromResponse(response.data);
    setDepartments(records);
    return records;
  }, []);

  const loadUsers = useCallback(async () => {
    const response = await api.get("/users");
    const records = getUsersFromResponse(response.data);
    setUsers(records);
    return records;
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([loadDepartments(), loadUsers()]);
  }, [loadDepartments, loadUsers]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [departmentResponse, userResponse] = await Promise.all([
          api.get("/departments"),
          api.get("/users"),
        ]);

        const departmentRecords = getDepartmentsFromResponse(
          departmentResponse.data
        );

        const userRecords = getUsersFromResponse(userResponse.data);

        if (active) {
          setDepartments(departmentRecords);
          setUsers(userRecords);
        }
      } catch (err) {
        if (active) {
          setError(
            getErrorMessage(
              err,
              "Could not load departments and users."
            )
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setForm(createEmptyForm());
    setEditingId(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  };

  const handleEdit = (department) => {
    setEditingId(getId(department));

    setForm({
      name: department.name || "",
      code: department.code || "",
      description: department.description || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
    };

    if (!payload.name || !payload.code) {
      setError("Department name and code are required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const wasEditing = Boolean(editingId);

    try {
      if (wasEditing) {
        await api.patch(`/departments/${editingId}`, payload);
      } else {
        await api.post("/departments", payload);
      }

      await loadDepartments();
      resetForm();

      setSuccess(
        wasEditing
          ? "Department updated successfully."
          : "Department created successfully."
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          wasEditing
            ? "Could not update the department."
            : "Could not create the department."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (department) => {
    const id = getId(department);

    if (!id || statusChangingId || assigningUserId) return;

    const nextStatus = !department.isActive;

    if (!nextStatus) {
      const hasAssignedStaff = users.some(
        (user) => getUserDepartmentId(user) === id
      );

      if (hasAssignedStaff) {
        const confirmed = window.confirm(
          "This department has assigned staff. Deactivating it may affect their access or workflows. Continue?"
        );

        if (!confirmed) return;
      }
    }

    setStatusChangingId(id);
    setError("");
    setSuccess("");

    try {
      const response = await api.patch(`/departments/${id}/status`, {
        isActive: nextStatus,
      });

      await loadDepartments();

      setSuccess(
        response.data?.message ||
          `Department ${nextStatus ? "activated" : "deactivated"} successfully.`
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "Could not change department status.")
      );
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleManageStaff = (department) => {
    const id = getId(department);

    setManagingDepartmentId((current) => (current === id ? null : id));
    setSelectedUserId("");
    setError("");
    setSuccess("");
  };

  const handleAssignUser = async (event) => {
    event.preventDefault();

    if (!managingDepartmentId || !selectedUserId || assigningUserId) {
      return;
    }

    const department = departments.find(
      (item) => getId(item) === managingDepartmentId
    );

    if (!department || !department.isActive) {
      setError("Activate the department before assigning staff.");
      return;
    }

    const selectedUser = users.find(
      (user) => getId(user) === selectedUserId
    );

    if (!selectedUser) {
      setError("Select a valid user to assign.");
      return;
    }

    if (getUserDepartmentId(selectedUser) === managingDepartmentId) {
      setError("This user is already assigned to this department.");
      return;
    }

    setAssigningUserId(selectedUserId);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/users/${selectedUserId}`, {
        department: managingDepartmentId,
      });

      await loadUsers();
      setSelectedUserId("");

      setSuccess(
        `${selectedUser.fullName || selectedUser.email} assigned to the department.`
      );
    } catch (err) {
      setError(getErrorMessage(err, "Could not assign this user."));
    } finally {
      setAssigningUserId(null);
    }
  };

  const handleRemoveUser = async (user) => {
    const userId = getId(user);

    if (!userId || assigningUserId) return;

    const confirmed = window.confirm(
      `Remove ${user.fullName || user.email} from this department?`
    );

    if (!confirmed) return;

    setAssigningUserId(userId);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/users/${userId}`, {
        department: null,
      });

      await loadUsers();

      setSuccess(
        `${user.fullName || user.email} has been removed from the department.`
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "Could not remove this user.")
      );
    } finally {
      setAssigningUserId(null);
    }
  };

  const query = search.trim().toLowerCase();

  const filteredDepartments = departments.filter((department) =>
    [department.name, department.code, department.description]
      .filter((value) => typeof value === "string")
      .some((value) => value.toLowerCase().includes(query))
  );

  const managingDepartment = departments.find(
    (department) => getId(department) === managingDepartmentId
  );

  const assignedUsers = users.filter(
    (user) => getUserDepartmentId(user) === managingDepartmentId
  );

  const unassignedUsers = users.filter(
    (user) => !getUserDepartmentId(user) && user.isActive !== false
  );

  return (
    <section className="departments-page">
      <div className="departments-heading">
        <div>
          <p className="users-eyebrow">WORKSPACE / ORGANIZATION</p>
          <h2>Department Management</h2>
          <p>
            Create departments, manage their status, and assign staff members.
          </p>
        </div>

        <button
          type="button"
          className="users-primary-button"
          onClick={() => (showForm ? resetForm() : openCreateForm())}
          disabled={saving}
        >
          {showForm ? "Cancel" : "+ Create Department"}
        </button>
      </div>

      {error && (
        <div className="users-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="users-success" role="status">
          {success}
        </div>
      )}

      {showForm && (
        <form className="create-user-form" onSubmit={handleSubmit}>
          <div className="create-user-form-heading">
            <h3>{editingId ? "Edit Department" : "Create Department"}</h3>
            <p>Enter the department's details below.</p>
          </div>

          <div className="create-user-grid">
            <div className="create-user-field">
              <label htmlFor="departmentName">Department name *</label>
              <input
                id="departmentName"
                name="name"
                value={form.name}
                onChange={handleChange}
                maxLength={100}
                autoComplete="organization-title"
                required
                disabled={saving}
              />
            </div>

            <div className="create-user-field">
              <label htmlFor="departmentCode">Department code *</label>
              <input
                id="departmentCode"
                name="code"
                value={form.code}
                onChange={handleChange}
                maxLength={60}
                required
                readOnly={!editingId}
                disabled={saving}
              />
              {!editingId && (
                <small className="text-muted">
                  Generated automatically
                </small>
              )}
            </div>

            <div className="create-user-field department-description">
              <label htmlFor="departmentDescription">Description</label>
              <textarea
                id="departmentDescription"
                name="description"
                value={form.description}
                onChange={handleChange}
                maxLength={500}
                rows={3}
                disabled={saving}
              />
            </div>
          </div>

          <div className="create-user-actions">
            <button
              type="button"
              className="users-secondary-button"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="users-primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Create Department"}
            </button>
          </div>
        </form>
      )}

      <div className="department-summary-grid">
        <div className="department-summary-card">
          <span>Total Departments</span>
          <strong>{departments.length}</strong>
        </div>

        <div className="department-summary-card">
          <span>Active Departments</span>
          <strong>
            {departments.filter((department) => department.isActive).length}
          </strong>
        </div>

        <div className="department-summary-card">
          <span>Inactive Departments</span>
          <strong>
            {departments.filter((department) => !department.isActive).length}
          </strong>
        </div>

        <div className="department-summary-card">
          <span>Assigned Staff</span>
          <strong>
            {users.filter((user) => Boolean(getUserDepartmentId(user))).length}
          </strong>
        </div>
      </div>

      <div className="departments-toolbar">
        <input
          type="search"
          aria-label="Search departments"
          placeholder="Search departments..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <span className="users-count">
          {filteredDepartments.length} of {departments.length} departments
        </span>
      </div>

      {loading ? (
        <p className="users-message" role="status">
          Loading departments and users...
        </p>
      ) : (
        <>
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredDepartments.map((department) => {
                  const id = getId(department);
                  const isActive = Boolean(department.isActive);
                  const isChanging = statusChangingId === id;

                  const staffCount = users.filter(
                    (user) => getUserDepartmentId(user) === id
                  ).length;

                  return (
                    <tr key={id}>
                      <td>
                        <strong>{department.name}</strong>
                      </td>
                      <td>{department.code || "—"}</td>
                      <td>{department.description || "—"}</td>
                      <td>{staffCount}</td>
                      <td>
                        <span
                          className={`user-status ${
                            isActive
                              ? "user-status-active"
                              : "user-status-inactive"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="department-actions">
                          <button
                            type="button"
                            className="department-action-button"
                            onClick={() => handleManageStaff(department)}
                            disabled={Boolean(assigningUserId)}
                          >
                            {managingDepartmentId === id
                              ? "Close Staff"
                              : "Manage Staff"}
                          </button>

                          <button
                            type="button"
                            className="department-action-button"
                            onClick={() => handleEdit(department)}
                            disabled={saving || Boolean(statusChangingId)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="department-action-button"
                            onClick={() => handleStatusChange(department)}
                            disabled={saving || Boolean(statusChangingId)}
                          >
                            {isChanging
                              ? "Updating..."
                              : isActive
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredDepartments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="users-empty">
                      {departments.length
                        ? "No departments match your search."
                        : "No departments created yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {managingDepartment && (
            <div className="create-user-form department-staff-panel">
              <div className="create-user-form-heading">
                <h3>Manage Staff — {managingDepartment.name}</h3>
                <p>
                  Assign existing users to this department or remove their
                  current assignment.
                </p>
              </div>

              {managingDepartment.isActive ? (
                <form
                  className="department-assign-form"
                  onSubmit={handleAssignUser}
                >
                  <div className="create-user-field">
                    <label htmlFor="assignDepartmentUser">
                      Select an unassigned user
                    </label>
                    <select
                      id="assignDepartmentUser"
                      value={selectedUserId}
                      onChange={(event) =>
                        setSelectedUserId(event.target.value)
                      }
                      disabled={Boolean(assigningUserId)}
                    >
                      <option value="">Choose a user...</option>

                      {unassignedUsers.map((user) => (
                        <option key={getId(user)} value={getId(user)}>
                          {user.fullName} — {user.email} (
                          {String(user.role || "").replaceAll("_", " ")})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="users-primary-button"
                    disabled={!selectedUserId || Boolean(assigningUserId)}
                  >
                    {assigningUserId ? "Assigning..." : "Assign User"}
                  </button>
                </form>
              ) : (
                <p className="users-message">
                  This department is inactive. Activate it before assigning
                  additional users.
                </p>
              )}

              <h4>Assigned Staff ({assignedUsers.length})</h4>

              {assignedUsers.length === 0 ? (
                <p className="users-message">
                  No users are assigned to this department yet.
                </p>
              ) : (
                <div className="users-table-wrap">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Account Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {assignedUsers.map((user) => {
                        const userId = getId(user);

                        return (
                          <tr key={userId}>
                            <td>
                              <strong>{user.fullName}</strong>
                            </td>
                            <td>{user.email}</td>
                            <td>
                              {String(user.role || "").replaceAll("_", " ")}
                            </td>
                            <td>
                              {user.isActive ? "Active" : "Inactive"}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="department-action-button"
                                onClick={() => handleRemoveUser(user)}
                                disabled={Boolean(assigningUserId)}
                              >
                                {assigningUserId === userId
                                  ? "Removing..."
                                  : "Remove"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
