"use client";

import { useState } from "react";

import type { InquiryChannel } from "@/lib/staff/client";
import type { StaffEpisode } from "@/lib/staff/types";

const CHANNELS: { value: InquiryChannel; label: string }[] = [
  { value: "phone", label: "Phone" },
  { value: "desk", label: "Desk" },
  { value: "ward", label: "Ward" },
  { value: "other", label: "Other" },
];

export function InquirySheet({
  episodes,
  initialEpisode,
  onLog,
  onClose,
}: {
  episodes: StaffEpisode[];
  initialEpisode: StaffEpisode | null;
  onLog: (episode: StaffEpisode, channel: InquiryChannel) => Promise<void>;
  onClose: () => void;
}) {
  const [episodeId, setEpisodeId] = useState(initialEpisode?.id ?? episodes[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const selectedEpisode = episodes.find((episode) => episode.id === episodeId) ?? null;

  async function submit(channel: InquiryChannel) {
    if (!selectedEpisode || busy) return;
    setBusy(true);
    try {
      await onLog(selectedEpisode, channel);
      onClose();
    } catch {
      return;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/35 p-3 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-sheet-title"
        className="w-full max-w-sm rounded-card border border-line bg-paper p-card shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="inquiry-sheet-title" className="text-lg font-semibold text-ink">Log a family inquiry</h2>
            <p className="mt-1 text-sm text-muted">Choose where the inquiry came in.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="min-h-11 min-w-11 rounded-control text-xl text-muted hover:bg-brand-soft">×</button>
        </div>

        {initialEpisode === null ? (
          episodes.length > 0 ? <label className="mt-4 block text-sm font-medium text-ink">
            Episode
            <select
              aria-label="Episode"
              value={episodeId}
              onChange={(event) => setEpisodeId(event.target.value)}
              className="mt-1 h-12 w-full rounded-control border border-line bg-paper px-3 text-base"
            >
              {episodes.map((episode) => (
                <option key={episode.id} value={episode.id}>{episode.alias} · {episode.procedureName}</option>
              ))}
            </select>
          </label> : <p className="mt-4 text-sm text-muted">No active episodes to select.</p>
        ) : (
          <p className="mt-3 text-sm font-medium text-muted">{initialEpisode.alias}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {CHANNELS.map((channel) => (
            <button
              key={channel.value}
              type="button"
              disabled={!selectedEpisode || busy}
              onClick={() => void submit(channel.value)}
              className="min-h-16 rounded-control border border-brand-line bg-brand-soft px-4 text-base font-semibold text-ink hover:bg-brand-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
            >
              {channel.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
