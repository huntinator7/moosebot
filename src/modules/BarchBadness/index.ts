// @ts-ignore
import asyncqlite3 from "sqlite-async";
import SpotifyWebApi from "spotify-web-api-node";
import Discord from "discord.js";
import cron from "cron";
import numberToWords from "number-to-words";
import { MooseConfig } from "../../../config";
import queries from "./queries";

type Song = SpotifyApi.TrackObjectFull;

type SongPair = {
  song1: Song;
  song2: Song;
  day: number;
  round: number;
  matchNum: number;
};

const dailySongFunction = async (
  sp: SpotifyWebApi,
  db: any,
  channel: Discord.TextChannel,
  playlistId: string
) => {
  console.log("Running dailySongFunction");
  try {
    const ROUNDS_TO_HAVE = 3;
    // choose 2^x songs from Moosen Mix that haven't been chosen yet
    const songs = await getUnpickedSongs(sp, db, playlistId, ROUNDS_TO_HAVE);
    console.log("getUnpickedSongs done");

    const nextDay = ((await db.get(queries.GET_LATEST_DAY))?.day || 0) + 1;
    // split into groups of 2
    await doRound(songs, db, channel, nextDay);
  } catch (e) {
    console.log(e);
    channel.send(e || "An Error Occured");
  }
};

const getUnpickedSongs = async (
  sp: SpotifyWebApi,
  db: any,
  playlistId: string,
  round: number
): Promise<Song[]> => {
  await setSpotifyToken(sp);
  const getAndCheckSongs = async (
    page: number,
    songs: Song[]
  ): Promise<Song[]> => {
    const PAGE_SIZE = 100;
    const NUM_SONGS = Math.pow(2, round);

    let {
      body: { items: spTracks },
    } = await sp.getPlaylistTracks(playlistId, {
      offset: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      fields: "items(track(artists,name,external_urls,id))",
    });

    const spTracksClean = spTracks
      .map((s) => s.track)
      .sort((a, b) => (a.id < b.id ? -1 : 1));

    let dbTracks = await db.all(queries.SELECT_ALL_SONGS, []);
    dbTracks = dbTracks.map((d: any) => d.song_id);
    console.log(dbTracks);

    const cleanTracks = [
      ...songs,
      ...spTracksClean.filter((t) => !dbTracks.includes(t.id)),
    ];
    console.log(cleanTracks);

    if (cleanTracks.length >= NUM_SONGS) {
      // good to go, return
      console.log("good to go, return");
      const songsToAdd = cleanTracks.slice(0, NUM_SONGS);
      const insertSong = await db.prepare(queries.INSERT_SONG);
      await Promise.all(
        songsToAdd.map(async (s) => {
          await insertSong.run(s.id);
        })
      );
      return songsToAdd;
    } else if (spTracksClean.length === PAGE_SIZE) {
      // still more songs to check, call again with page
      console.log(
        "still more songs to check, call again with page " + page + 1
      );
      return getAndCheckSongs(page + 1, cleanTracks);
    } else {
      // out of songs, not enough to run the daily song function
      console.log("out of songs, not enough to run the daily song function");
      throw new Error(
        "Not enough songs to put up for vote! You guys need to be adding more to Moosen Mix!"
      );
    }
  };

  return await getAndCheckSongs(0, []);
};

const doRound = async (
  songs: Song[],
  db: any,
  channel: Discord.TextChannel,
  day: number
) => {
  const songPairs = await buildSongPairs(
    songs,
    db,
    Math.log2(songs.length) - 1,
    day
  );
  console.log("buildSongPairs done");
  // generate message to send for each pair
  const messages = await Promise.all(
    songPairs.map((pair) => generateMessage(pair))
  );
  console.log("generatedMessages done");
  // send messages
  const sentMessages = await Promise.all(
    messages.map((m) => sendMessage(m, channel))
  );
  console.log("sentMessages done");
  // add reactions to each message
  await Promise.all(sentMessages.map((s) => addReactionsToMessage(s)));
  console.log("addReactionsToMessage done");
};

const setSpotifyToken = async (sp: SpotifyWebApi) => {
  const creds = await sp.clientCredentialsGrant();
  sp.setAccessToken(creds.body["access_token"]);
};

const buildSongPairs = async (
  songs: Song[],
  db: any,
  round: number,
  day: number
): Promise<SongPair[]> => {
  console.log("buildSongPairs");
  const pairs: SongPair[] = Array.from(
    { length: Math.ceil(songs.length / 2) },
    (_v, i) => {
      return {
        song1: songs[i * 2],
        song2: songs[i * 2 + 1],
        day,
        round,
        matchNum: i + 1,
      };
    }
  );
  await pairs.forEach(async (p) => {
    const { id: song_a } = await db.get(queries.GET_SONG_ID, p.song1.id);
    const { id: song_b } = await db.get(queries.GET_SONG_ID, p.song2.id);
    console.log(song_a, song_b);
    await db.run(queries.INSERT_MATCH, p.day, song_a, song_b, round);
  });
  return pairs;
};

const generateMessage = async ({
  song1,
  song2,
  day,
  round,
  matchNum,
}: SongPair): Promise<string> => {
  console.log("generateMessage");
  return `
${buildBigText(`day ${day}`)}\n
${buildBigText(`${roundFromLetter(round, matchNum)}`)}\n
Vote 🅰️ for ${buildSongMessage(song1)}\n
Vote 🅱️ for ${buildSongMessage(song2)}
  `;
};

const sendMessage = async (
  message: string,
  channel: Discord.TextChannel
): Promise<Discord.Message> => {
  return channel.send(message);
};

const addReactionsToMessage = async (
  message: Discord.Message
): Promise<void> => {
  message.react("🅰️");
  message.react("🅱️");
};

const roundFromLetter = (round: number, matchNum: number) => {
  const rounds = [
    "final",
    "semifinal",
    "quarterfinal",
    "elite eight",
    "sweet sixteen",
    "round of 32",
    "round of 64",
    "round of 128",
    "round of 256",
  ];
  return `${rounds[round]} ${matchNum}`;
};

const buildSongMessage = (song: Song) =>
  `${song.name} by ${song.artists.map((a) => a.name).join(", ")}\n${
    song.external_urls.spotify
  }`;

const buildBigText = (str: string): string => {
  return [...str]
    .map((char) => {
      if (char === " ") return " ";
      else if (Number.isNaN(parseInt(char)))
        return `:regional_indicator_${char}:`;
      else return `:${numberToWords.toWords(parseInt(char))}:`;
    })
    .join(" ");
};

const messageReactionAdd = async (
  reaction: Discord.MessageReaction,
  user: Discord.User | Discord.PartialUser,
  channel: Discord.TextChannel,
  db: any,
  sp: SpotifyWebApi
) => {
  const VOTES_TO_WIN = 2;
  // check if user who added reaction was bot
  if (user.bot) return;
  // check if correct channel
  if (reaction.message.channel.id !== channel.id) return;
  // check if correct emoji
  if (!["🅰️", "🅱️"].includes(reaction.emoji.toString())) {
    await reaction.remove();
    return;
  }
  // check if user reacted other emoji, remove that one
  const isReactionA = reaction.emoji.toString() === "🅰️";

  let reactionMessage = await reaction.message.fetch();
  let otherReaction = reactionMessage.reactions.cache.get(
    isReactionA ? "🅱️" : "🅰️"
  )?.users;

  await otherReaction?.remove(user as Discord.User);

  // update reactionMessage and otherReaction
  reactionMessage = await reaction.message.fetch(true);
  otherReaction = reactionMessage.reactions.cache.get(isReactionA ? "🅱️" : "🅰️")
    ?.users;

  console.log("Ready to process reaction");

  if ((reaction.count ?? 0) >= VOTES_TO_WIN) {
    console.log("winner declared");
    const winningId = getSongFromMsg(reactionMessage, isReactionA);
    const losingId = getSongFromMsg(reactionMessage, !isReactionA);
    declareMatchWinner(
      winningId,
      losingId,
      db,
      reactionMessage,
      channel,
      sp,
      isReactionA
    );
  }
};

const getSongFromMsg = (msg: Discord.Message, isReactionA: boolean): string => {
  const match = isReactionA
    ? /Vote 🅰️(.|)*\nhttps:\/\/open\.spotify\.com\/track\/(.*)/m
    : /Vote 🅱️(.|)*\nhttps:\/\/open\.spotify\.com\/track\/(.*)/m;

  const found = msg.content.match(match);
  return found?.[2] ?? "";
};

const declareMatchWinner = async (
  winningId: string,
  losingId: string,
  db: any,
  reactionMessage: Discord.Message,
  channel: Discord.TextChannel,
  sp: SpotifyWebApi,
  isReactionA: boolean
) => {
  // update match in db
  const ids = isReactionA ? [winningId, losingId] : [losingId, winningId];
  const match = await db.get(queries.GET_MATCH_FROM_SONGS, ...ids);
  console.log(match);

  const winner = await db.get(queries.GET_SONG_ID, winningId);

  await db.run(queries.SET_MATCH_WINNER, winner.id, match.id);
  // delete message
  await reactionMessage.delete();
  // check if final round of day
  if (match.round === 0) {
    await setSpotifyToken(sp);
    const song = await sp.getTrack(winningId);
    channel.send(
      `Congrats! ${song.body.name} by ${song.body.artists
        .map((a) => a.name)
        .join(", ")} was voted Song of the Day!`
    );
    return;
  }
  // check if next round start ready
  const numCompletedMatches = await db.get(
    queries.NUM_COMPLETED_MATCHES,
    match.day,
    match.round
  );
  if (Math.pow(2, match.round) === numCompletedMatches.count) {
    // ready to start next round
    // grab songs
    const winners = await db.all(
      queries.GET_WINNERS_OF_ROUND,
      match.day,
      match.round
    );
    await setSpotifyToken(sp);
    const {
      body: { tracks: songs },
    } = await sp.getTracks(winners.map((w: any) => w.song_id));
    // start new round
    doRound(songs, db, channel, match.day);
  }
};

async function BarchBadness(
  dc: Discord.Client,
  sp: SpotifyWebApi,
  config: MooseConfig
) {
  const db = await asyncqlite3.open("./db/checked_songs.db");
  console.log("Connected to the checked_songs database.");

  const channel = (await dc.channels.fetch(
    config.BarchBadness.discordChannelId
  )) as Discord.TextChannel;

  const job = new cron.CronJob(
    "0 0 9 * * *",
    () =>
      dailySongFunction(sp, db, channel, config.BarchBadness.spotifyPlaylistId),
    null,
    true,
    "America/Denver"
  );

  job.start();

  // add channel messages to cache
  channel.messages.fetch({ limit: 100 });

  dc.on("messageReactionAdd", (r, u) =>
    messageReactionAdd(r, u, channel, db, sp)
  );
}

export default BarchBadness;
