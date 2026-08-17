// src/components/navigator/ViewToggle.tsx
"use client";

import { useEffect } from "react";

type View = "firstperson" | "overhead";

type Props = {
  readonly view: View;
  readonly onToggle: () => void;
};

export function ViewToggle({ view, onToggle }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Tab") {
        e.preventDefault();
        onToggle();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [onToggle]);

  return (
    <button
      onClick={onToggle}
      className="absolute top-4 right-4 z-10 rounded-sm border border-green-500 bg-black px-3 py-1 font-mono text-sm text-green-400 hover:bg-green-900"
      title="Toggle view (Tab)"
      type="button"
    >
      {view === "firstperson" ? "[ 3D ]" : "[ MAP ]"}
    </button>
  );
}
