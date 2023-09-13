const mongoose = require("mongoose");
const { driver, createAstraUri } = require("stargate-mongoose");

const connectToAstraDb = async () => {
  const uri = createAstraUri(
    process.env.ASTRA_DB_ID,
    process.env.ASTRA_DB_REGION,
    process.env.ASTRA_DB_KEYSPACE,
    process.env.ASTRA_DB_APPLICATION_TOKEN,
  );

  mongoose.set("autoCreate", true);
  mongoose.setDriver(driver);

  await mongoose.connect(uri, {
    isAstra: true,
  });
};

module.exports = { connectToAstraDb };
