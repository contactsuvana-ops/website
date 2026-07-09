import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Phone, Shield, Award, Clock, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface MediaItem {
  url: string;
  type: "image" | "video";
}

interface Service {
  id: string;
  title: string;
  tag: string;
  desc: string;
  bullets: string[];
  mediaUrl: string;
  mediaType: "image" | "video";
  mediaItems?: MediaItem[];
  order: number;
}

function resolveMediaItems(svc: Service): MediaItem[] {
  if (svc.mediaItems && svc.mediaItems.length > 0) return svc.mediaItems;
  return [{ url: svc.mediaUrl, type: svc.mediaType }];
}


const WHY = [
  { icon: Shield, title: "Licensed & Insured", desc: "Full coverage on every project. You're protected." },
  { icon: Award, title: "Certified Craftsmen", desc: "Our team carries industry certifications and ongoing training." },
  { icon: Clock, title: "On Time, Every Time", desc: "We respect your schedule. Projects delivered when promised." },
  { icon: CheckCircle, title: "Satisfaction Guaranteed", desc: "We don't consider a job done until you're completely happy." },
];

const TRUST_BADGES = [
  { icon: Shield, label: "Licensed & Insured", sub: "Full coverage on every project" },
  { icon: Award, label: "Certified Craftsmen", sub: "Industry-certified professionals" },
  { icon: CheckCircle, label: "Satisfaction Guaranteed", sub: "We don't stop until you're happy" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

// ─── MediaSlideshow ────────────────────────────────────────────────────────────

function MediaSlideshow({ items, title }: { items: MediaItem[]; title: string }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % items.length), 4500);
    return () => clearInterval(timer);
  }, [items.length]);

  const current = items[Math.min(idx, items.length - 1)];

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={idx}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {current.type === "video" ? (
            <video
              src={current.url}
              autoPlay muted loop playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={current.url}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {items.length > 1 && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 z-10">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setIdx(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === idx ? "bg-white scale-110" : "bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { data: fetchedServices, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiBase}/api/services`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const services = (fetchedServices ?? []).slice(0, 6);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-foreground">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/90 to-transparent" />
        <div className="relative z-10 container mx-auto px-4 md:px-6 lg:px-8 py-32">
          <motion.div
            className="max-w-2xl"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.p variants={fadeUp} className="text-accent font-semibold tracking-wider text-sm uppercase mb-4">
              Licensed &amp; Insured Construction Services
            </motion.p>
            <motion.h1 variants={fadeUp} className="font-display text-5xl md:text-7xl font-bold text-background leading-tight mb-6">
              Built Right.<br />Built to Last.
            </motion.h1>
            <motion.p variants={fadeUp} className="text-background/70 text-lg md:text-xl leading-relaxed mb-10 max-w-xl">
              From handyman repairs to full-scale construction, Suvana delivers craftsmanship that stands the test of time. Serving homeowners and businesses with honest work and fair pricing.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                href="/quote"
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-accent/90 transition-colors"
              >
                Request a Free Quote
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-background/20 px-8 py-4 text-base font-medium text-background hover:bg-background/10 transition-colors"
              >
                <Phone className="h-4 w-4" />
                Contact Us
              </Link>
            </motion.div>

            {/* Trust Badges */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-sm border border-white/15 bg-white/8 px-4 py-3.5 backdrop-blur-sm"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm bg-accent shadow-md">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{label}</p>
                    <p className="text-xs text-white/55 mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <motion.div
            className="max-w-2xl mb-14"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <p className="text-accent font-semibold tracking-wider text-sm uppercase mb-3">What We Do</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">Expert Services for Every Project</h2>
          </motion.div>

          {servicesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-sm border border-border overflow-hidden animate-pulse">
                  <div className="aspect-[16/10] bg-muted" />
                  <div className="p-6 space-y-3">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-5 w-40 bg-muted rounded" />
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-muted rounded" />
                      <div className="h-3 w-5/6 bg-muted rounded" />
                      <div className="h-3 w-4/6 bg-muted rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {services.map((svc) => (
                <motion.div
                  key={svc.id}
                  variants={fadeUp}
                  className="group relative overflow-hidden rounded-sm bg-card border border-border hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="aspect-[16/10] overflow-hidden relative">
                    <MediaSlideshow items={resolveMediaItems(svc)} title={svc.title} />
                  </div>
                  <div className="p-6">
                    <p className="text-accent text-[11px] font-semibold uppercase tracking-wider mb-1">{svc.tag}</p>
                    <h3 className="font-display text-xl font-bold text-foreground mb-2">{svc.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{svc.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          <div className="mt-12 text-center">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 rounded-sm border border-foreground px-8 py-3.5 text-sm font-semibold text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              View All Services
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-muted/40">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <p className="text-accent font-semibold tracking-wider text-sm uppercase mb-3">Why Suvana</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">The Difference is in the Details</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-10">
                We've built our reputation one project at a time. Every job — no matter the size — gets the same level of care, professionalism, and quality that has made Suvana a trusted name in construction.
              </p>
              <Link
                href="/quote"
                className="inline-flex items-center gap-2 rounded-sm bg-foreground px-8 py-4 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"
              >
                Start Your Project
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-6"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {WHY.map(({ icon: Icon, title, desc }) => (
                <motion.div key={title} variants={fadeUp} className="bg-background rounded-sm border border-border p-6">
                  <div className="w-10 h-10 rounded-sm bg-accent/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-14"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <p className="text-accent font-semibold tracking-wider text-sm uppercase mb-3">How It Works</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">Simple Process, Great Results</h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-4 gap-8"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {[
              { step: "01", title: "Request a Quote", desc: "Fill out our simple form with your project details. We'll reach out within 24 hours." },
              { step: "02", title: "Free Consultation", desc: "We visit your site, assess the work, and provide a detailed, transparent estimate." },
              { step: "03", title: "We Get to Work", desc: "Our certified team begins work on schedule, keeping you informed at every stage." },
              { step: "04", title: "Final Walkthrough", desc: "We complete a thorough review with you before considering any job finished." },
            ].map(({ step, title, desc }) => (
              <motion.div key={step} variants={fadeUp} className="relative">
                <div className="font-display text-7xl font-bold text-muted/60 mb-4 leading-none">{step}</div>
                <h3 className="font-semibold text-xl text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-foreground">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 text-center">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <motion.h2 variants={fadeUp} className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
              Ready to Start Your Project?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-background/60 text-lg mb-10 max-w-xl mx-auto">
              Get a free estimate today. No obligation, no pressure — just an honest conversation about your project.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/quote"
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-accent px-10 py-4 text-base font-semibold text-white hover:bg-accent/90 transition-colors"
              >
                Request Free Estimate
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-background/20 px-10 py-4 text-base font-medium text-background hover:bg-background/10 transition-colors"
              >
                Send Us a Message
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
