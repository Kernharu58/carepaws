import { useState } from "react";
import { Search, Trash2, RotateCcw } from "lucide-react";
import { PageHeader, Card, Table, Th, Td, Tr, Pagination } from "@/components/ui/SharedUI";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateDisplays";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { statusTone } from "@/components/ui/statusToneMaps";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useListQuery } from "@/hooks/useListQuery";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { api, getErrorMessage } from "@/services/api";
import type { AuthUser, UserRole, UserStatus } from "@/types/auth";

const ROLE_OPTIONS: UserRole[] = ["user", "staff", "admin", "super_admin"];
const STATUS_OPTIONS: UserStatus[] = ["active", "suspended", "locked"];

export function Accounts() {
  const { user: currentUser, hasRole } = useAuth();
  const { showToast } = useToast();
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const { data, pagination, isLoading, error, setPage, q, setQ, refetch } = useListQuery<AuthUser>(
    "/api/auth/users",
    { filters: { role, status, includeDeleted: showDeleted ? "true" : undefined } }
  );

  const [pendingDelete, setPendingDelete] = useState<AuthUser | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  async function handleRoleChange(user: AuthUser, newRole: string) {
    setSavingUserId(user._id);
    try {
      await api.put(`/api/auth/users/${user._id}/role`, { role: newRole });
      showToast(`${user.displayName}'s role updated to ${newRole.replace("_", " ")}.`, "success");
      refetch();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleStatusChange(user: AuthUser, newStatus: string) {
    setSavingUserId(user._id);
    try {
      await api.put(`/api/auth/users/${user._id}/status`, { status: newStatus });
      showToast(`${user.displayName}'s status updated to ${newStatus}.`, "success");
      refetch();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setSavingUserId(pendingDelete._id);
    try {
      await api.delete(`/api/auth/users/${pendingDelete._id}`);
      showToast(`${pendingDelete.displayName} removed.`, "success");
      refetch();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSavingUserId(null);
      setPendingDelete(null);
    }
  }

  async function handleRestore(user: AuthUser) {
    setSavingUserId(user._id);
    try {
      await api.post(`/api/auth/users/${user._id}/restore`);
      showToast(`${user.displayName} restored.`, "success");
      refetch();
    } catch (err) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Manage Accounts" description="View and manage every user's role, status, and verification." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search accounts"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Filter by role"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
          Show deleted
        </label>
      </div>

      {isLoading && <LoadingState label="Loading accounts…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!isLoading && !error && data.length === 0 && <EmptyState title="No accounts match these filters" />}

      {!isLoading && !error && data.length > 0 && (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Verification</Th>
                <Th>Joined</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((user) => {
                const isSelf = user._id === currentUser?._id;
                const isSaving = savingUserId === user._id;
                const isDeleted = Boolean(user.isDeleted);
                return (
                  <Tr key={user._id}>
                    <Td className="font-medium text-gray-900">{user.displayName}</Td>
                    <Td>{user.email}</Td>
                    <Td>
                      {hasRole("super_admin") && !isSelf && !isDeleted ? (
                        <select
                          value={user.role}
                          disabled={isSaving}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          aria-label={`Change role for ${user.displayName}`}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="capitalize text-gray-600">{user.role.replace("_", " ")}</span>
                      )}
                    </Td>
                    <Td>
                      {isDeleted ? (
                        <StatusBadge label="Deleted" tone="danger" />
                      ) : !isSelf ? (
                        <select
                          value={user.status}
                          disabled={isSaving}
                          onChange={(e) => handleStatusChange(user, e.target.value)}
                          aria-label={`Change status for ${user.displayName}`}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge label={user.status} tone={user.status === "active" ? "success" : "danger"} />
                      )}
                    </Td>
                    <Td>
                      <StatusBadge
                        label={user.identityVerificationStatus}
                        tone={statusTone.identityVerification(user.identityVerificationStatus)}
                      />
                    </Td>
                    <Td>{new Date(user.createdAt).toLocaleDateString()}</Td>
                    <Td>
                      {!isSelf && !isDeleted && (
                        <button
                          onClick={() => setPendingDelete(user)}
                          aria-label={`Delete ${user.displayName}`}
                          title="Delete"
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-status-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      {isDeleted && (
                        <button
                          onClick={() => handleRestore(user)}
                          disabled={isSaving}
                          aria-label={`Restore ${user.displayName}`}
                          title="Restore"
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-status-success"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          {pagination && pagination.pages > 1 && <Pagination pagination={pagination} onPageChange={setPage} />}
        </Card>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete account"
        message={`This will deactivate "${pendingDelete?.displayName}"'s account. It can be restored later.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
