import { Link } from "wouter";
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
};

function useSiteContact() {
  return useQuery<SiteContact>({
    queryKey: ["/api/site-config"],
    queryFn: async () => {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiBase}/api/site-config`);
      if (!res.ok) throw new Error("Failed to fetch site config");
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function Footer() {
  const { data } = useSiteContact();
  const contact: SiteContact = data ?? DEFAULTS;

  return (
    <footer className="bg-foreground text-background/80">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <img
              src="https://suvanaconstruction.com/logo.png"
              alt="Suvana Construction"
              className="h-12 w-auto mb-4 brightness-0 invert"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <p className="font-display text-xl font-bold text-background mb-3">Suvana Construction LLC</p>
            <p className="text-sm leading-relaxed text-background/60">
              Professional construction and handyman services you can trust. Quality work, honest pricing, guaranteed satisfaction.
            </p>
            <div className="flex gap-4 mt-6">
              {contact.facebookUrl ? (
                <a href={contact.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-background/50 hover:text-accent transition-colors"><Facebook className="h-5 w-5" /></a>
              ) : (
                <a href="#" aria-label="Facebook" className="text-background/50 hover:text-accent transition-colors"><Facebook className="h-5 w-5" /></a>
              )}
              {contact.instagramUrl ? (
                <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-background/50 hover:text-accent transition-colors"><Instagram className="h-5 w-5" /></a>
              ) : (
                <a href="#" aria-label="Instagram" className="text-background/50 hover:text-accent transition-colors"><Instagram className="h-5 w-5" /></a>
              )}
              {contact.linkedinUrl ? (
                <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-background/50 hover:text-accent transition-colors"><Linkedin className="h-5 w-5" /></a>
              ) : (
                <a href="#" aria-label="LinkedIn" className="text-background/50 hover:text-accent transition-colors"><Linkedin className="h-5 w-5" /></a>
              )}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-background font-semibold mb-5 text-sm uppercase tracking-wider">Services</h4>
            <ul className="space-y-2.5 text-sm">
              {["General Construction", "Handyman Services", "Remodeling", "Painting", "Flooring", "Electrical", "Plumbing"].map((s) => (
                <li key={s}>
                  <Link href="/services" className="text-background/60 hover:text-accent transition-colors">{s}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-background font-semibold mb-5 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/", label: "Home" },
                { href: "/services", label: "Our Services" },
                { href: "/quote", label: "Request a Quote" },
                { href: "/contact", label: "Contact Us" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-background/60 hover:text-accent transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-background font-semibold mb-5 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 text-accent flex-shrink-0" />
                <a href={`tel:${contact.phone.replace(/\D/g, "")}`} className="text-background/60 hover:text-accent transition-colors">{contact.phone}</a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-accent flex-shrink-0" />
                <a href={`mailto:${contact.email}`} className="text-background/60 hover:text-accent transition-colors">{contact.email}</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-accent flex-shrink-0" />
                <span className="text-background/60">{contact.serviceArea}</span>
              </li>
              {contact.hours && (
                <li className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-0.5 text-accent flex-shrink-0" />
                  <span className="text-background/60">{contact.hours}</span>
                </li>
              )}
              {contact.address && (
                <li className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-accent flex-shrink-0 opacity-0" />
                  <span className="text-background/60">{contact.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-background/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-background/40">
          <span>&copy; {new Date().getFullYear()} Suvana Construction LLC. All rights reserved.</span>
          <span>Licensed &amp; Insured</span>
        </div>
      </div>
    </footer>
  );
}
