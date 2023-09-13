require("dotenv").config();

const prompts = require("prompts");
const chalk = require("chalk");
const mongoose = require("mongoose");
const { connectToAstraDb } = require("./astradb-mongoose");
const { generateEmbedding, movieToString, moviesToString } = require("./util");

const loadData = async () => {
  await mongoose.connection.dropCollection("movies");

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

  const movies = require("./movies.json");
  for (let i = 0; i < movies.length; i += 20) {
    await Movie.insertMany(movies.slice(i, i + 20));
  }
};

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

const findMovieByDescription = async () => {
  const { prompt } = await prompts({
    type: "text",
    name: "prompt",
    message: "Just tell me what you want to watch...",
  });

  const embedding = await generateEmbedding(prompt);

  const movies = await mongoose
    .model("Movie")
    .find({})
    .sort({ $vector: { $meta: embedding } })
    .limit(3);

  console.log(`Here are three most relevant movies based on your request:
${moviesToString(movies)}
`);
};

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
    .find({ genre })
    .sort({ $vector: { $meta: embedding } })
    .limit(2);

  console.log(`Here are two most relevant movies based on your request:
${moviesToString(movies)}
`);
};

(async () => {
  try {
    await connectToAstraDb();

    process.stdout.write("0️⃣  Loading the data to Astra DB... ");
    await loadData();
    process.stdout.write(" DONE\n\n");

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
