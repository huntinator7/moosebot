import SpotifyWebApi from "spotify-web-api-node";
import Discord from "discord.js";
import queries from "./queries";
import { round, roundFromLetter, setSpotifyToken } from "./round";
import { Channels } from ".";

export const reaction = async (
  reaction: Discord.MessageReaction,
  user: Discord.User | Discord.PartialUser,
  channels: Channels,
  db: any,
  sp: SpotifyWebApi
) => {
  const VOTES_TO_WIN = 5;
  // check if user who added reaction was bot
  if (user.bot) return;
  // check if correct channel
  if (reaction.message.channel.id !== channels.vote.id) return;
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
      channels,
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
  channels: Channels,
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
  // send notification message
  const notificationText =
    match.round === 0
      ? "was voted Song of the Day!"
      : `won in the ${roundFromLetter(match.round)} round`;
  await setSpotifyToken(sp);
  const song = await sp.getTrack(winningId);
  await channels.notify.send(
    `Congrats! ${song.body.name} by ${song.body.artists
      .map((a) => a.name)
      .join(", ")} ${notificationText}`
  );
  // check if final round of day
  if (match.round === 0) return;
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
    round(songs, db, channels.vote, match.day);
  }
};
