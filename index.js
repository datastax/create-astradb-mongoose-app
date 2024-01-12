#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const prompts = require("prompts");
const chalk = require("chalk");
const spawn = require("cross-spawn");

(async () => {
  const projectDir = path.resolve(process.cwd(), "astradb-mongoose-app");

  if (fs.existsSync(projectDir)) {
    console.log(
      "The project already exists. Delete it and re-run the command if you want to create a new one from scratch.",
    );
    console.log("  " + chalk.bold("rm -rf astradb-mongoose-app"));

    return;
  }

  fs.mkdirSync(projectDir, { recursive: true });
  fs.cpSync(path.resolve(__dirname, "template"), projectDir, {
    recursive: true,
  });

  let apiEndpoint = process.env.ASTRA_DB_API_ENDPOINT;
  let applicationToken = process.env.ASTRA_DB_APPLICATION_TOKEN;

  const answers = await prompts([
    {
      type: apiEndpoint ? null : "text",
      name: "apiEndpoint",
      message: "What is your Data API endpoint?",
    },
    {
      type: applicationToken ? null : "password",
      name: "applicationToken",
      message: "What is your Astra DB application token?",
    },
    {
      type: "toggle",
      name: "useOpenAI",
      message:
        "Do you want to enable vector search functionality (you will need a funded OpenAI account)?",
      initial: true,
      active: "Yes",
      inactive: "No",
    },
    {
      type: (useOpenAI) => (useOpenAI ? "password" : null),
      name: "openAIKey",
      message: "Awesome! What is your OpenAI API key?",
    },
  ]);

  if (!apiEndpoint) {
    apiEndpoint = answers.apiEndpoint;

    if (!apiEndpoint) {
      throw new Error("Missing API endpoint.");
    }
  }

  if (!applicationToken) {
    applicationToken = answers.applicationToken;

    if (!applicationToken) {
      throw new Error("Missing application token.");
    }
  }

  let env = `ASTRA_DB_API_ENDPOINT=${apiEndpoint}\nASTRA_DB_APPLICATION_TOKEN=${applicationToken}`;

  if (answers.openAIKey) {
    env += `\nOPENAI_API_KEY=${answers.openAIKey}`;
  }

  fs.writeFileSync(path.join(projectDir, ".env"), env);

  spawn.sync("npm", ["install"], { cwd: projectDir, stdio: "inherit" });

  console.log(`
-----

🎉 Congrats! You have successfully created a new ${chalk.bold.red(
    "Astra DB",
  )} application with ${chalk.bold.magenta("Mongoose")}!
👉 Next steps:
   1. Go to the newly created project folder.
      ${chalk.bold("cd astradb-mongoose-app")}
   2. Run the sample code.
      ${chalk.bold("npm start")}
   3. Enjoy development!
      😍
`);
})();
