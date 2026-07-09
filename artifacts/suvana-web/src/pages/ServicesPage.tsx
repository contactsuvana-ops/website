import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
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


const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

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
          transition={{ duration: 0.7 }}
        >
          {current.type === "video" ? (
            <video
              src={current.url}
              autoPlay muted loop playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img src={current.url} alt={title} className="w-full h-full object-cover" />
          )}
        </motion.div>
      </AnimatePresence>

      {items.length > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === idx ? "bg-white scale-110" : "bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const { data: fetchedServices, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiBase}/api/services`);
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const services = fetchedServices ?? [];

  return (
    <div>
      {/* Header */}
      <section className="bg-foreground py-24">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.p variants={fadeUp} className="text-accent font-semibold tracking-wider text-sm uppercase mb-3">What We Offer</motion.p>
            <motion.h1 variants={fadeUp} className="font-display text-5xl md:text-6xl font-bold text-background mb-4">Our Services</motion.h1>
            <motion.p variants={fadeUp} className="text-background/60 text-lg max-w-2xl">
              From a single repair to a full remodel, Suvana brings the same level of professionalism and craftsmanship to every job.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Services List */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="space-y-20">
            {servicesLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid lg:grid-cols-2 gap-12 items-center animate-pulse">
                    <div className={i % 2 === 1 ? "lg:order-2 space-y-4" : "space-y-4"}>
                      <div className="h-3 w-24 bg-muted rounded" />
                      <div className="h-8 w-56 bg-muted rounded" />
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-muted rounded" />
                        <div className="h-3 w-5/6 bg-muted rounded" />
                        <div className="h-3 w-4/6 bg-muted rounded" />
                      </div>
                      <div className="space-y-2 pt-2">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <div key={j} className="h-3 w-48 bg-muted rounded" />
                        ))}
                      </div>
                      <div className="h-10 w-32 bg-muted rounded" />
                    </div>
                    <div className={`rounded-sm aspect-[4/3] bg-muted ${i % 2 === 1 ? "lg:order-1" : ""}`} />
                  </div>
                ))
              : services.map((svc, i) => (
                  <motion.div
                    key={svc.id}
                    className="grid lg:grid-cols-2 gap-12 items-center"
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-60px" }}
                  >
                    <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                      <span className="text-accent text-xs font-semibold uppercase tracking-wider">{svc.tag}</span>
                      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">{svc.title}</h2>
                      <p className="text-muted-foreground leading-relaxed mb-6">{svc.desc}</p>
                      <ul className="space-y-2 mb-8">
                        {svc.bullets.map((b) => (
                          <li key={b} className="flex items-center gap-2 text-sm text-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/quote"
                        className="inline-flex items-center gap-2 rounded-sm bg-foreground px-6 py-3 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"
                      >
                        Get a Quote
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className={`rounded-sm overflow-hidden aspect-[4/3] ${i % 2 === 1 ? "lg:order-1" : ""}`}>
                      <MediaSlideshow items={resolveMediaItems(svc)} title={svc.title} />
                    </div>
                  </motion.div>
                ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-accent">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 text-center">
          <h2 className="font-display text-4xl font-bold text-white mb-4">Don't See What You Need?</h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto">We handle a wide variety of construction and maintenance work. Contact us to discuss your specific project.</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-sm bg-white px-10 py-4 text-sm font-semibold text-foreground hover:bg-white/90 transition-colors"
          >
            Talk to Us
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
