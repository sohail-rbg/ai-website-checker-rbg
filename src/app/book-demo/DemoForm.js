"use client";

import { ArrowRight, CheckCircle2, Globe2, Mail, MessageSquareText, Phone, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

function Field({ icon: Icon, label, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#d9e1d8]">
        <Icon size={17} strokeWidth={1.8} className="text-[#90ee9a]" aria-hidden="true" />
        {label}
      </span>
      {children}
      {error && <span className="mt-2 block text-sm text-rose-300">{error}</span>}
    </label>
  );
}

const inputClass = "h-14 w-full rounded-2xl border border-[#8B9C8C]/18 bg-black/35 px-5 text-white outline-none transition placeholder:text-[#8B9C8C]/48 focus:border-[#90ee9a]/70 focus:bg-black/50";

export default function DemoForm() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm();

  async function onSubmit(values) {
    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save this demo request.");

      toast.success(data.message || "Demo request saved.");
      reset();
    } catch (error) {
      toast.error(error?.message || "Could not save this demo request.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, () => toast.error("Please complete the required fields."))}
      className="relative overflow-hidden rounded-[2rem] border border-[#8B9C8C]/16 bg-[linear-gradient(145deg,rgba(15,29,24,.94),rgba(4,8,6,.96))] p-5 shadow-[0_24px_70px_rgba(0,0,0,.30)] sm:p-7"
    >
      <div className="pointer-events-none absolute right-[-7rem] top-[-7rem] size-64 rounded-full bg-[#90ee9a]/10 blur-3xl" />
      <div className="relative grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field icon={UserRound} label="Name" error={errors.name?.message}>
            <input
              className={inputClass}
              placeholder="Your name"
              {...register("name", { required: "Name is required." })}
            />
          </Field>
          <Field icon={Mail} label="Email" error={errors.email?.message}>
            <input
              className={inputClass}
              placeholder="you@company.com"
              {...register("email", {
                required: "Email is required.",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email." },
              })}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field icon={Phone} label="Phone" error={errors.phone?.message}>
            <input
              className={inputClass}
              placeholder="+1 555 000 0000"
              {...register("phone", { required: "Phone is required." })}
            />
          </Field>
          <Field icon={Globe2} label="Website" error={errors.website?.message}>
            <input
              className={inputClass}
              placeholder="https://example.com"
              {...register("website")}
            />
          </Field>
        </div>

        <Field icon={MessageSquareText} label="Message" error={errors.message?.message}>
          <textarea
            className="min-h-36 w-full resize-y rounded-2xl border border-[#8B9C8C]/18 bg-black/35 px-5 py-4 text-white outline-none transition placeholder:text-[#8B9C8C]/48 focus:border-[#90ee9a]/70 focus:bg-black/50"
            placeholder="Tell us what you want to improve, your website goals, or the report you want us to review."
            {...register("message", { required: "Message is required." })}
          />
        </Field>

        <button
          disabled={isSubmitting}
          className="group inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-[#90ee9a] px-6 font-bold text-[#020302] transition hover:bg-[#b7f6bd] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving request..." : "Book a Demo"}
          <ArrowRight size={19} strokeWidth={2} className="transition group-hover:translate-x-1" aria-hidden="true" />
        </button>

        {isSubmitSuccessful && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#90ee9a]/18 bg-[#90ee9a]/8 p-4 text-sm leading-6 text-[#d9e1d8]">
            <CheckCircle2 size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-[#90ee9a]" aria-hidden="true" />
            <p>Your request has been saved. We will follow up soon.</p>
          </div>
        )}
      </div>
    </form>
  );
}
