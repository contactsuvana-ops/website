import { useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  Wrench,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  HardHat,
  ClipboardList,
  UsersRound,
  Settings,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin", group: "main" },
  { id: "prospects", label: "Prospects", icon: Users, href: "/admin/prospects", group: "pipeline" },
  { id: "estimates", label: "Estimates", icon: FileText, href: "/admin/estimates", group: "pipeline" },
  { id: "projects", label: "Projects", icon: HardHat, href: "/admin/projects", group: "ops" },
  { id: "crews", label: "Crews", icon: UsersRound, href: "/admin/crews", group: "ops" },
  { id: "catalog", label: "Catalog", icon: BookOpen, href: "/admin/catalog", group: "config" },
  { id: "services", label: "Services", icon: Wrench, href: "/admin/services", group: "config" },
  { id: "settings", label: "Site Settings", icon: Settings, href: "/admin/settings", group: "config" },
];

const GROUP_LABELS: Record<string, string> = {
  main: "",
  pipeline: "Pipeline",
  ops: "Operations",
  config: "Config",
};

interface Props {
  children: React.ReactNode;
}

export function AdminShell({ children }: Props) {
  const [location, navigate] = useLocation();
  const { logout } = useAdminAuth();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (href: string) => {
    if (href === "/admin") return location === "/admin";
    return location.startsWith(href);
  };

  const sidebarWidth = collapsed ? "w-16" : "w-60";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / header */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? "justify-center" : ""}`}>
        {!collapsed && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Suvana</p>
            <p className="text-sm font-semibold text-white leading-tight">Admin</p>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-sm bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        {(["main", "pipeline", "ops", "config"] as const).map((group) => {
          const items = NAV_ITEMS.filter((n) => n.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="mb-3">
              {!collapsed && GROUP_LABELS[group] && (
                <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-white/20">
                  {GROUP_LABELS[group]}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ id, label, icon: Icon, href }) => (
                  <button
                    key={id}
                    onClick={() => {
                      navigate(href);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors ${
                      isActive(href)
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    } ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? label : undefined}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom: collapse + logout */}
      <div className="py-4 px-2 border-t border-white/10 space-y-1">
        {!isMobile && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-white/40 hover:text-white hover:bg-white/5 transition-colors ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-white/40 hover:text-white hover:bg-white/5 transition-colors ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className={`${sidebarWidth} flex-shrink-0 bg-foreground transition-all duration-200 overflow-hidden`}>
          <SidebarContent />
        </aside>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-60 bg-foreground z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        {isMobile && (
          <div className="bg-foreground px-4 py-3 flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="text-white">
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-white font-semibold text-sm">
              {NAV_ITEMS.find((n) => isActive(n.href))?.label ?? "Admin"}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
