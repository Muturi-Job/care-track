"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { pollIntervalMs } from "@/lib/poll-interval";
import {
  errorMessage,
  fetchEpisodes,
  sendAdvance,
  sendClearFlag,
  sendFlag,
  sendUndo,
} from "@/lib/staff/client";
import {
  applyAdvance,
  applyClearFlag,
  applyFlag,
  sortForStaff,
} from "@/lib/staff/episodes";
import { familyUrl } from "@/lib/staff/share";
import type { DelayReason, StaffEpisode, StatusFlag } from "@/lib/staff/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";

import { EpisodeCard } from "./episode-card";
import { Toast, type ToastMessage } from "./toast";

const LIST_QUERY_KEY = "staff-episodes";
const SEARCH_DEBOUNCE_MS = 300;

type ListData = StaffEpisode[];

type FlagVariables = {
  episode: StaffEpisode;
  statusFlag: StatusFlag;
  delayReason?: DelayReason;
};

export function StaffEpisodes({ origin }: { origin: string }) {
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const queryClient = useQueryClient();
  const dismissToast = useCallback(() => setToast(null), []);

  const episodesQuery = useQuery({
    queryKey: [LIST_QUERY_KEY, debouncedSearch],
    queryFn: () => fetchEpisodes(debouncedSearch),
    refetchInterval: pollIntervalMs(),
    placeholderData: keepPreviousData,
  });

  // Every cached search shares the same optimistic updates.
  const rememberLists = () =>
    queryClient.getQueriesData<ListData>({ queryKey: [LIST_QUERY_KEY] });

  const writeLists = (update: (episodes: StaffEpisode[]) => StaffEpisode[]) => {
    queryClient.setQueriesData<ListData>({ queryKey: [LIST_QUERY_KEY] }, (data) =>
      data === undefined ? data : update(data),
    );
  };

  const restoreLists = (snapshot: ReturnType<typeof rememberLists>) => {
    for (const [key, data] of snapshot) {
      queryClient.setQueryData(key, data);
    }
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: [LIST_QUERY_KEY] });

  const undo = useMutation({
    mutationFn: (episode: StaffEpisode) => sendUndo(episode.id),
    onSuccess: (updated) => {
      setToast({ text: `Undo complete. ${updated.alias} is back on ${updated.stageLabel}.` });
    },
    onError: (error) => setToast({ text: errorMessage(error) }),
    onSettled: refresh,
  });

  const advance = useMutation({
    mutationFn: (episode: StaffEpisode) => sendAdvance(episode.id),
    onMutate: async (episode) => {
      await queryClient.cancelQueries({ queryKey: [LIST_QUERY_KEY] });
      const snapshot = rememberLists();
      writeLists((episodes) => applyAdvance(episodes, episode.id));
      return { snapshot };
    },
    onError: (error, _episode, context) => {
      if (context) restoreLists(context.snapshot);
      setToast({ text: errorMessage(error) });
    },
    onSuccess: (updated) => {
      setToast({
        text: `Moved ${updated.alias} to ${updated.stageLabel}.`,
        action: { label: "Undo", onClick: () => undo.mutate(updated) },
      });
    },
    onSettled: refresh,
  });

  const flag = useMutation({
    mutationFn: (variables: FlagVariables) =>
      sendFlag(variables.episode.id, variables.statusFlag, variables.delayReason ?? null),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [LIST_QUERY_KEY] });
      const snapshot = rememberLists();
      writeLists((episodes) =>
        applyFlag(
          episodes,
          variables.episode.id,
          variables.statusFlag,
          variables.delayReason ?? null,
        ),
      );
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) restoreLists(context.snapshot);
      setToast({ text: errorMessage(error) });
    },
    onSuccess: (updated) => setToast({ text: `${updated.alias}: ${flagSummary(updated)}` }),
    onSettled: refresh,
  });

  const clearFlag = useMutation({
    mutationFn: (episode: StaffEpisode) => sendClearFlag(episode.id),
    onMutate: async (episode) => {
      await queryClient.cancelQueries({ queryKey: [LIST_QUERY_KEY] });
      const snapshot = rememberLists();
      writeLists((episodes) => applyClearFlag(episodes, episode.id));
      return { snapshot };
    },
    onError: (error, _episode, context) => {
      if (context) restoreLists(context.snapshot);
      setToast({ text: errorMessage(error) });
    },
    onSuccess: (updated) => setToast({ text: `${updated.alias}: flag cleared.` }),
    onSettled: refresh,
  });

  const busy = advance.isPending || flag.isPending || clearFlag.isPending || undo.isPending;
  const episodes = episodesQuery.data ? sortForStaff(episodesQuery.data) : [];

  return (
    <div>
      <div className="mt-4">
        <label htmlFor="staff-search" className="block text-sm font-semibold text-ink">
          Search
        </label>
        <input
          id="staff-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Patient alias or bed"
          className="mt-1 h-12 w-full rounded-control border border-line bg-paper px-3 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
        <p className="mt-1 text-caption text-muted">Updates automatically.</p>
      </div>

      {episodesQuery.isPending ? (
        <p role="status" className="mt-6 text-sm text-muted">
          Loading episodes…
        </p>
      ) : null}

      {episodesQuery.isError ? (
        <div role="alert" className="mt-6 rounded-card border border-warning-line bg-warning-soft p-card">
          <p className="text-sm text-warning-ink">Could not load episodes. Please try again.</p>
          <button
            type="button"
            onClick={() => episodesQuery.refetch()}
            className="mt-3 min-h-11 rounded-control border border-line bg-paper px-4 text-sm font-semibold text-ink hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Try again
          </button>
        </div>
      ) : null}

      {!episodesQuery.isPending && !episodesQuery.isError && episodes.length === 0 ? (
        <p className="mt-6 rounded-card border border-line bg-paper p-card text-sm text-muted">
          {debouncedSearch.trim() === ""
            ? "No active episodes yet."
            : `No episodes match “${debouncedSearch.trim()}”.`}
        </p>
      ) : null}

      <ul className="mt-5 space-y-4">
        {episodes.map((episode) => (
          <li key={episode.id}>
            <EpisodeCard
              episode={episode}
              familyUrl={familyUrl(origin, episode.familyPath)}
              busy={busy}
              onAdvance={(target) => advance.mutate(target)}
              onDelay={(target, reason) =>
                flag.mutate({ episode: target, statusFlag: "delayed", delayReason: reason })
              }
              onCallCareTeam={(target) =>
                flag.mutate({ episode: target, statusFlag: "call_care_team" })
              }
              onClearFlag={(target) => clearFlag.mutate(target)}
            />
          </li>
        ))}
      </ul>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

function flagSummary(episode: StaffEpisode): string {
  if (episode.statusFlag === "delayed") return "marked as delayed.";
  if (episode.statusFlag === "call_care_team") return "flagged for the family to call.";

  return "flag cleared.";
}
