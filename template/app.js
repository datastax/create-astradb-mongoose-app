require("dotenv").config();

const prompts = require("prompts");
const chalk = require("chalk");
const mongoose = require("mongoose");
const { connectToAstraDb } = require("./astradb-mongoose");
const { generateEmbedding, movieToString, moviesToString } = require("./util");

// Create Mongoose "movies" collection
const loadData = async () => {
  console.log(
    "Dropping existing collection " +
      chalk.bold.cyan("movies") +
      " if it exists...",
  );
  await mongoose.connection.dropCollection("movies");

  console.log(
    "Creating Mongoose collection " +
      chalk.bold.cyan("movies") +
      " and loading data from " +
      chalk.bold.cyan("movies.json") +
      "...",
  );
  const Movie = mongoose.model(
    "Movie",
    new mongoose.Schema(
      {
        title: String,
        year: Number,
        genre: String,
        description: String,
        $vector: {
          type: [Number],
          validate: (vector) => vector && vector.length === 1536,
        },
      },
      {
        collectionOptions: {
          vector: {
            size: 1536,
            function: "cosine",
          },
        },
      },
    ),
  );
  await Movie.init();

  const movies = require("./movies.json");
  console.log(
    "Inserting " + movies.length + " movies including vector embeddings... \n",
  );
  for (let i = 0; i < movies.length; i += 20) {
    await Movie.insertMany(movies.slice(i, i + 20));
  }
};

// "findOne()" pattern using movie 'genre', no vector search
const findMovieByGenre = async () => {
  const { genre } = await prompts({
    type: "select",
    name: "genre",
    message: "What kind of movie would you like to watch?",
    choices: [
      { title: "Comedy", value: "Comedy" },
      { title: "Drama", value: "Drama" },
      { title: "Western", value: "Western" },
      { title: "Romance", value: "Romance" },
    ],
  });

  const movie = await mongoose.model("Movie").findOne({ genre });

  console.log(`Sure! Here is an option for you:
${movieToString(movie)}
`);
};

// "find()" pattern using vector search, generates an embedding from user input
const findMovieByDescription = async () => {
  const { prompt } = await prompts({
    type: "text",
    name: "prompt",
    message: "Just tell me what you want to watch...",
  });

  const embedding = await generateEmbedding(prompt);

  const movies = await mongoose
    .model("Movie")
    .find(
      {},
      { title: 1, genre: 1, year: 1, description: 1 },
      { includeSimilarity: true },
    )
    .sort({ $vector: { $meta: embedding } })
    .limit(3);

  console.log(`Here are three most relevant movies based on your request:
${moviesToString(movies)}
`);
};

// Hybrid "find()" pattern using movie 'genre' and vector search, generates an embedding from user input
const findMovieByGenreAndDescription = async () => {
  const { genre, prompt } = await prompts([
    {
      type: "select",
      name: "genre",
      message: "First, what genre are you interested in?",
      choices: [
        { title: "Comedy", value: "Comedy" },
        { title: "Drama", value: "Drama" },
        { title: "Western", value: "Western" },
        { title: "Romance", value: "Romance" },
      ],
    },
    {
      type: "text",
      name: "prompt",
      message: "And now describe to me what you are looking for...",
    },
  ]);

  const embedding = await generateEmbedding(prompt);

  const movies = await mongoose
    .model("Movie")
    .find(
      { genre },
      { title: 1, genre: 1, year: 1, description: 1 },
      { includeSimilarity: true },
    )
    .sort({ $vector: { $meta: embedding } })
    .limit(3);

  console.log(`Here are two most relevant movies based on your request:
${moviesToString(movies)}
`);
};

(async () => {
  try {
    console.log(
      "0️⃣  Connecting to Astra Vector DB using the following values from your configuration..." +
        "\n" +
        chalk.bold.cyan("ASTRA_DB_API_ENDPOINT") +
        " = " +
        process.env.ASTRA_DB_API_ENDPOINT +
        "\n" +
        chalk.bold.cyan("ASTRA_DB_APPLICATION_TOKEN") +
        " = " +
        process.env.ASTRA_DB_APPLICATION_TOKEN.substring(0, 13) +
        "...\n\n",
    );
    await connectToAstraDb();

    console.log("0️⃣  Loading the data to Astra DB (~20s)...");
    await loadData();

    console.log(
      "1️⃣  With the data loaded, I can find a movie based on your favorite genre.",
    );
    await findMovieByGenre();

    if (process.env.OPENAI_API_KEY) {
      console.log(
        "2️⃣  You can also simply describe what you are looking for, and I will find relevant movies. I will use vector search!",
      );
      await findMovieByDescription();

      console.log("3️⃣  Finally, let's combine the two...");
      await findMovieByGenreAndDescription();

      console.log(
        "Be sure to check out the " +
          chalk.bold.cyan("app.js") +
          " and " +
          chalk.bold.cyan("astradb-mongoose.js") +
          " files for code examples using the Data API. \n\nHappy Coding!",
      );
    } else {
      console.log(
        `🚫 I can't generate embeddings without an OpenAI API key.
   Please set the ${chalk.bold(
     "OPENAI_API_KEY",
   )} environment variable or review the code to see how you can use vector search.`,
      );
    }
  } catch (e) {
    console.error(chalk.bold.red("[ERROR] ") + e);
  }
})();
