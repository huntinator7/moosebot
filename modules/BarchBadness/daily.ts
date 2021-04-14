import SpotifyWebApi from "spotify-web-api-node";
import Discord from "discord.js";
import { round, setSpotifyToken, Song } from "./round";
import queries from "./queries";
import { Channels } from ".";
import numberToWords from "number-to-words";

export const daily = async (
  sp: SpotifyWebApi,
  db: any,
  channels: Channels,
  playlistId: string,
  mentionRole: string
) => {
  console.log("Running dailySongFunction");
  try {
    const ROUNDS_TO_HAVE = 3;
    // choose 2^x songs from Moosen Mix that haven't been chosen yet
    const songs = await getUnpickedSongs(sp, db, playlistId, ROUNDS_TO_HAVE);
    console.log("getUnpickedSongs done");

    const nextDay = ((await db.get(queries.GET_LATEST_DAY))?.day || 0) + 1;
    // alert the horde
    await channels.notify.send(
      `<@&${mentionRole}> Dawn of the ${numberToWords.toOrdinal(
        nextDay
      )} day. Let the voting commence!`
    );
    // split into groups of 2
    await round(songs, db, channels.vote, nextDay);
  } catch (e) {
    console.log(e);
    channels.notify.send(e || "An Error Occured");
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
