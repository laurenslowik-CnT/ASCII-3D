"use client";

import type { SyntheticEvent } from "react";
import { useState } from "react";

type Props = {
  readonly onRoute: (origin: string, destination: string) => void;
  readonly isLoading: boolean;
};

export function AddressSearch({ onRoute, isLoading }: Props) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    const trimmedOrigin = origin.trim();
    const trimmedDestination = destination.trim();
    if (trimmedOrigin && trimmedDestination) {
      onRoute(trimmedOrigin, trimmedDestination);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute top-4 left-4 z-10 flex w-72 flex-col gap-2"
    >
      <input
        type="text"
        placeholder="From (e.g. Times Square, NYC)"
        value={origin}
        onChange={(e) => {
          setOrigin(e.target.value);
        }}
        className="rounded-sm border border-green-700 bg-black px-3 py-1 font-mono text-sm text-green-400 placeholder-green-900 focus:border-green-400 focus:outline-none"
      />
      <input
        type="text"
        placeholder="To (e.g. Brooklyn Bridge, NYC)"
        value={destination}
        onChange={(e) => {
          setDestination(e.target.value);
        }}
        className="rounded-sm border border-green-700 bg-black px-3 py-1 font-mono text-sm text-green-400 placeholder-green-900 focus:border-green-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isLoading || !origin.trim() || !destination.trim()}
        className="rounded-sm border border-green-500 bg-black px-3 py-1 font-mono text-sm text-green-400 hover:bg-green-900 disabled:opacity-40"
      >
        {isLoading ? "Loading…" : "[ Navigate ]"}
      </button>
    </form>
  );
}
