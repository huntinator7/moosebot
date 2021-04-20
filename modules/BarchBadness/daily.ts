import SpotifyWebApi from "spotify-web-api-node";
import numberToWords from "number-to-words";
import { Channels, DB, Playlists, setSpotifyToken, Song } from "./helpers";
import { round } from "./round";
import queries from "./queries";

export const daily = async (
  sp: SpotifyWebApi,
  channels: Channels,
  playlists: Playlists,
  mentionRole: string,
  fs: DB
) => {
  console.log("Running dailySongFunction");
  try {
    const ROUNDS_TO_HAVE = 3;
    // choose 2^x songs from Moosen Mix that haven't been chosen yet
    const songs = await getUnpickedSongs(
      sp,
      playlists.main,
      ROUNDS_TO_HAVE,
      fs
    );
    console.log("getUnpickedSongs done");

    // add to voting playlist
    await sp.addTracksToPlaylist(
      playlists.voting,
      songs.map((s) => `spotify:track:${s.id}`)
    );

    const nextDay = (await queries.GET_LATEST_DAY(fs)) + 1;
    // alert the horde
    await channels.notify.send(
      `<@&${mentionRole}> Dawn of the ${numberToWords.toOrdinal(
        nextDay
      )} day. Let the voting commence!`
    );
    // split into groups of 2
    await round(songs, channels.vote, nextDay, fs);
  } catch (e) {
    console.log(e);
    channels.notify.send(e || "An Error Occured");
  }
};

const getUnpickedSongs = async (
  sp: SpotifyWebApi,
  playlistId: string,
  round: number,
  fs: DB
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

    const cleanSpTracks = spTracks
      .map(
        ({
          track: {
            artists,
            name,
            external_urls: { spotify: external_url },
            id,
          },
        }) => ({
          artists: artists.map((a) => a.name).join(", "),
          name,
          id,
          external_url,
        })
      )
      .sort((a, b) => (a.id < b.id ? -1 : 1));

    let dbTracks = await queries.GET_ALL_SONGS(fs);

    const cleanDbTracks = dbTracks.map((u) => u.id);

    const cleanTracks = [
      ...songs,
      ...cleanSpTracks.filter((t) => !cleanDbTracks.includes(t.id)),
    ];

    if (cleanTracks.length >= NUM_SONGS) {
      // good to go, return
      console.log("good to go, return");
      const songsToAdd = cleanTracks.slice(0, NUM_SONGS);
      await Promise.all(
        songsToAdd.map(async (s) => {
          await queries.ADD_SONG(s, fs);
        })
      );
      return songsToAdd;
    } else if (cleanSpTracks.length === PAGE_SIZE) {
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
