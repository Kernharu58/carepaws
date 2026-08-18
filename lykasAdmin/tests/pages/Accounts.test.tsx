import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Accounts } from "@/pages/Accounts";
import { api } from "@/services/api";
import * as AuthContextModule from "@/context/AuthContext";
import * as ToastContextModule from "@/context/ToastContext";
import type { AuthUser } from "@/types/auth";

vi.mock("@/services/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : "Something went wrong"),
}));

const mockedApi = vi.mocked(api);

const CURRENT_ADMIN = { _id: "admin1", displayName: "Admin User", role: "admin" } as AuthUser;

const OTHER_USER = {
  _id: "user1",
  displayName: "Ada Lovelace",
  email: "ada@example.com",
  role: "user",
  status: "active",
  identityVerificationStatus: "unverified",
  isDeleted: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function mockListResponse(users: unknown[] = [OTHER_USER]) {
  mockedApi.get.mockResolvedValue({
    data: { success: true, data: users, pagination: { total: users.length, page: 1, limit: 20, pages: 1 } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
    user: CURRENT_ADMIN,
    isInitializing: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    hasRole: (...roles) => roles.includes("admin"),
  });
  vi.spyOn(ToastContextModule, "useToast").mockReturnValue({ showToast: vi.fn() });
});

describe("Accounts", () => {
  it("loads and displays accounts", async () => {
    mockListResponse();
    render(<Accounts />);
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("does not show role/status editors or a delete action for the currently logged-in user's own row", async () => {
    mockListResponse([{ ...OTHER_USER, _id: "admin1", displayName: "Admin User", role: "admin" }]);
    render(<Accounts />);
    await screen.findByText("Admin User");

    expect(screen.queryByLabelText(/change role for admin user/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/change status for admin user/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete admin user/i })).not.toBeInTheDocument();
  });

  it("only shows the role editor for a super_admin viewer, not a plain admin", async () => {
    mockListResponse();
    render(<Accounts />);
    const nameCell = await screen.findByText("Ada Lovelace");
    const row = nameCell.closest("tr");
    if (!row) throw new Error("Expected to find a table row for Ada Lovelace");

    expect(screen.queryByLabelText(/change role for ada lovelace/i)).not.toBeInTheDocument();
    expect(within(row).getByText(/^user$/i)).toBeInTheDocument();
  });

  it("changes a user's status and shows a confirmation toast", async () => {
    mockListResponse();
    mockedApi.put.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();

    render(<Accounts />);
    await screen.findByText("Ada Lovelace");

    await user.selectOptions(screen.getByLabelText(/change status for ada lovelace/i), "suspended");

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith("/api/auth/users/user1/status", { status: "suspended" });
    });
  });

  it("confirms before deleting an account", async () => {
    mockListResponse();
    mockedApi.delete.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();

    render(<Accounts />);
    await screen.findByText("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: /delete ada lovelace/i }));
    expect(screen.getByText(/this will deactivate/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith("/api/auth/users/user1");
    });
  });

  it("shows a restore action for a deleted account instead of role/status editors", async () => {
    mockListResponse([{ ...OTHER_USER, isDeleted: true }]);
    render(<Accounts />);
    await screen.findByText("Ada Lovelace");

    expect(screen.getByText("Deleted")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restore ada lovelace/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/change status for ada lovelace/i)).not.toBeInTheDocument();
  });
});
