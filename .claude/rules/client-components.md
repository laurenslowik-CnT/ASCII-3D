---
description: 'use client' directive must be justified — default to Server Components
globs: "**/*.tsx"
alwaysApply: false
---

# `'use client'` — Server-First Rendering

Render on the server by default. `'use client'` opts the entire component subtree into client-side rendering, which increases bundle size and can cause layout shift.

## When `'use client'` Is Required

A component may include `'use client'` only if it directly uses one of:

- A React hook that requires the client (`useState`, `useEffect`, `useRef`, `useReducer`, `useLayoutEffect`, `useTransition`, `useImperativeHandle`, `useContext` with a client-side context, etc.), a hook from `usehooks-ts` or another npm package, or a custom hook in this application
- A browser-only API (`window`, `document`, `navigator`, `IntersectionObserver`, etc.)
- An event handler that cannot be serialized and passed from a Server Component (i.e. an inline arrow function assigned to `onClick` or similar)
- A third-party component that itself requires the client runtime

## Common Mistakes

- **Fetching data does not require `'use client'`** — use `async` Server Components or React Server Actions instead.
- **Passing a callback prop does not require `'use client'`** — only the component that _defines_ the inline handler needs the directive; a wrapper that just forwards a prop does not.
- **Using `next/image` or `next/link` does not require `'use client'`** — they work in Server Components.

## Propagation

`'use client'` marks a boundary. Every component imported by a client component is also treated as a client component whether or not it has the directive. Push the boundary as deep (as close to the interactive leaf) as possible.

## Component Structure

When some client functionality is needed making it necessary to use `use client`, don't apply it to the top-level component. Instead, consider structuring the components in such a way that only the interactive components are client components, the rest being server components.

## Naming Conventions

Use `Server`, `Client`, and `Display` suffixes only when a single feature is split into multiple related components that would otherwise share the same name. Most components need no role suffix — name them normally (e.g. `SiteHeader.tsx`, `PlanCard.tsx`).

When you do split a feature, use a shared prefix and a role suffix so related files group together. Export name and file name should match.

| Role     | File                          | Export                    | Notes                                                                                                           |
| -------- | ----------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Server   | `PlanCardPricingServer.tsx`   | `PlanCardPricingServer`   | Async RSC that fetches data or wraps async work in `<Suspense>`. Entry point used in pages and other RSCs.      |
| Display  | `PlanCardPricingDisplay.tsx`  | `PlanCardPricingDisplay`  | Pure, synchronous component. No `'use client'`, no `async`. Used by the server component, Storybook, and tests. |
| Client   | `PlanCardPricingClient.tsx`   | `PlanCardPricingClient`   | Interactive leaf with `'use client'`. Holds hooks, event handlers, or browser APIs.                             |
| Skeleton | `PlanCardPricingSkeleton.tsx` | `PlanCardPricingSkeleton` | Loading UI passed to `<Suspense fallback>`.                                                                     |
| Fetch    | `PlanCardPricing.ts`          | `fetchPlanCardPricing`    | Shared or cached fetch logic. Use a `.ts` file when there is no JSX.                                            |

Private implementation details keep the same prefix but do not get their own file or public export, e.g. `PlanCardPricingServerInner` inside `PlanCardPricingServer.tsx`.

Do not add `Server`, `Client`, or `Display` to every component — only when disambiguating siblings created by the same split. A standalone client component is just `AddToCartButton.tsx`, not `AddToCartButtonClient.tsx`.

## Separate Data Fetching from Display in Async RSCs

When an async Server Component fetches data and renders it, split it into two files:

- **Server component** — `async`, fetches data, passes it as props
- **Display component** — pure, accepts props, renderable anywhere (Storybook, tests, other RSCs)

The async server component must either be cached or wrapped in `<Suspense>` — otherwise Next.js will throw a caching error.

### Option A — Cache the fetch with `"use cache"`

```typescript

// ✅ PlanCardPricing.ts - cached fetch
export async function fetchPlanCardPricing(planId: string) {
  "use cache";
  ...
  return pricing;
}

// ✅ PlanCardPricingServer.tsx — cached fetch, delegates to display
export async function PlanCardPricingServer({ planId }: Props) {
  const pricing = await fetchPlanCardPricing(planId);
  return <PlanCardPricingDisplay {...pricing} />;
}

// ✅ PlanCardPricingDisplay.tsx — pure display, no async
export const PlanCardPricingDisplay = ({ price, badge }: DisplayProps) => (
  <div>...</div>
);
```

### Option B — Wrap the async fetch in `<Suspense>`

When the data should not be cached, keep the async work in an inner component and expose a public component that wraps it in `<Suspense>`:

```typescript
// ✅ PlanCardPricingServer.tsx
async function PlanCardPricingServerInner({ planId }: Props) {
  const pricing = await fetchPlanCardPricing(planId);
  return <PlanCardPricingDisplay {...pricing} />;
}

export function PlanCardPricingServer({ planId }: Props) {
  return (
    <Suspense fallback={<PlanCardPricingSkeleton />}>
      <PlanCardPricingServerInner planId={planId} />
    </Suspense>
  );
}

// ✅ PlanCardPricingDisplay.tsx — pure display, no async
export const PlanCardPricingDisplay = ({ price, badge }: DisplayProps) => (
  <div>...</div>
);
```

This lets Storybook and tests use the display component directly, and lets the server component be used as a slot in other RSCs.
