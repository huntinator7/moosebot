const sqlite3 = require("sqlite3");

const songDb = new sqlite3.Database("./db/checked_songs.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the checked_songs database.");
});

songDb.run(`CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY,
  song_id TEXT NOT NULL UNIQUE
  );
`);

songDb.run(`CREATE TABLE IF NOT EXISTS match (
  id INTEGER PRIMARY KEY,
  day INTEGER NOT NULL,
  song_a INTEGER NOT NULL,
  song_b INTEGER NOT NULL,
  round INTEGER NOT NULL,
  winner INTEGER,
    FOREIGN KEY (song_a) REFERENCES songs (id),
    FOREIGN KEY (song_b) REFERENCES songs (id),
    FOREIGN KEY (winner) REFERENCES songs (id)
  );
`);
