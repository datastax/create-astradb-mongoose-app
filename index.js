#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const downloadsDir = require("downloads-folder");
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

  const {
    ASTRA_DB_ID,
    ASTRA_DB_REGION,
    ASTRA_DB_KEYSPACE,
    ASTRA_DB_APPLICATION_TOKEN,
  } = process.env;
  const envConfig =
    ASTRA_DB_ID &&
    ASTRA_DB_REGION &&
    ASTRA_DB_KEYSPACE &&
    ASTRA_DB_APPLICATION_TOKEN;

  const { astraDbConfig, openAIKey } = await prompts([
    {
      type: envConfig ? null : "text",
      name: "astraDbConfig",
      message: "Where is your downloaded JSON API application configuration file located?",
      initial: path.resolve(downloadsDir(), "astradb-mongoose-config.json"),
      validate: (value) =>
        !fs.existsSync(value)
          ? "Configuration file doesn't exist. Please provide the correct path."
          : true,
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

  const config = envConfig
    ? {
        databaseId: ASTRA_DB_ID,
        region: ASTRA_DB_REGION,
        keyspace: ASTRA_DB_KEYSPACE,
        token: ASTRA_DB_APPLICATION_TOKEN,
      }
    : require(astraDbConfig);

  if (!config.databaseId) {
    throw new Error('Config file invalid, missing `databaseId`');
  }
  if (!config.region) {
    throw new Error('Config file invalid, missing `region`');
  }
  if (!config.keyspace) {
    throw new Error('Config file invalid, missing `keyspace`');
  }
  if (!config.token) {
    throw new Error('Config file invalid, missing `token`');
  }

  let env = `ASTRA_DB_ID=${config.databaseId}\nASTRA_DB_REGION=${config.region}\nASTRA_DB_KEYSPACE=${config.keyspace}\nASTRA_DB_APPLICATION_TOKEN=${config.token}`;

  if (openAIKey) {
    env += `\nOPENAI_API_KEY=${openAIKey}`;
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
