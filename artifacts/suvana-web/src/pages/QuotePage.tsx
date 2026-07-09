import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { useSubmitQuote } from "@workspace/api-client-react";
import { CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(7, "Please enter a valid phone number"),
  projectType: z.enum(["kitchen-remodeling","drywall","plumbing","electrical","flooring","fireplace","basement","painting","remodeling","handyman"], {
    errorMap: () => ({ message: "Please select a project type" }),
  }),
  location: z.string().min(2, "Please enter a location"),
  budget: z.enum(["under-5k","5k-15k","15k-50k","50k-100k","over-100k","not-sure"]).optional(),
  timeline: z.enum(["asap","1-3-months","3-6-months","6-12-months","flexible"]).optional(),
  message: z.string().min(10, "Please describe your project (at least 10 characters)"),
  honeypot: z.string().optional(),
  recaptchaToken: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const PROJECT_TYPES = [
  { value: "kitchen-remodeling", label: "Kitchen Remodeling" },
  { value: "drywall", label: "Drywall" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "flooring", label: "Flooring" },
  { value: "fireplace", label: "Fireplace" },
  { value: "basement", label: "Basement" },
  { value: "painting", label: "Painting" },
  { value: "remodeling", label: "Remodeling" },
  { value: "handyman", label: "Handyman" },
];

const BUDGETS = [
  { value: "under-5k", label: "Under $5,000" },
  { value: "5k-15k", label: "$5,000 – $15,000" },
  { value: "15k-50k", label: "$15,000 – $50,000" },
  { value: "50k-100k", label: "$50,000 – $100,000" },
  { value: "over-100k", label: "Over $100,000" },
  { value: "not-sure", label: "Not sure yet" },
];

const TIMELINES = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-3-months", label: "Within 1–3 months" },
  { value: "3-6-months", label: "Within 3–6 months" },
  { value: "6-12-months", label: "Within 6–12 months" },
  { value: "flexible", label: "Flexible" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

export default function QuotePage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const { executeRecaptcha } = useGoogleReCaptcha();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    nameRef.current?.focus();
  }, []);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { ref: nameFormRef, ...nameRest } = register("name");

  const mutation = useSubmitQuote();

  const onSubmit = async (data: FormData) => {
    if (!executeRecaptcha) {
      setServerError("reCAPTCHA is not available. Please refresh and try again.");
      return;
    }

    try {
      const token = await executeRecaptcha("quote_submission");
      if (!token) {
        setServerError("reCAPTCHA verification failed. Please try again.");
        return;
      }

      const dataWithToken = { ...data, recaptchaToken: token };
      setServerError(null);
      mutation.mutate({ data: dataWithToken }, {
        onSuccess: () => setSubmitted(true),
        onError: () => setServerError("Something went wrong. Please try again or call us directly."),
      });
    } catch (error) {
      setServerError("reCAPTCHA verification failed. Please try again.");
    }
  };

  return (
    <div>
      {/* Header */}
      <section className="bg-foreground py-24">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.p variants={fadeUp} className="text-accent font-semibold tracking-wider text-sm uppercase mb-3">Free Estimate</motion.p>
            <motion.h1 variants={fadeUp} className="font-display text-5xl md:text-6xl font-bold text-background mb-4">Request a Quote</motion.h1>
            <motion.p variants={fadeUp} className="text-background/60 text-lg max-w-xl">
              Tell us about your project and we'll follow up with a detailed, no-obligation estimate within one business day.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {submitted ? (
              <motion.div
                className="flex flex-col items-center justify-center py-24 text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <CheckCircle className="h-20 w-20 text-accent mb-6" />
                <h2 className="font-display text-4xl font-bold text-foreground mb-3">Quote Request Received</h2>
                <p className="text-muted-foreground text-lg max-w-md">
                  We've got your details. Our team will review your project and reach out within one business day with a detailed estimate.
                </p>
              </motion.div>
            ) : (
              <motion.form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-8"
                noValidate
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                {/* Honeypot */}
                <div style={{ position: "absolute", left: "-9999px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}>
                  <label htmlFor="hp-quote">Leave this blank</label>
                  <input id="hp-quote" type="text" tabIndex={-1} autoComplete="off" {...register("honeypot")} />
                </div>

                {/* reCAPTCHA Token (hidden) */}
                <input type="hidden" {...register("recaptchaToken")} />

                {/* Contact Info */}
                <motion.div variants={fadeUp}>
                  <h3 className="font-semibold text-foreground mb-4 text-lg">Contact Information</h3>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Full Name <span className="text-accent">*</span></label>
                      <input
                        {...nameRest}
                        ref={(el) => {
                          nameFormRef(el);
                          nameRef.current = el;
                        }}
                        className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                        placeholder="Your full name"
                      />
                      {errors.name && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Phone <span className="text-accent">*</span></label>
                      <input
                        {...register("phone")}
                        type="tel"
                        className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                        placeholder="(555) 000-0000"
                      />
                      {errors.phone && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.phone.message}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1.5">Email <span className="text-accent">*</span></label>
                      <input
                        {...register("email")}
                        type="email"
                        className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                        placeholder="you@email.com"
                      />
                      {errors.email && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email.message}</p>}
                    </div>
                  </div>
                </motion.div>

                {/* Project Details */}
                <motion.div variants={fadeUp} className="pt-4 border-t border-border">
                  <h3 className="font-semibold text-foreground mb-4 text-lg">Project Details</h3>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Project Type <span className="text-accent">*</span></label>
                      <select
                        {...register("projectType")}
                        className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                      >
                        <option value="">Select a service...</option>
                        {PROJECT_TYPES.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      {errors.projectType && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.projectType.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Project Location <span className="text-accent">*</span></label>
                      <input
                        {...register("location")}
                        className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                        placeholder="City, State or Zip"
                      />
                      {errors.location && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.location.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Estimated Budget</label>
                      <select
                        {...register("budget")}
                        className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                      >
                        <option value="">Select a range...</option>
                        {BUDGETS.map((b) => (
                          <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Desired Timeline</label>
                      <select
                        {...register("timeline")}
                        className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                      >
                        <option value="">Select a timeline...</option>
                        {TIMELINES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1.5">Project Description <span className="text-accent">*</span></label>
                      <textarea
                        {...register("message")}
                        rows={6}
                        className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-none"
                        placeholder="Describe your project — what needs to be done, any special requirements, current condition, etc."
                      />
                      {errors.message && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.message.message}</p>}
                    </div>
                  </div>
                </motion.div>

                {serverError && (
                  <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {serverError}
                  </div>
                )}

                <motion.button
                  variants={fadeUp}
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-sm bg-accent px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {mutation.isPending ? "Submitting..." : "Submit Quote Request"}
                  <ArrowRight className="h-5 w-5" />
                </motion.button>

                <p className="text-center text-xs text-muted-foreground">
                  By submitting this form you agree that we may contact you regarding your project. We never share your information.
                </p>
              </motion.form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
