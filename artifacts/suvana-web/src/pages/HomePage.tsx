import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Phone, Shield, Award, Clock } from "lucide-react";

const SERVICES = [
  { title: "General Construction", desc: "Full-scale new builds, additions, and structural work. We manage every phase from groundbreaking to final walkthrough.", img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80" },
  { title: "Handyman Services", desc: "No job too small. From leaky faucets to hanging doors, we handle the repairs that keep your home running smoothly.", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80" },
  { title: "Remodeling & Renovation", desc: "Transform your kitchen, bathroom, or basement into the space you've always wanted with expert craftsmanship.", img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80" },
  { title: "Roofing", desc: "Installation, repair, and full replacement. We use premium materials and stand behind every shingle we lay.", img: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=600&q=80" },
  { title: "Painting", desc: "Interior and exterior painting for residential and commercial properties. Clean lines, lasting finish.", img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&q=80" },
  { title: "Flooring", desc: "Hardwood, tile, carpet, and vinyl — we install every surface with precision and attention to detail.", img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" },
];

const STATS = [
  { value: "500+", label: "Projects Completed" },
  { value: "12+", label: "Years Experience" },
  { value: "98%", label: "Client Satisfaction" },
  { value: "50+", label: "Certified Pros" },
];

const WHY = [
  { icon: Shield, title: "Licensed & Insured", desc: "Full coverage on every project. You're protected." },
  { icon: Award, title: "Certified Craftsmen", desc: "Our team carries industry certifications and ongoing training." },
  { icon: Clock, title: "On Time, Every Time", desc: "We respect your schedule. Projects delivered when promised." },
  { icon: CheckCircle, title: "Satisfaction Guaranteed", desc: "We don't consider a job done until you're completely happy." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function HomePage() {
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
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
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
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-accent py-12">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-4xl md:text-5xl font-bold text-white">{s.value}</div>
                <div className="text-white/80 text-sm mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
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

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {SERVICES.map((svc) => (
              <motion.div
                key={svc.title}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-sm bg-card border border-border hover:shadow-xl transition-shadow duration-300"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={svc.img}
                    alt={svc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl font-bold text-foreground mb-2">{svc.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{svc.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

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
