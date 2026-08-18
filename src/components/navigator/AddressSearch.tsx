"use client";

import type { SyntheticEvent } from "react";
import { useRef, useState } from "react";

type Props = {
  readonly onNavigate: (address: string) => void;
  readonly isLoading: boolean;
};

export function AddressSearch({ onNavigate, isLoading }: Props) {
  const [address, setAddress] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (trimmed) {
      onNavigate(trimmed);
      inputRef.current?.blur();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="absolute top-4 left-4 z-10 flex w-72 flex-col gap-2"
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Go to (e.g. Times Square, NYC)"
        value={address}
        onChange={(e) => {
          setAddress(e.target.value);
        }}
        className="rounded-sm border border-green-700 bg-black px-3 py-1 font-mono text-sm text-green-400 placeholder-green-900 focus:border-green-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isLoading || !address.trim()}
        className="rounded-sm border border-green-500 bg-black px-3 py-1 font-mono text-sm text-green-400 hover:bg-green-900 disabled:opacity-40"
      >
        {isLoading ? "Loading…" : "[ Go ]"}
      </button>
    </form>
  );
}
