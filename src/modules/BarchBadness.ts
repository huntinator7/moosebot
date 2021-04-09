import sqlite3 from "sqlite3";
import SpotifyWebApi from "spotify-web-api-node";
import Discord from "discord.js";
import cron from "cron";
import config from "../../config";
import numberToWords from "number-to-words";

type Song = SpotifyApi.PlaylistTrackObject;

function BarchBadness(dc: Discord.Client, sp: SpotifyWebApi) {
  const job = new cron.CronJob(
    "0 0 9 * * *",
    dailySongFunction,
    null,
    true,
    "America/Denver"
  );

  const db = new sqlite3.Database("./db/checkedsongs.db", (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Connected to the checkedsongs database.");
  });

  async function dailySongFunction() {
    console.log("Running dailySongFunction");
    try {
      // choose 8 songs from Moosen Mix that haven't been chosen yet
      const songs = await getUnpickedSongs();
      console.log("getUnpickedSongs done", songs);
      // split into 4 groups of 2
      const songPairs = await buildSongPairs(songs);
      console.log("buildSongPairs done", songPairs);
      // generate message to send for each pair
      const messages = await Promise.all(
        songPairs.map((s, i) => generateMessage(s, 1, i))
      );
      console.log("generatedMessages done", messages);
      // send messages
      const sentMessages = await Promise.all(
        messages.map((m) => sendMessage(m))
      );
      console.log("sentMessages done", sentMessages);
      // add reactions to each message
      await Promise.all(sentMessages.map((s) => addReactionsToMessage(s)));
      console.log("addReactionsToMessage done");
    } catch (e) {
      dc.channels
        .fetch(config.discord.channelId)
        .then((channel) => (channel as Discord.TextChannel).send(e));
    }
  }

  async function getUnpickedSongs(): Promise<Song[]> {
    const creds = await sp.clientCredentialsGrant();
    sp.setAccessToken(creds.body["access_token"]);
    const getAndCheckSongs = async (
      page: number,
      songs: Song[]
    ): Promise<Song[]> => {
      const PAGE_SIZE = 100;
      const {
        body: { items: spTracks },
      } = await sp.getPlaylistTracks(config.spotify.playlistId, {
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        fields: "items(track(artists,name,external_urls,id))",
      });
      // console.log("getUnpickedSongs", spTracks);
      let dbTracks: string[] = [];
      await db.all("SELECT song_id from songs", [], (err, rows) => {
        if (err) {
          throw err;
        }
        dbTracks = rows.map((r) => r.song_id);
      });
      // console.log("getUnpickedSongs", dbTracks);
      const cleanTracks = [
        ...songs,
        ...spTracks.filter((t) => !dbTracks.includes(t.track.id)),
      ];
      // console.log("getUnpickedSongs", cleanTracks);
      if (cleanTracks.length >= 8) {
        // good to go, return
        console.log("good to go, return");
        return cleanTracks.slice(0, 8);
      } else if (spTracks.length === PAGE_SIZE) {
        // still more songs to check, call again with page
        console.log("still more songs to check, call again with page");
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
  }

  async function buildSongPairs(songs: Song[]): Promise<[Song, Song][]> {
    console.log("getUnpickedSongs");
    return [
      [songs[0], songs[1]],
      [songs[2], songs[3]],
      [songs[4], songs[5]],
      [songs[6], songs[7]],
    ];
  }

  async function generateMessage(
    songPair: [Song, Song],
    round: number,
    index: number
  ): Promise<string> {
    const buildSongMessage = (song: Song) =>
      `${song.track.name} by ${song.track.artists
        .map((a) => a.name)
        .join(", ")}\n${song.track.external_urls.spotify}`;
    return `
${buildBigText(`round ${round}`)}\n
${buildBigText(`matchup ${index + 1}`)}

Vote 🅰️ for ${buildSongMessage(songPair[0])}\n
Vote 🅱️ for ${buildSongMessage(songPair[1])}
    `;
  }

  async function sendMessage(message: string): Promise<Discord.Message> {
    const channel = (await dc.channels.fetch(
      config.discord.channelId
    )) as Discord.TextChannel;
    return channel.send(message);
  }

  async function addReactionsToMessage(
    message: Discord.Message
  ): Promise<void> {
    message.react("🅰️");
    message.react("🅱️");
  }

  job.start();
}

function buildBigText(str: string): string {
  return [...str]
    .map((char) => {
      console.log(char);
      if (char === " ") return " ";
      else if (Number.isNaN(parseInt(char)))
        return `:regional_indicator_${char}:`;
      else return `:${numberToWords.toWords(parseInt(char))}:`;
    })
    .join(" ");
}

export default BarchBadness;
