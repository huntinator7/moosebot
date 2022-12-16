import Discord from "discord.js";
import SpotifyWebApi from "spotify-web-api-node";
import numberToWords from "number-to-words";
import queries from "./queries";

export const setSpotifyToken = async (sp: SpotifyWebApi) => {
  sp.setAccessToken((await sp.refreshAccessToken()).body["access_token"]);
};

export const roundFromLetter = (round: number) => {
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
  return rounds[round];
};

export const getSongFromMsg = (
  msg: Discord.Message,
  isReactionA: boolean,
  isReactionOld: boolean
): string => {
  const match = isReactionOld
    ? isReactionA
      ? /Vote 🅰️(.|)*\nhttps:\/\/open\.spotify\.com\/track\/(.*)/m
      : /Vote 🅱️(.|)*\nhttps:\/\/open\.spotify\.com\/track\/(.*)/m
    : isReactionA
    ? /Vote 🟥(.|)*\nhttps:\/\/open\.spotify\.com\/track\/(.*)/m
    : /Vote 🟩(.|)*\nhttps:\/\/open\.spotify\.com\/track\/(.*)/m;

  const found = msg.content.match(match);
  return found?.[2] ?? "";
};

export const buildSongMessage = async (songId: string, fs: DB) => {
  const song = await queries.GET_SONG_BY_ID(songId, fs);
  return `${song?.name} by ${song?.artists}\n${song?.external_url}`;
};

export const buildBigText = (str: string): string => {
  return [...str]
    .map((char) => {
      if (char === " ") return " ";
      else if (Number.isNaN(parseInt(char)))
        return `:regional_indicator_${char}:`;
      else return `:${numberToWords.toWords(parseInt(char))}:`;
    })
    .join(" ");
};

export const reactionIsA = (reaction: Discord.MessageReaction): boolean => {
  return (
    reaction.emoji.toString() === "🅰️" || reaction.emoji.toString() === "🟥"
  );
};

export const reactionIsOld = (reaction: Discord.MessageReaction): boolean => {
  return (
    reaction.emoji.toString() === "🅰️" || reaction.emoji.toString() === "🅱️"
  );
};

export const getOppositeReaction = (
  reaction: Discord.MessageReaction
): string => {
  function test() {
    switch (reaction.emoji.toString()) {
      case "🅰️":
        return "🅱️";
      case "🅱️":
        return "🅰️";
      case "🟥":
        return "🟩";
      case "🟩":
        return "🟥";
      default:
        return "";
    }
  }
  return test();
};

export type Song = {
  id: string;
  name: string;
  artists: string;
  external_url: string;
};

export type Match = {
  day: number;
  messageId?: string;
  round: number;
  matchIndex?: number;
  song_a: Song;
  song_b: Song;
  winner?: Song;
  song_a_votes: Vote[];
  song_b_votes: Vote[];
  id: string;
};

export type Channels = {
  vote: Discord.TextChannel;
  notify: Discord.TextChannel;
};

export type Playlists = {
  voting: string;
  winners: string;
  main: string;
};

export type DB = FirebaseFirestore.DocumentReference;

export type SongPair = {
  song_a: string;
  song_b: string;
  day: number;
  round: number;
  matchNum: number;
};

export type Vote = {
  avatar: string;
  name: string;
}
