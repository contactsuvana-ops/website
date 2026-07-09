import { Switch, Route, Router as WouterRouter } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { AdminShell } from "@/components/admin/AdminShell";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import ServicesPage from "@/pages/ServicesPage";
import ContactPage from "@/pages/ContactPage";
import QuotePage from "@/pages/QuotePage";
import QrRedirectPage from "@/pages/QrRedirectPage";

const DashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const ProspectsPage = lazy(() => import("@/pages/admin/ProspectsPage"));
const EstimatesListPage = lazy(() => import("@/pages/admin/EstimatesListPage"));
const EstimateBuilderPage = lazy(() => import("@/pages/admin/EstimateBuilderPage"));
const CatalogPage = lazy(() => import("@/pages/admin/CatalogPage"));
const AdminServicesPage = lazy(() => import("@/pages/admin/AdminServicesPage"));
const CustomerPortalPage = lazy(() => import("@/pages/CustomerPortalPage"));
const ProjectsListPage = lazy(() => import("@/pages/admin/ProjectsListPage"));
const ProjectDetailPage = lazy(() => import("@/pages/admin/ProjectDetailPage"));
const ProjectTasksPage = lazy(() => import("@/pages/admin/ProjectTasksPage"));
const ProjectLogsPage = lazy(() => import("@/pages/admin/ProjectLogsPage"));
const ProjectCharterPage = lazy(() => import("@/pages/admin/ProjectCharterPage"));
const SiteSettingsPage = lazy(() => import("@/pages/admin/SiteSettingsPage"));

const queryClient = new QueryClient();

const apiBase = import.meta.env.VITE_API_URL || "";

function useSiteVisitTracking() {
  useEffect(() => {
    if (!sessionStorage.getItem("__suvana_sv")) {
      sessionStorage.setItem("__suvana_sv", "1");
      fetch(`${apiBase}/api/qr-scan/site-visit`, { method: "POST" }).catch(() => {});
    }
  }, []);
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAdminRoute>
      <AdminShell>
        <Suspense fallback={<div className="flex items-center justify-center h-full p-12 text-sm text-muted-foreground">Loading…</div>}>
          {children}
        </Suspense>
      </AdminShell>
    </ProtectedAdminRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Layout><HomePage /></Layout>} />
      <Route path="/services" component={() => <Layout><ServicesPage /></Layout>} />
      <Route path="/contact" component={() => <Layout><ContactPage /></Layout>} />
      <Route path="/quote" component={() => <Layout><QuotePage /></Layout>} />
      <Route path="/quote-request" component={() => <QrRedirectPage source="quote-request" />} />

      {/* Customer portal — no navbar, no auth */}
      <Route path="/quote/:token" component={() => (
        <Suspense fallback={null}>
          <CustomerPortalPage />
        </Suspense>
      )} />

      {/* Admin routes */}
      <Route path="/admin" component={() => <AdminRoute><DashboardPage /></AdminRoute>} />
      <Route path="/admin/prospects" component={() => <AdminRoute><ProspectsPage /></AdminRoute>} />
      <Route path="/admin/estimates" component={() => <AdminRoute><EstimatesListPage /></AdminRoute>} />
      <Route path="/admin/estimates/:id" component={() => <AdminRoute><EstimateBuilderPage /></AdminRoute>} />
      <Route path="/admin/catalog" component={() => <AdminRoute><CatalogPage /></AdminRoute>} />
      <Route path="/admin/services" component={() => <AdminRoute><AdminServicesPage /></AdminRoute>} />

      {/* Project routes */}
      <Route path="/admin/projects" component={() => <AdminRoute><ProjectsListPage /></AdminRoute>} />
      <Route path="/admin/projects/:id" component={() => <AdminRoute><ProjectDetailPage /></AdminRoute>} />
      <Route path="/admin/projects/:id/tasks" component={() => <AdminRoute><ProjectTasksPage /></AdminRoute>} />
      <Route path="/admin/projects/:id/logs" component={() => <AdminRoute><ProjectLogsPage /></AdminRoute>} />
      <Route path="/admin/projects/:id/charter" component={() => <AdminRoute><ProjectCharterPage /></AdminRoute>} />

      <Route path="/admin/settings" component={() => <AdminRoute><SiteSettingsPage /></AdminRoute>} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useSiteVisitTracking();
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  if (!recaptchaKey) {
    console.warn("reCAPTCHA site key is not configured. CAPTCHA will not be available.");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GoogleReCaptchaProvider
        reCaptchaKey={recaptchaKey || ""}
        useEnterprise={false}
      >
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </GoogleReCaptchaProvider>
    </QueryClientProvider>
  );
}

export default App;
