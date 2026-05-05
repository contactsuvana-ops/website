import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const SERVICES = [
  {
    title: "General Construction",
    tag: "New Builds & Additions",
    desc: "From the ground up, we handle full-scale residential and commercial construction projects. Whether you need a new structure, an addition to your existing property, or a complex renovation requiring structural work, our licensed contractors manage every phase — planning, permitting, foundation, framing, and finishing.",
    bullets: ["New residential builds", "Commercial construction", "Room additions & expansions", "Structural modifications", "Project management"],
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
  },
  {
    title: "Handyman Services",
    tag: "Repairs & Maintenance",
    desc: "Not every job needs a full crew — but every job deserves quality work. Our handyman team handles the everyday repairs, fixes, and improvements that keep your home or business running at its best. Fast response, reliable service, fair pricing.",
    bullets: ["Door & window repairs", "Drywall patching", "Minor plumbing fixes", "Fixture installation", "General maintenance"],
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },
  {
    title: "Remodeling & Renovation",
    tag: "Transform Your Space",
    desc: "Breathe new life into your home with a thoughtful renovation. We specialize in kitchen and bathroom remodels, basement finishing, and full-property renovations — working with your vision and budget to deliver results that exceed expectations.",
    bullets: ["Kitchen remodeling", "Bathroom renovations", "Basement finishing", "Open floor plan conversions", "Custom cabinetry"],
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  },
  {
    title: "Roofing",
    tag: "Installation & Repair",
    desc: "A quality roof is your home's first line of defense. We install, repair, and replace roofs using premium materials, with meticulous attention to flashing, ventilation, and weatherproofing. Every job backed by our workmanship warranty.",
    bullets: ["Shingle installation & replacement", "Flat roof systems", "Leak detection & repair", "Gutters & downspouts", "Emergency storm repairs"],
    img: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=800&q=80",
  },
  {
    title: "Painting",
    tag: "Interior & Exterior",
    desc: "Professional painting transforms a space more than almost anything else. Our painters are meticulous — surface preparation, primer, clean lines, and a durable finish that looks great and lasts. Residential and commercial clients welcome.",
    bullets: ["Interior painting", "Exterior painting", "Commercial painting", "Cabinet refinishing", "Deck staining & sealing"],
    img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80",
  },
  {
    title: "Flooring",
    tag: "Every Surface, Done Right",
    desc: "From rustic hardwood to modern luxury vinyl, we install flooring that completes a room. We handle subfloor prep, installation, and finishing with the care that protects your investment for decades.",
    bullets: ["Hardwood installation & refinishing", "Tile & stone", "Luxury vinyl plank", "Carpet installation", "Subfloor repair"],
    img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  },
  {
    title: "Electrical",
    tag: "Safe & Code-Compliant",
    desc: "Our licensed electricians handle everything from outlet installation to full panel upgrades. All work is code-compliant and inspected, giving you peace of mind that your home's electrical system is safe and reliable.",
    bullets: ["Panel upgrades", "Outlet & switch installation", "Lighting fixtures", "Ceiling fans", "EV charger installation"],
    img: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
  },
  {
    title: "Plumbing",
    tag: "From Drips to Full Installs",
    desc: "Pipe leaks, clogged drains, fixture replacements, water heater installs — our licensed plumbers respond quickly and fix it right the first time. We work on residential and light commercial plumbing.",
    bullets: ["Pipe repair & replacement", "Fixture installation", "Water heater service", "Drain cleaning", "Bathroom plumbing"],
    img: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
  },
  {
    title: "Landscaping",
    tag: "Outdoor Spaces",
    desc: "The exterior of your property is the first impression. We design and implement landscaping solutions that add curb appeal, manage drainage, and create outdoor spaces you'll actually use.",
    bullets: ["Grading & drainage", "Retaining walls", "Outdoor living spaces", "Lawn & garden preparation", "Mulching & cleanup"],
    img: "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800&q=80",
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
              From a single repair to a full construction project, Suvana brings the same level of professionalism and craftsmanship to every job.
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
                className={`grid lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
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
