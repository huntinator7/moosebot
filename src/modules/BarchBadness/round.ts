import numberToWords from 'number-to-words';
import SpotifyWebApi from "spotify-web-api-node";
import Discord from "discord.js";
import queries from './queries';

export type Song = SpotifyApi.TrackObjectFull;

type SongPair = {
  song1: Song;
  song2: Song;
  day: number;
  round: number;
  matchNum: number;
};

export const round = async (
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

export const setSpotifyToken = async (sp: SpotifyWebApi) => {
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
