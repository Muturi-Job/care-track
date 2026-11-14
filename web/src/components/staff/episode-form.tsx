"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { errorMessage, sendCreateEpisode } from "@/lib/staff/client";
import { familyUrl } from "@/lib/staff/share";
import type { CreateEpisodeInput, ProcedureOption, StaffEpisode } from "@/lib/staff/types";

import { ShareLinks } from "./share-links";

const episodeSchema = z.object({
  alias: z
    .string()
    .trim()
    .min(1, "Enter the patient's alias or first name")
    .max(60, "Keep it under 60 characters"),
  procedureTemplateId: z.string().min(1, "Choose a procedure"),
  bed: z.string().trim().min(1, "Enter the ward or bed").max(40, "Keep it under 40 characters"),
});

type EpisodeFormValues = z.infer<typeof episodeSchema>;

const INPUT_CLASS =
  "mt-1 h-12 w-full rounded-control border border-line bg-paper px-3 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export type EpisodeFormProps = {
  procedures: ProcedureOption[];
  /** Absolute origin for the family link, read from the request on the server. */
  origin: string;
  onCreate?: (input: CreateEpisodeInput) => Promise<StaffEpisode>;
};

export function EpisodeForm({ procedures, origin, onCreate = sendCreateEpisode }: EpisodeFormProps) {
  const defaultProcedureId = procedures[0]?.id ?? "";
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EpisodeFormValues>({
    resolver: zodResolver(episodeSchema),
    defaultValues: { alias: "", procedureTemplateId: defaultProcedureId, bed: "" },
    mode: "onBlur",
  });

  const [created, setCreated] = useState<StaffEpisode | null>(null);
  const [failure, setFailure] = useState("");

  async function submit(values: EpisodeFormValues) {
    setFailure("");

    try {
      setCreated(await onCreate(values));
    } catch (error) {
      setFailure(errorMessage(error));
    }
  }

  function createAnother() {
    setCreated(null);
    setFailure("");
    reset({ alias: "", procedureTemplateId: defaultProcedureId, bed: "" });
  }

  if (created) {
    const url = familyUrl(origin, created.familyPath);

    return (
      <section aria-live="polite" className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Episode created</h2>

        <p className="text-sm text-muted">
          {created.alias} · {created.bed} · {created.procedureName}
        </p>

        <div className="rounded-card border border-brand-line bg-brand-soft p-card">
          <p className="text-sm font-semibold text-ink">Family link</p>
          <p className="mt-1 break-all text-sm text-ink">{url}</p>

          <div className="mt-3">
            <ShareLinks url={url} alias={created.alias} />
          </div>
        </div>

        <p className="rounded-card border border-warning-line bg-warning-soft p-card text-sm text-warning-ink">
          Only share with people the patient has agreed to.
        </p>

        <div className="flex flex-col gap-2">
          <Link
            href="/staff"
            className="flex min-h-12 items-center justify-center rounded-control bg-brand px-4 text-base font-semibold text-white shadow-card hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
          >
            Open staff list
          </Link>

          <button
            type="button"
            onClick={createAnother}
            className="flex min-h-12 items-center justify-center rounded-control border border-line bg-paper px-4 text-base font-semibold text-ink hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Create another episode
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="patient-alias" className="block text-sm font-semibold text-ink">
          Patient alias or first name
        </label>
        <input
          id="patient-alias"
          type="text"
          autoComplete="off"
          maxLength={60}
          aria-invalid={errors.alias ? true : undefined}
          aria-describedby={errors.alias ? "patient-alias-error" : undefined}
          className={INPUT_CLASS}
          {...register("alias")}
        />
        {errors.alias ? (
          <p id="patient-alias-error" className="mt-1 text-sm text-danger-ink">
            {errors.alias.message}
          </p>
        ) : null}
      </div>

      {procedures.length === 0 ? (
        <p
          role="alert"
          className="rounded-control border border-warning-line bg-warning-soft p-3 text-sm text-warning-ink"
        >
          No procedures are available yet.
        </p>
      ) : (
        <div>
          <label htmlFor="procedure" className="block text-sm font-semibold text-ink">
            Procedure
          </label>
          <select
            id="procedure"
            aria-invalid={errors.procedureTemplateId ? true : undefined}
            className={INPUT_CLASS}
            {...register("procedureTemplateId")}
          >
            {procedures.map((procedure) => (
              <option key={procedure.id} value={procedure.id}>
                {procedure.name}
              </option>
            ))}
          </select>
          {errors.procedureTemplateId ? (
            <p className="mt-1 text-sm text-danger-ink">{errors.procedureTemplateId.message}</p>
          ) : null}
        </div>
      )}

      <div>
        <label htmlFor="ward-or-bed" className="block text-sm font-semibold text-ink">
          Ward or bed
        </label>
        <input
          id="ward-or-bed"
          type="text"
          autoComplete="off"
          maxLength={40}
          aria-invalid={errors.bed ? true : undefined}
          aria-describedby={errors.bed ? "ward-or-bed-error" : undefined}
          className={INPUT_CLASS}
          {...register("bed")}
        />
        {errors.bed ? (
          <p id="ward-or-bed-error" className="mt-1 text-sm text-danger-ink">
            {errors.bed.message}
          </p>
        ) : null}
      </div>

      {failure ? (
        <p role="alert" className="rounded-control border border-danger-line bg-danger-soft p-3 text-sm text-danger-ink">
          {failure}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || procedures.length === 0}
        className="flex min-h-12 w-full items-center justify-center rounded-control bg-brand px-4 text-base font-semibold text-white shadow-card hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {isSubmitting ? "Creating…" : "Create episode"}
      </button>
    </form>
  );
}
