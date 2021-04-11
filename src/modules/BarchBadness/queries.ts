const SELECT_ALL_SONGS = `
SELECT song_id
FROM songs;`;

const INSERT_SONG = `
INSERT INTO songs (song_id)
VALUES (?);`;

const GET_LATEST_DAY = `
SELECT day
FROM "match"
ORDER BY day DESC
LIMIT 1;`;

const GET_SONG_ID = `
SELECT id
FROM songs
WHERE song_id = ?;`;

const INSERT_MATCH = `
INSERT INTO match (day, song_a, song_b, round) 
VALUES (?, ?, ?, ?);`;

const GET_MATCH_FROM_SONGS = `
SELECT id, day, song_a, song_b, round
FROM "match"
WHERE song_a = (
    SELECT id
    FROM songs
    WHERE song_id = ?
)
AND song_b = (
    SELECT id
    FROM songs
    WHERE song_id = ?
);`;

const SET_MATCH_WINNER = `
UPDATE match
SET winner = ?
WHERE id = ?;`;

const NUM_COMPLETED_MATCHES = `
SELECT COUNT(*) count
FROM "match"
WHERE day = ?
AND round = ?
AND winner IS NOT NULL;`;

const GET_WINNERS_OF_ROUND = `
SELECT song_id
FROM songs
WHERE id IN (
    SELECT winner
    FROM "match"
    WHERE day = ?
    AND round = ?
);`;

export default {
  SELECT_ALL_SONGS,
  INSERT_SONG,
  GET_SONG_ID,
  GET_LATEST_DAY,
  INSERT_MATCH,
  GET_MATCH_FROM_SONGS,
  SET_MATCH_WINNER,
  NUM_COMPLETED_MATCHES,
  GET_WINNERS_OF_ROUND
};
