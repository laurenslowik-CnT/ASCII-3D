# [Replace with client/project name]

## Getting started

1. Clone this repo:

```sh
git clone git@github.com:codeandtheory/[client-project_name].git # update with the repo URL
cd [client-project_name] # update
```

2. Use proper Node version:

```sh
nvm use # or nvm install
```

3. Install dependencies (please note we're using Yarn and not npm):

```sh
yarn
```

3. Run development server

```sh
yarn dev
```

4. Setup Git hooks

```sh
yarn prepare
```

## Storybook

This project uses Storybook deployed on Vercel at the following permanent URLs:

<!-- Optionally add other branches/environments -->

`main` branch -> [[client-project_name].vercel.app](https://[client-project_name].vercel.app) <br/>

as well as on ephemeral URLs for each Pull Request.

To run Storybook locally:

```sh
yarn storybook
```

## New component generator

As a convenience there is a new component generator script which will scaffold a basic boilerplate for the new component including the Storybook template with an option to link to the component design in Figma. In order to invoke it run the following command in your terminal:

```sh
yarn new:component
```

And follow prompts to give component name and Figma link.

### Extending component generator

If new useful patterns are observed either to improve the existing component generator or to add an entirely new kind of generator, you can look into `.plop` folder and follow [Plop](https://plopjs.com/) documentation.

## Environment variables

We're using T3 Env library to validate environment variables. Adding new environment variables (both client and server) is done inside src/env.ts file. After they're added you can use them directly:

```ts
import { env } from "@/env"; // On server

export const GET = async () => {
  const magic = await fetch("...", {
    headers: { Authorization: env.EXAMPLE_SERVER_VAR },
  });
  // ...
};
```

```ts
import { env } from "@/env"; // On client - same import!

export const SomeComponent = () => {
  return (
    <SomeProvider publishableKey={env.NEXT_PUBLIC_EXAMPLE_CLIENT_VAR}>
      {/* ... */}
    </SomeProvider>
  );
};
```

## Dependency analysis

Running

```sh
yarn dependency-graph
```

will start [skott](https://github.com/antoine-coulon/skott) tool on http://localhost:51024 from where you can have at glance view at both first and third party dependencies.

## Linting

Linting is done via [eslint](https://eslint.org/) and is triggered via yarn:

```sh
yarn lint
```

Some linting errors can be fixed automatically by eslint with:

```sh
yarn lint:fix
```

Linting is also triggered as a pre-commit action via Husky, and as a build check on pull requests in Github.

## Formatting

Formatting is done via [Prettier](http://prettier.io/) and is triggered via yarn:

```sh
yarn format
```

Some formatting errors can be fixed automatically by Prettier with:

```sh
yarn format:fix
```

Formatting is also triggered as a pre-commit action via Husky, and as a build check on pull requests in Github.
