import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import * as AuthContextModule from "@/context/AuthContext";
import type { AuthUser } from "@/types/auth";

function mockAuth(overrides: Partial<ReturnType<typeof AuthContextModule.useAuth>>) {
  vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
    user: null,
    isInitializing: false,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    hasRole: () => false,
    ...overrides,
  });
}

function renderProtected(roles?: AuthUser["role"][]) {
  return render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/" element={<div>Home page</div>} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute roles={roles}>
              <div>Secret content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading state while the session is still initializing", () => {
    mockAuth({ isInitializing: true });
    renderProtected();
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
  });

  it("redirects to /login when not authenticated", () => {
    mockAuth({ isAuthenticated: false });
    renderProtected();
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
  });

  it("renders the protected content for an authenticated user with no role restriction", () => {
    mockAuth({ isAuthenticated: true, user: { role: "user" } as AuthUser });
    renderProtected();
    expect(screen.getByText("Secret content")).toBeInTheDocument();
  });

  it("renders the protected content when the user has one of the required roles", () => {
    mockAuth({
      isAuthenticated: true,
      user: { role: "admin" } as AuthUser,
      hasRole: (...roles) => roles.includes("admin"),
    });
    renderProtected(["admin", "super_admin"]);
    expect(screen.getByText("Secret content")).toBeInTheDocument();
  });

  it("redirects to / when the authenticated user lacks the required role", () => {
    mockAuth({
      isAuthenticated: true,
      user: { role: "user" } as AuthUser,
      hasRole: (...roles) => roles.includes("user"),
    });
    renderProtected(["admin", "super_admin"]);
    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
  });

  it("denies access for staff when the route requires admin/super_admin", () => {
    mockAuth({
      isAuthenticated: true,
      user: { role: "staff" } as AuthUser,
      hasRole: (...roles) => roles.includes("staff"),
    });
    renderProtected(["admin", "super_admin"]);
    expect(screen.queryByText("Secret content")).not.toBeInTheDocument();
  });
});
