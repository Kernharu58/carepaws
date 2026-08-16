import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PetManagement } from "@/pages/PetManagement";
import { api } from "@/services/api";
import * as AuthContextModule from "@/context/AuthContext";
import * as ToastContextModule from "@/context/ToastContext";
import type { AuthUser } from "@/types/auth";

vi.mock("@/services/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : "Something went wrong"),
  getFieldErrors: () => ({}),
}));

const mockedApi = vi.mocked(api);

const SAMPLE_PET = {
  _id: "pet1",
  name: "Biscuit",
  species: "Dog",
  breed: "Mix",
  gender: "Male",
  status: "Available",
  isDeleted: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function mockListResponse(pets: unknown[] = [SAMPLE_PET]) {
  mockedApi.get.mockResolvedValue({
    data: { success: true, data: pets, pagination: { total: pets.length, page: 1, limit: 20, pages: 1 } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
    user: { role: "admin" } as AuthUser,
    isInitializing: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    hasRole: (...roles) => roles.includes("admin"),
  });
  vi.spyOn(ToastContextModule, "useToast").mockReturnValue({ showToast: vi.fn() });
});

describe("PetManagement", () => {
  it("loads and displays pets from /api/pets/admin", async () => {
    mockListResponse();
    render(<PetManagement />);

    expect(await screen.findByText("Biscuit")).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalledWith(
      "/api/pets/admin",
      expect.objectContaining({ params: expect.objectContaining({ page: 1 }) })
    );
  });

  it("shows an empty state when no pets match the filters", async () => {
    mockListResponse([]);
    render(<PetManagement />);
    expect(await screen.findByText(/no pets match these filters/i)).toBeInTheDocument();
  });

  it("opens the add-pet modal and submits a new pet", async () => {
    mockListResponse();
    mockedApi.post.mockResolvedValue({ data: { success: true, data: { ...SAMPLE_PET, _id: "pet2", name: "Nugget" } } });
    const user = userEvent.setup();

    render(<PetManagement />);
    await screen.findByText("Biscuit");

    await user.click(screen.getByRole("button", { name: /add pet/i }));
    const dialog = screen.getByRole("dialog");

    await user.type(within(dialog).getByLabelText(/^name$/i), "Nugget");
    await user.selectOptions(within(dialog).getByLabelText(/species/i), "Dog");
    await user.selectOptions(within(dialog).getByLabelText(/gender/i), "Male");

    await user.click(within(dialog).getByRole("button", { name: /^add pet$/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith("/api/pets", expect.objectContaining({ name: "Nugget" }));
    });
  });

  it("confirms before deleting a pet, and calls the delete endpoint on confirm", async () => {
    mockListResponse();
    mockedApi.delete.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();

    render(<PetManagement />);
    await screen.findByText("Biscuit");

    await user.click(screen.getByRole("button", { name: /delete biscuit/i }));
    expect(screen.getByText(/this will remove/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith("/api/pets/pet1");
    });
  });

  it("hides the permanent-delete action for admin (non-super_admin) viewing a deleted pet", async () => {
    mockListResponse([{ ...SAMPLE_PET, isDeleted: true }]);
    render(<PetManagement />);
    await screen.findByText("Biscuit");

    expect(screen.queryByRole("button", { name: /permanently delete biscuit/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restore biscuit/i })).toBeInTheDocument();
  });

  it("shows the permanent-delete action for a super_admin viewing a deleted pet", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: { role: "super_admin" } as AuthUser,
      isInitializing: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasRole: () => true,
    });
    mockListResponse([{ ...SAMPLE_PET, isDeleted: true }]);
    render(<PetManagement />);
    await screen.findByText("Biscuit");

    expect(screen.getByRole("button", { name: /permanently delete biscuit/i })).toBeInTheDocument();
  });
});
