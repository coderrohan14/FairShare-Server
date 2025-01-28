const { default: mongoose } = require("mongoose");
const neo4j = require("neo4j-driver");

const connectDB = async (url) => {
  mongoose.connect(url);
};

const connectNeo4j = async () => {
  const driver = neo4j.driver(
    process.env.AUR_DB_URI,
    neo4j.auth.basic(process.env.AURA_DB_USERNAME, process.env.AURA_DB_PASSWORD)
  );
  const serverInfo = await driver.getServerInfo();
  console.log(serverInfo);
  return driver;
};

module.exports = { connectDB, connectNeo4j };
