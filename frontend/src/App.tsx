import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";

// Pages
import LandingPage from "./pages/LandingPage";
import PricingPage from "./pages/PricingPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import SignupPage from "./pages/auth/SignupPage";
import LoginPage from "./pages/auth/LoginPage";
import TwoFaPage from "./pages/auth/TwoFaPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import CheckoutPage from "./pages/CheckoutPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import BotsListPage from "./pages/bots/BotsListPage";
import NewBotPage from "./pages/bots/NewBotPage";
import BotDetailPage from "./pages/bots/BotDetailPage";
import BillingPage from "./pages/billing/BillingPage";
import SettingsPage from "./pages/settings/SettingsPage";

// Admin Pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminDebugLogsPage from "./pages/admin/AdminDebugLogsPage";
import { AdminUsersPage }      from "./pages/admin/AdminUsersPage";
import { AdminContainersPage } from "./pages/admin/AdminContainersPage";
import { AdminCouponsPage }    from "./pages/admin/AdminCouponsPage";
import { AdminTrialCodesPage } from "./pages/admin/AdminTrialCodesPage";
import { AdminBroadcastPage }  from "./pages/admin/AdminBroadcastPage";
import { AdminPaymentsPage }   from "./pages/admin/AdminPaymentsPage";
import { AdminAuditLogPage }   from "./pages/admin/AdminAuditLogPage";
import AdminPlansPage          from "./pages/admin/AdminPlansPage";

import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/login/2fa" component={TwoFaPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/checkout" component={CheckoutPage} />

      {/* Protected Routes */}
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/bots" component={BotsListPage} />
      <ProtectedRoute path="/bots/new" component={NewBotPage} />
      <ProtectedRoute path="/bots/:id" component={BotDetailPage} />
      <ProtectedRoute path="/bots/:id/:tab" component={BotDetailPage} />
      <ProtectedRoute path="/billing" component={BillingPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />

      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminDashboardPage} adminOnly />
      <ProtectedRoute path="/admin/users" component={AdminUsersPage} adminOnly />
      <ProtectedRoute path="/admin/containers" component={AdminContainersPage} adminOnly />
      <ProtectedRoute path="/admin/plans" component={AdminPlansPage} adminOnly />
      <ProtectedRoute path="/admin/coupons" component={AdminCouponsPage} adminOnly />
      <ProtectedRoute path="/admin/trial-codes" component={AdminTrialCodesPage} adminOnly />
      <ProtectedRoute path="/admin/broadcast" component={AdminBroadcastPage} adminOnly />
      <ProtectedRoute path="/admin/payments" component={AdminPaymentsPage} adminOnly />
      <ProtectedRoute path="/admin/audit-log" component={AdminAuditLogPage} adminOnly />
      <ProtectedRoute path="/admin/debug-logs" component={AdminDebugLogsPage} adminOnly />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
