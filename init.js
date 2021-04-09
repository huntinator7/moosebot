const sqlite3 = require("sqlite3");

const songDb = new sqlite3.Database("./db/checkedsongs.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the checkedsongs database.");
});

songDb.run(`CREATE TABLE IF NOT EXISTS songs(
    id INTEGER PRIMARY KEY,
    song_id TEXT NOT NULL UNIQUE);
`);