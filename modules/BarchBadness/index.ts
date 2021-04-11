// @ts-ignore
import asyncqlite3 from "sqlite-async";
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
  const db = await asyncqlite3.open("./db/barch_badness.db");
  console.log("Connected to the barch_badness database.");

  const channel = (await dc.channels.fetch(
    config.BarchBadness.discordChannelId
  )) as Discord.TextChannel;

  const job = new cron.CronJob(
    "0 0 9 * * *",
    () => daily(sp, db, channel, config.BarchBadness.spotifyPlaylistId),
    null,
    true,
    "America/Denver"
  );

  job.start();

  // add channel messages to cache
  channel.messages.fetch({ limit: 100 });

  dc.on("messageReactionAdd", (r, u) => reaction(r, u, channel, db, sp));
}

export default BarchBadness;
