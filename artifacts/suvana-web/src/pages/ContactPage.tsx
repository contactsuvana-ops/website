import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useSubmitContact } from "@workspace/api-client-react";
import { Phone, Mail, MapPin, Clock, CheckCircle, AlertCircle } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(7, "Please enter a valid phone number"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  honeypot: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useSubmitContact();

  const onSubmit = (data: FormData) => {
    setServerError(null);
    mutation.mutate({ data }, {
      onSuccess: () => setSubmitted(true),
      onError: () => setServerError("Something went wrong. Please try again or email us directly."),
    });
  };

  return (
    <div>
      {/* Header */}
      <section className="bg-foreground py-24">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.p variants={fadeUp} className="text-accent font-semibold tracking-wider text-sm uppercase mb-3">Get in Touch</motion.p>
            <motion.h1 variants={fadeUp} className="font-display text-5xl md:text-6xl font-bold text-background mb-4">Contact Us</motion.h1>
            <motion.p variants={fadeUp} className="text-background/60 text-lg max-w-xl">
              Have a question? Ready to start? We'd love to hear from you. Expect a response within 1–2 business days.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Form */}
            <motion.div variants={fadeUp} initial="hidden" animate="show">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <CheckCircle className="h-16 w-16 text-accent mb-6" />
                  <h2 className="font-display text-3xl font-bold text-foreground mb-3">Message Received</h2>
                  <p className="text-muted-foreground max-w-sm">
                    Thank you for reaching out. We'll get back to you within 1–2 business days.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  {/* Honeypot */}
                  <div style={{ position: "absolute", left: "-9999px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}>
                    <label htmlFor="hp-contact">Leave this blank</label>
                    <input id="hp-contact" type="text" tabIndex={-1} autoComplete="off" {...register("honeypot")} />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Full Name <span className="text-accent">*</span></label>
                      <input
                        {...register("name")}
                        className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                        placeholder="Your full name"
                      />
                      {errors.name && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Email <span className="text-accent">*</span></label>
                      <input
                        {...register("email")}
                        type="email"
                        className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                        placeholder="you@email.com"
                      />
                      {errors.email && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number <span className="text-accent">*</span></label>
                    <input
                      {...register("phone")}
                      type="tel"
                      className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                      placeholder="(555) 000-0000"
                    />
                    {errors.phone && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.phone.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Message <span className="text-accent">*</span></label>
                    <textarea
                      {...register("message")}
                      rows={6}
                      className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none"
                      placeholder="Tell us what's on your mind..."
                    />
                    {errors.message && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.message.message}</p>}
                  </div>

                  {serverError && (
                    <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {serverError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || mutation.isPending}
                    className="w-full rounded-sm bg-accent px-8 py-4 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {mutation.isPending ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </motion.div>

            {/* Contact Info */}
            <motion.div
              className="space-y-8"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={fadeUp}>
                <h3 className="font-display text-2xl font-bold text-foreground mb-6">Contact Information</h3>
              </motion.div>
              {[
                { icon: Phone, label: "Phone", value: "(800) 555-0100", href: "tel:8005550100" },
                { icon: Mail, label: "Email", value: "contactsuvana@gmail.com", href: "mailto:contactsuvana@gmail.com" },
                { icon: MapPin, label: "Service Area", value: "Greater Metro Area — contact us to confirm coverage" },
                { icon: Clock, label: "Hours", value: "Mon–Fri: 7am – 6pm\nSat: 8am – 4pm\nSun: Emergency only" },
              ].map(({ icon: Icon, label, value, href }) => (
                <motion.div key={label} variants={fadeUp} className="flex gap-4">
                  <div className="w-10 h-10 rounded-sm bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
                    {href ? (
                      <a href={href} className="text-foreground hover:text-accent transition-colors font-medium">{value}</a>
                    ) : (
                      <p className="text-foreground font-medium whitespace-pre-line">{value}</p>
                    )}
                  </div>
                </motion.div>
              ))}

              <motion.div variants={fadeUp} className="mt-8 rounded-sm border border-border bg-muted/30 p-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Prefer a phone call?</strong> We're available Monday through Friday, 7am to 6pm. For urgent matters, leave a message and we'll call back within hours.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
