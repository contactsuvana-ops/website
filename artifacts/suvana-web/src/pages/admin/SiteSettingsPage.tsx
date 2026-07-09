import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminToken } from "@/hooks/use-admin-auth";
import { Save, Phone, Mail, MapPin, Clock, Link2, CheckCircle } from "lucide-react";

interface SiteContact {
  phone: string;
  email: string;
  serviceArea: string;
  address?: string;
  hours?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
}

const DEFAULTS: SiteContact = {
  phone: "(302) 844-8097",
  email: "contactsuvana@gmail.com",
  serviceArea: "Proudly serving the New Castle, DE area",
  address: "",
  hours: "",
  facebookUrl: "",
  instagramUrl: "",
  linkedinUrl: "",
};

const apiBase = import.meta.env.VITE_API_URL || "";

function adminFetch(path: string, init?: RequestInit) {
  const token = getAdminToken();
  return fetch(`${apiBase}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

export default function SiteSettingsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<SiteContact>({
    queryKey: ["/api/admin/site-config"],
    queryFn: async () => {
      const res = await adminFetch("/admin/site-config");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [form, setForm] = useState<SiteContact>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm({ ...DEFAULTS, ...data });
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (values: SiteContact) => {
      const res = await adminFetch("/admin/site-config", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/site-config"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/site-config"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const field = (
    key: keyof SiteContact,
    label: string,
    icon: React.ElementType,
    placeholder?: string,
    type = "text"
  ) => {
    const Icon = icon;
    return (
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          <span className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-accent" />
            {label}
          </span>
        </label>
        <input
          type={type}
          value={form[key] ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
          placeholder={placeholder}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground font-display">Site Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Contact info shown in the footer and contact page. Changes go live immediately.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }}
        className="space-y-8"
      >
        {/* Contact Info */}
        <div className="rounded-sm border border-border p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Contact Information</h2>
          {field("phone", "Phone Number", Phone, "(302) 844-8097", "tel")}
          {field("email", "Email Address", Mail, "contactsuvana@gmail.com", "email")}
          {field("serviceArea", "Service Area", MapPin, "Proudly serving the New Castle, DE area")}
          {field("address", "Street Address (optional)", MapPin, "123 Main St, Wilmington, DE 19801")}
          {field("hours", "Business Hours (optional)", Clock, "Mon–Fri: 7am–6pm, Sat: 8am–4pm")}
        </div>

        {/* Social Links */}
        <div className="rounded-sm border border-border p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Social Media Links</h2>
          {field("facebookUrl", "Facebook URL", Link2, "https://facebook.com/suvanaconstruction", "url")}
          {field("instagramUrl", "Instagram URL", Link2, "https://instagram.com/suvanaconstruction", "url")}
          {field("linkedinUrl", "LinkedIn URL", Link2, "https://linkedin.com/company/suvanaconstruction", "url")}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-sm bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </button>

          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle className="h-4 w-4" />
              Saved
            </span>
          )}

          {mutation.isError && (
            <span className="text-sm text-destructive">Failed to save. Please try again.</span>
          )}
        </div>
      </form>
    </div>
  );
}
