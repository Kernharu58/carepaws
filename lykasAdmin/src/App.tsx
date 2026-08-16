import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { Login } from "@/pages/Login";
import { ForgotPassword } from "@/pages/ForgotPassword";
import { ResetPassword } from "@/pages/ResetPassword";
import { VerifyEmail } from "@/pages/VerifyEmail";
import { Dashboard } from "@/pages/Dashboard";
import { ManagePets } from "@/pages/ManagePets";
import { PetManagement } from "@/pages/PetManagement";
import { AdoptionForm } from "@/pages/AdoptionForm";
import { Adoptions } from "@/pages/Adoptions";

/**
 * Only routes for pages that actually exist are wired here — every other
 * §7.2 page (Analytics, Inventory, Interviews, Fosters, Events, Chat,
 * StaffManagement, ...) lands as its own slice, same practice as the
 * backend's incremental route mounting in server.js.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route
                path="/"
                element={
                  <ErrorBoundary>
                    <Dashboard />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/pets"
                element={
                  <ErrorBoundary>
                    <ManagePets />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/pets/management"
                element={
                  <ErrorBoundary>
                    <PetManagement />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/applications"
                element={
                  <ErrorBoundary>
                    <Adoptions />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/applications/new"
                element={
                  <ErrorBoundary>
                    <AdoptionForm />
                  </ErrorBoundary>
                }
              />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
