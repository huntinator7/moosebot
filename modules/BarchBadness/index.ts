import * as admin from "firebase-admin";
import SpotifyWebApi from "spotify-web-api-node";
import Discord from "discord.js";
import cron from "cron";
import { MooseConfig } from "../../config";
import { daily } from "./daily";
import { reaction } from "./reaction";

async function BarchBadness(
  dc: Discord.Client,
  sp: SpotifyWebApi,
  config: MooseConfig
) {
  const voteChannel = (await dc.channels.fetch(
    config.BarchBadness.discordVoteChannelId
  )) as Discord.TextChannel;

  const notifyChannel = (await dc.channels.fetch(
    config.BarchBadness.discordNotifyChannelId
  )) as Discord.TextChannel;

  const channels = { vote: voteChannel, notify: notifyChannel };

  const playlists = {
    main: config.BarchBadness.spotifyMainId,
    voting: config.BarchBadness.spotifyVotingId,
    winners: config.BarchBadness.spotifyWinnersId,
  };

  const fs = admin.firestore().doc(config.BarchBadness.firebaseDocument);

  const job = new cron.CronJob(
    "10 54 0 * * *",
    () => daily(sp, channels, playlists, config.BarchBadness.mentionRole, fs),
    null,
    true,
    "America/Denver"
  );

  job.start();

  // add channel messages to cache
  channels.vote.messages.fetch({ limit: 100 });

  dc.on("messageReactionAdd", (r, u) =>
    reaction(
      r,
      u,
      channels,
      fs,
      config.BarchBadness.mentionRole,
      config.BarchBadness.votesToWin,
      playlists,
      sp
    )
  );
}

export default BarchBadness;
