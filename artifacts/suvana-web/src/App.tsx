import { Switch, Route, Router as WouterRouter } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import ServicesPage from "@/pages/ServicesPage";
import ContactPage from "@/pages/ContactPage";
import QuotePage from "@/pages/QuotePage";
import AdminPage from "@/pages/AdminPage";
import QrRedirectPage from "@/pages/QrRedirectPage";

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

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
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
      <Route path="/admin" component={() => <AdminLayout><ProtectedAdminRoute><AdminPage /></ProtectedAdminRoute></AdminLayout>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useSiteVisitTracking();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
