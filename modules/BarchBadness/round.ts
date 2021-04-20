import Discord from "discord.js";
import {
  DB,
  Song,
  roundFromLetter,
  SongPair,
  buildSongMessage,
  buildBigText,
} from "./helpers";
import queries from "./queries";

export const round = async (
  songs: Song[],
  channel: Discord.TextChannel,
  day: number,
  fs: DB
) => {
  const songPairs = await buildSongPairs(
    songs,
    Math.log2(songs.length) - 1,
    day,
    fs
  );
  console.log("buildSongPairs done");
  console.log(songPairs);
  // generate message to send for each pair
  const messages = await Promise.all(
    songPairs.map((pair) => generateMessage(pair, fs))
  );
  console.log("generatedMessages done");
  // console.log(messages);
  // send messages
  const sentMessages = await Promise.all(
    messages.map((m) => sendMessage(m, channel, fs))
  );
  console.log("sentMessages done");
  // console.log(sentMessages);
  // add reactions to each message
  await Promise.all(sentMessages.map((s) => addReactionsToMessage(s)));
  console.log("addReactionsToMessage done");
};

const buildSongPairs = async (
  songs: Song[],
  round: number,
  day: number,
  fs: DB
): Promise<SongPair[]> => {
  console.log("buildSongPairs");
  console.log(songs);
  const pairs: SongPair[] = Array.from(
    { length: Math.ceil(songs.length / 2) },
    (_v, i) => {
      return {
        song_a: songs[2 * i].id,
        song_b: songs[2 * i + 1].id,
        day,
        round,
        matchNum: i + 1,
      };
    }
  );

  // insert matches into DB
  await Promise.all(
    pairs.map(async (p) => {
      await queries.ADD_MATCH(p, fs);
    })
  );
  return pairs;
};

const generateMessage = async (
  { song_a, song_b, day, round, matchNum }: SongPair,
  fs: DB
): Promise<{ message: string; id: string }> => {
  console.log("generateMessage");
  return {
    message: `
${buildBigText(`day ${day}`)}\n
${buildBigText(`${roundFromLetter(round)} ${matchNum}`)}\n
Vote 🅰️ for ${await buildSongMessage(song_a, fs)}\n
Vote 🅱️ for ${await buildSongMessage(song_b, fs)}
`,
    id: `${song_a}-${song_b}`,
  };
};

const sendMessage = async (
  { message, id }: { message: string; id: string },
  channel: Discord.TextChannel,
  fs: DB
): Promise<Discord.Message> => {
  const sentMessage = await channel.send(message);
  await queries.SET_MATCH_MESSAGE_ID(id, sentMessage.id, fs);
  return sentMessage;
};

const addReactionsToMessage = async (
  message: Discord.Message
): Promise<void> => {
  message.react("🅰️");
  message.react("🅱️");
};
