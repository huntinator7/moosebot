const sqlite3 = require("sqlite3");

const BarchBadnessDB = new sqlite3.Database("./db/barch_badness.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Created barch_badness");
});

BarchBadnessDB.run(`
CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY,
  song_id TEXT NOT NULL UNIQUE
);`);

BarchBadnessDB.run(`
CREATE TABLE IF NOT EXISTS match (
  id INTEGER PRIMARY KEY,
  day INTEGER NOT NULL,
  song_a INTEGER NOT NULL,
  song_b INTEGER NOT NULL,
  round INTEGER NOT NULL,
  winner INTEGER,
    FOREIGN KEY (song_a) REFERENCES songs (id),
    FOREIGN KEY (song_b) REFERENCES songs (id),
    FOREIGN KEY (winner) REFERENCES songs (id)
);`);

BarchBadnessDB.close();
