import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const SERVICES = [
  {
    title: "Kitchen Remodeling",
    tag: "Full Kitchen Transformations",
    desc: "The kitchen is the heart of your home — and it should look like it. We handle complete kitchen remodels from layout changes and custom cabinetry to countertops, backsplash, lighting, and plumbing. We work with your style and budget to deliver a kitchen you'll love for years.",
    bullets: ["Custom cabinetry & layout design", "Countertop installation (granite, quartz, butcher block)", "Backsplash tile work", "Appliance hookups", "Lighting & electrical upgrades"],
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  },
  {
    title: "Drywall",
    tag: "Installation & Repair",
    desc: "Whether you need new drywall hung in a freshly framed space or seamless repairs on existing walls, our crew delivers a finish that paints up perfectly. We handle everything from small patches to full room installs with precision taping, mudding, and sanding.",
    bullets: ["New drywall installation", "Patch & repair (holes, water damage, cracks)", "Tape, mud & sand finish", "Texture matching", "Ceiling drywall"],
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
  },
  {
    title: "Plumbing",
    tag: "From Drips to Full Installs",
    desc: "Pipe leaks, clogged drains, fixture replacements, water heater installs — our licensed plumbers respond quickly and fix it right the first time. We work on residential and light commercial plumbing with transparency on pricing before any work begins.",
    bullets: ["Pipe repair & replacement", "Fixture installation (sinks, toilets, showers)", "Water heater service & install", "Drain cleaning", "Bathroom & kitchen plumbing"],
    img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
  },
  {
    title: "Electrical",
    tag: "Safe & Code-Compliant",
    desc: "Our licensed electricians handle everything from outlet installation to full panel upgrades. All work is code-compliant and inspected, giving you peace of mind that your home's electrical system is safe, modern, and reliable.",
    bullets: ["Panel upgrades & replacements", "Outlet & switch installation", "Lighting fixtures & ceiling fans", "EV charger installation", "Whole-home rewiring"],
    img: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
  },
  {
    title: "Flooring",
    tag: "Every Surface, Done Right",
    desc: "From rustic hardwood to modern luxury vinyl, we install flooring that completes a room. We handle subfloor repair and prep, installation, and finishing with the care that protects your investment for decades.",
    bullets: ["Hardwood installation & refinishing", "Tile & stone (kitchen, bath, entry)", "Luxury vinyl plank (LVP)", "Carpet installation", "Subfloor leveling & repair"],
    img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  },
  {
    title: "Fireplace",
    tag: "Installation & Surround Work",
    desc: "A fireplace transforms any room. We install gas, electric, and wood-burning fireplaces and build custom surrounds — from sleek modern stone to classic craftsman tile — that become the focal point of your living space.",
    bullets: ["Gas & electric fireplace installation", "Wood-burning fireplace builds", "Custom tile & stone surrounds", "Mantel installation", "Fireplace refacing & updates"],
    img: "https://images.unsplash.com/photo-1571752726703-5e7d1f6a986d?w=800&q=80",
  },
  {
    title: "Basement",
    tag: "Finishing & Conversion",
    desc: "Your unfinished basement is untapped square footage. We convert raw basement space into livable, comfortable rooms — home offices, gyms, playrooms, in-law suites, or entertainment spaces — with full framing, insulation, drywall, flooring, and electrical.",
    bullets: ["Full basement finishing", "Framing & insulation", "Egress window installation", "Waterproofing coordination", "In-law suite & rental unit conversions"],
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },
  {
    title: "Painting",
    tag: "Interior & Exterior",
    desc: "Professional painting transforms a space more than almost anything else. Our painters are meticulous — proper surface preparation, quality primer, clean lines, and a durable finish that looks great and holds up over time. Residential and commercial clients welcome.",
    bullets: ["Interior painting (walls, ceilings, trim)", "Exterior painting & staining", "Cabinet refinishing & painting", "Commercial painting", "Deck & fence staining"],
    img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80",
  },
  {
    title: "Remodeling",
    tag: "Full-Room Renovations",
    desc: "Beyond kitchens, we handle bathrooms, living rooms, additions, and whole-home renovations. Bring us your vision — a layout change, an aging space that needs refreshing, or a new addition — and we'll make it happen with craftsmanship that lasts.",
    bullets: ["Bathroom remodels", "Room additions", "Open floor plan conversions", "Whole-home renovations", "Custom built-ins & millwork"],
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  },
  {
    title: "Handyman",
    tag: "Repairs & Maintenance",
    desc: "Not every job needs a full crew — but every job deserves quality work. Our handyman team handles the everyday repairs, fixes, and small improvements that keep your home or business running at its best. Fast response, reliable service, fair pricing.",
    bullets: ["Door & window repairs", "Drywall patching & touch-ups", "Fixture installation", "Caulking & weatherstripping", "General home maintenance"],
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

export default function ServicesPage() {
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
            {SERVICES.map((svc, i) => (
              <motion.div
                key={svc.title}
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
                  <img src={svc.img} alt={svc.title} className="w-full h-full object-cover" />
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
