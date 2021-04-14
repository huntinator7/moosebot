// @ts-ignore
import asyncqlite3 from "sqlite-async";
import SpotifyWebApi from "spotify-web-api-node";
import Discord from "discord.js";
import cron from "cron";
import { MooseConfig } from "../../config";
import { daily } from "./daily";
import { reaction } from "./reaction";

export type Channels = {
  vote: Discord.TextChannel;
  notify: Discord.TextChannel;
};

async function BarchBadness(
  dc: Discord.Client,
  sp: SpotifyWebApi,
  config: MooseConfig
) {
  const db = await asyncqlite3.open("./db/barch_badness.db");
  console.log("Connected to the barch_badness database.");

  const voteChannel = (await dc.channels.fetch(
    config.BarchBadness.discordVoteChannelId
  )) as Discord.TextChannel;

  const notifyChannel = (await dc.channels.fetch(
    config.BarchBadness.discordNotifyChannelId
  )) as Discord.TextChannel;

  const channels = { vote: voteChannel, notify: notifyChannel };

  const job = new cron.CronJob(
    "40 48 20 * * *",
    () =>
      daily(
        sp,
        db,
        channels,
        config.BarchBadness.spotifyPlaylistId,
        config.BarchBadness.mentionRole
      ),
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
      db,
      sp,
      config.BarchBadness.mentionRole,
      config.BarchBadness.votesToWin
    )
  );
}

export default BarchBadness;
