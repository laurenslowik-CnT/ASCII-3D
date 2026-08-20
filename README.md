# ASCII NYC Navigator

**Walk around New York City, rendered entirely in ASCII art.**

Type in any Manhattan address and you're dropped onto that street corner. Buildings, avenues, and skyline all drawn with text characters — like a retro terminal that somehow became a city.

**Try it live → [ascii-3d.vercel.app](https://ascii-3d.vercel.app)**

## What you can do

- **Search any address** — type a Manhattan address in the box, hit **Go**, and teleport there.
- **Walk around** — use the **arrow keys** (or **WASD**) to move and turn. Press **Q** / **E** to look up and down.
- **Switch how the city looks** — press **Tab** (or the button in the top-right corner) to cycle between three views:

| View      | What it shows                                                            |
| --------- | ------------------------------------------------------------------------ |
| **3D**    | A first-person, walk-through street view of the buildings around you.    |
| **MAP**   | A top-down map of the neighborhood, like looking at the city from above. |
| **PHOTO** | A richer, photo-like ASCII rendering of the real skyline.                |

That's it — no account, no install. Just open the link and start exploring.

---

## For developers

A [Next.js](https://nextjs.org/) app. The city is built from OpenStreetMap building data, addresses are looked up with the Google Maps API, and the PHOTO view is rendered from Mapbox GL — everything is then re-drawn as ASCII on a canvas.

### Getting started

1. Clone the repo:

   ```sh
   git clone git@github.com:codeandtheory/ASCII-3D.git
   cd ASCII-3D
   ```

2. Use the right Node version:

   ```sh
   nvm use # or nvm install
   ```

3. Install dependencies (this project uses **pnpm**):

   ```sh
   pnpm install
   ```

4. Add your API keys — copy `.env.example` to `.env.local` and fill in:

   - `GOOGLE_MAPS_API_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — address search
   - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` — optional, powers the PHOTO view

5. Run the development server:

   ```sh
   pnpm dev
   ```

6. Set up Git hooks:

   ```sh
   pnpm prepare
   ```

### Common commands

| Command                           | What it does                                   |
| --------------------------------- | ---------------------------------------------- |
| `pnpm dev`                        | Run the app locally at `http://localhost:3000` |
| `pnpm build`                      | Production build                               |
| `pnpm test`                       | Run the test suite (Vitest)                    |
| `pnpm lint` / `pnpm lint:fix`     | Lint with ESLint (auto-fix available)          |
| `pnpm format` / `pnpm format:fix` | Check / apply Prettier formatting              |
| `pnpm storybook`                  | Run the Storybook component explorer           |
| `pnpm new:component`              | Scaffold a new component (see below)           |

Linting and formatting also run automatically on commit (via Husky) and on every pull request.

### New component generator

`pnpm new:component` scaffolds a boilerplate component including a Storybook template, with an option to link the component's Figma design. Follow the prompts for the component name and Figma link.

To extend or add generators, see the `.plop` folder and the [Plop docs](https://plopjs.com/).

### Environment variables

Environment variables are validated with [T3 Env](https://env.t3.gg/). Add new ones in `src/env.ts`, then import them the same way on both server and client:

```ts
import { env } from "@/env";
```

### Other tooling

- **Dependency graph** — `pnpm dependency-graph` starts [skott](https://github.com/antoine-coulon/skott) at `http://localhost:51024` for a visual view of first- and third-party dependencies.
- **Storybook** — deployed on Vercel, with an ephemeral URL for each pull request.
</content>
