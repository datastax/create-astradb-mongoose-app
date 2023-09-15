const chalk = require("chalk");
const fetch = require("node-fetch");

const generateEmbedding = async (prompt) => {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: prompt,
      model: "text-embedding-ada-002",
    }),
  });

  if (response.status != 200) {
    throw `Failed to generate embedding: ${response.statusText}`;
  }

  const result = await response.json();

  return result.data[0].embedding;
};

const movieToString = (movie) => {
  if (movie.get("$similarity")) {
    return `${chalk.magenta(movie.get("$similarity"))} ${chalk.bold(
      movie.title,
    )} ${chalk.dim("(" + movie.genre + ", " + movie.year + ")")}
    ${movie.description}`;
  } else {
    return `${chalk.bold(movie.title)} ${chalk.dim(
      "(" + movie.genre + ", " + movie.year + ")",
    )}
    ${movie.description}`;
  }
};

const moviesToString = (movies) => {
  return movies.map((movie) => movieToString(movie)).join("\n  --\n");
};

module.exports = { generateEmbedding, movieToString, moviesToString };
