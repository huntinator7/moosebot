import { SongPair, DB, Song, Match } from "./helpers";

const SELECT_ALL_SONGS = `
SELECT *
FROM songs;`;

const SELECT_ALL_MATCHES = `
SELECT * 
FROM match;`;

const GET_SONG_BY_ID = async (id: string, fs: DB): Promise<Song> => {
  return (await (await fs.collection("Songs").doc(id).get()).data()) as Song;
};

const GET_MATCH_BY_ID = async (id: string, fs: DB): Promise<Match> => {
  return (await (await fs.collection("Matches").doc(id).get()).data()) as Match;
};

const GET_LATEST_DAY = async (fs: DB): Promise<number> => {
  return (
    (await (
      await fs.collection("Matches").orderBy("day", "desc").limit(1).get()
    ).docs[0]?.get("day")) ?? 0
  );
};

const ADD_MATCH = async (
  p: SongPair,
  matchIndex: number,
  fs: DB
): Promise<void> => {
  const matchId = `${p.song_a}-${p.song_b}`;
  const song_a = await GET_SONG_BY_ID(p.song_a, fs);
  const song_b = await GET_SONG_BY_ID(p.song_b, fs);
  await fs.collection("Matches").doc(matchId).set({
    day: p.day,
    round: p.round,
    matchIndex,
    song_a,
    song_b,
  });
};

const GET_ALL_SONGS = async (fs: DB): Promise<Song[]> => {
  return (await fs.collection("Songs").get()).docs.map((d) => d.data() as Song);
};

const GET_ALL_MATCHES = async (fs: DB): Promise<Match[]> => {
  return (await fs.collection("Matches").get()).docs.map(
    (d) => ({ ...d.data(), id: d.id } as Match)
  );
};

const ADD_SONG = async (s: Song, fs: DB): Promise<void> => {
  await fs.collection("Songs").doc(s.id).set(s);
};

const SET_MATCH_MESSAGE_ID = async (
  id: string,
  messageId: string,
  fs: DB
): Promise<void> => {
  await fs.collection("Matches").doc(id).update({ messageId });
};

const SET_MATCH_WINNER = async (
  id: string,
  winner: Song,
  fs: DB
): Promise<void> => {
  await fs.collection("Matches").doc(id).update({ winner });
};

const SET_MATCH_VOTERS = async (
  id: string,
  matchVotes: any,
  fs: DB
): Promise<void> => {
  console.log(id, matchVotes);
  await fs.collection("Matches").doc(id).update(matchVotes);
};

const GET_COMPLETED_MATCHES_BY_DAY_AND_ROUND = async (
  day: number,
  round: number,
  fs: DB
): Promise<Match[]> => {
  return (
    await fs
      .collection("Matches")
      .where("day", "==", day)
      .where("round", "==", round)
      .where("winner", "!=", null)
      .get()
  ).docs.map((d) => d.data() as Match);
};

const GET_NUM_COMPLETED_MATCHES = async (
  day: number,
  round: number,
  fs: DB
): Promise<number> => {
  const matches = await GET_COMPLETED_MATCHES_BY_DAY_AND_ROUND(day, round, fs);
  return matches.length;
};

const GET_PREVIOUS_ROUND_WINNERS = async (
  day: number,
  round: number,
  fs: DB
): Promise<Song[]> => {
  const matches = await GET_COMPLETED_MATCHES_BY_DAY_AND_ROUND(day, round, fs);

  return matches
    .sort((a, b) => (a?.matchIndex ?? 0) - (b?.matchIndex ?? 0))
    .map((m) => m.winner as Song);
};

const imageUrls: Record<string, string> = {
  "ZTagger1911": "https://cdn.discordapp.com/avatars/147143598301773824/304fd2bfcede09858e8169cf36242410.webp?size=128",
  "huntinator7": "https://cdn.discordapp.com/avatars/89758327621296128/fd1f5e51ccd7c84a5270a6f0537efc14.webp?size=128",
  "skwid23": "https://cdn.discordapp.com/avatars/262122518993829891/bf2d852225a11319110a7276c1c225c1.webp?size=128",
  "Tater_Hater": "https://cdn.discordapp.com/avatars/185934787679092736/bd2808789fb6c798de35efc431f283ae.webp?size=128",
  "potatobattery": "https://cdn.discordapp.com/avatars/262161423415640064/e4ef6129fe01322391b99cddb14b5790.webp?size=128",
  "Samlen1020": "https://cdn.discordapp.com/avatars/693312649559146546/426c468f705c334c2542eec428d5ec33.webp?size=128",
  "Derko": "https://cdn.discordapp.com/avatars/81913971979849728/1d634249f882edfb2640ea77f55d4a8b.webp?size=128",
  "cenakr": "https://cdn.discordapp.com/embed/avatars/1.png",
  "splatterdodge": "https://cdn.discordapp.com/avatars/207214113191886849/947f0a7ebd0bf1342938b7e19f333cec.webp?size=128"
}

const UPDATE_ALL_MATCH_IMAGES = async (fs: DB): Promise<void> => {
  console.log("UPDATE_ALL_MATCH_IMAGES");
  const allMatches = await GET_ALL_MATCHES(fs);
  allMatches.forEach(async (match) => {
    const song_a_votes = match.song_a_votes?.map(({ name, avatar }) => ({ name, avatar: imageUrls[name] || avatar })) ?? [];
    const song_b_votes = match.song_b_votes?.map(({ name, avatar }) => ({ name, avatar: imageUrls[name] || avatar })) ?? [];
    await fs.collection("Matches").doc(match.id).update({ song_a_votes, song_b_votes });
  });
}

export default {
  SELECT_ALL_SONGS,
  SELECT_ALL_MATCHES,
  GET_LATEST_DAY,
  GET_ALL_MATCHES,
  ADD_MATCH,
  GET_SONG_BY_ID,
  GET_ALL_SONGS,
  ADD_SONG,
  SET_MATCH_MESSAGE_ID,
  SET_MATCH_WINNER,
  GET_MATCH_BY_ID,
  GET_NUM_COMPLETED_MATCHES,
  GET_PREVIOUS_ROUND_WINNERS,
  GET_COMPLETED_MATCHES_BY_DAY_AND_ROUND,
  SET_MATCH_VOTERS,
  UPDATE_ALL_MATCH_IMAGES,
};
