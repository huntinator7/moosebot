import SpotifyWebApi from "spotify-web-api-node";
import Discord from "discord.js";
import queries from "./queries";
import {
  Channels,
  DB,
  getOppositeReaction,
  getSongFromMsg,
  Playlists,
  roundFromLetter,
  setSpotifyToken,
  reactionIsA,
  reactionIsOld,
} from "./helpers";
import { round } from "./round";

export const reaction = async (
  reaction: Discord.MessageReaction,
  user: Discord.User | Discord.PartialUser,
  channels: Channels,
  fs: DB,
  mentionRole: string,
  votesToWin: number,
  playlists: Playlists,
  sp: SpotifyWebApi
) => {
  // check if user who added reaction was bot
  if (user.bot) return;
  // check if correct channel
  if (reaction.message.channel.id !== channels.vote.id) return;
  // check if correct emoji
  if (!["🅰️", "🅱️", "🟩", "🟥"].includes(reaction.emoji.toString())) {
    await reaction.remove();
    return;
  }
  // check if user reacted other emoji, remove that one
  const isReactionA = reactionIsA(reaction);
  const isReactionOld = reactionIsOld(reaction);
  console.log(isReactionA, isReactionOld, getOppositeReaction(reaction));

  let reactionMessage = await reaction.message.fetch();
  let otherReaction = reactionMessage.reactions.cache.get(
    getOppositeReaction(reaction)
  )?.users;

  await otherReaction?.remove(user as Discord.User);

  // update reactionMessage and otherReaction
  reactionMessage = await reaction.message.fetch(true);
  otherReaction = reactionMessage.reactions.cache.get(
    getOppositeReaction(reaction)
  )?.users;

  const users = await Promise.all(
    reactionMessage.reactions.cache.map(async (r) => {
      const users = await r.users.fetch();
      console.log(reactionIsA(r));
      const vote = reactionIsA(r) ? "song_a_votes" : "song_b_votes";
      return {
        vote,
        users: users
          .filter((u) => !u.bot)
          .map((u) => ({
            avatar: u.displayAvatarURL(),
            name: u.username,
          })),
      };
    })
  );

  console.log(reactionMessage.reactions);

  const songUsers = users.reduce(
    (a, c) => ({
      ...a,
      [c.vote]: c.users,
    }),
    {}
  );

  console.log(songUsers);

  const winningId = getSongFromMsg(reactionMessage, isReactionA, isReactionOld);
  const losingId = getSongFromMsg(reactionMessage, !isReactionA, isReactionOld);

  const ids = isReactionA ? [winningId, losingId] : [losingId, winningId];
  const matchId = `${ids[0]}-${ids[1]}`;

  await queries.SET_MATCH_VOTERS(matchId, songUsers, fs);

  console.log("Ready to process reaction");

  if ((reaction.count ?? 0) >= votesToWin) {
    console.log("winner declared");
    declareMatchWinner({
      winningId,
      losingId,
      fs,
      reactionMessage,
      channels,
      mentionRole,
      playlists,
      sp,
      matchId,
    });
  }
};

interface declareMatchWinnerProps {
  winningId: string;
  losingId: string;
  fs: DB;
  reactionMessage: Discord.Message;
  channels: Channels;
  mentionRole: string;
  playlists: Playlists;
  sp: SpotifyWebApi;
  matchId: string;
}

const declareMatchWinner = async ({
  winningId,
  losingId,
  fs,
  reactionMessage,
  channels,
  mentionRole,
  playlists,
  sp,
  matchId,
}: declareMatchWinnerProps) => {
  // update match in db
  const winner = await queries.GET_SONG_BY_ID(winningId, fs);
  const loser = await queries.GET_SONG_BY_ID(losingId, fs);
  const match = await queries.GET_MATCH_BY_ID(matchId, fs);

  await queries.SET_MATCH_WINNER(matchId, winner, fs);

  // delete message
  await reactionMessage.delete();

  // remove loser from voting playlist
  await setSpotifyToken(sp);
  await sp.removeTracksFromPlaylist(playlists.voting, [
    { uri: `spotify:track:${loser.id}` },
  ]);

  // send notification message
  await channels.notify.send(
    `${winner.name} by ${winner.artists} beat out ${loser.name} by ${
      loser.artists
    } in the ${roundFromLetter(match.round)} round`
  );
  // check if final round of day
  if (match.round === 0) {
    await channels.notify.send(
      `<@&${mentionRole}> Day ${match.day} is over! ${winner.name} by ${winner.artists} was the Song of the Day!`
    );

    //remove winner from voting
    await sp.removeTracksFromPlaylist(playlists.voting, [
      { uri: `spotify:track:${winner.id}` },
    ]);

    // add winner to playlist
    await sp.addTracksToPlaylist(playlists.winners, [
      `spotify:track:${winner.id}`,
    ]);

    return;
  }
  // check if next round start ready
  const numCompletedMatches = await queries.GET_NUM_COMPLETED_MATCHES(
    match.day,
    match.round,
    fs
  );

  if (Math.pow(2, match.round) === numCompletedMatches) {
    // ready to start next round
    // notify next round has begun
    await channels.notify.send(`<@&${mentionRole}> A new round is upon us!`);
    // grab songs
    const previousRoundWinners = await queries.GET_PREVIOUS_ROUND_WINNERS(
      match.day,
      match.round,
      fs
    );
    // start new round
    round(previousRoundWinners, channels.vote, match.day, fs);
  }
};
