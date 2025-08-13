function generator(plop) {
  plop.setGenerator("component", {
    description: "Creates a new component inside of 'src/app/components'",
    prompts: [
      {
        type: "input",
        name: "name",
        message:
          "What is the name of the component? This will be placed in 'src/app/components/{foo-bar}'",
      },
      {
        type: "input",
        name: "figmaLink",
        message: "Paste Figma component link (Optional)",
      },
    ],
    actions: [
      // component
      {
        type: "add",
        path: "../src/app/components/{{kebabCase name}}/{{kebabCase name}}.component.tsx",
        templateFile: "templates/component/component.tsx.hbs",
      },
      // stories
      {
        type: "add",
        path: "../src/app/components/{{kebabCase name}}/{{kebabCase name}}.component.stories.tsx",
        templateFile: "templates/component/component.stories.tsx.hbs",
      },
    ],
  });
}

export default generator;
