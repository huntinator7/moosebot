import Discord from "discord.js";
import SpotifyWebApi from "spotify-web-api-node";

import configs from "./config";
import modules from "./modules";

const config =
  process.env.NODE_ENV === "development" ? configs.dev : configs.prod;

const dc = new Discord.Client();
const sp = new SpotifyWebApi(config.setup.spotifyCreds);

dc.on("ready", () => {
  console.log(`Logged in as ${dc.user?.tag}!`);
  modules.forEach((m) => m(dc, sp, config));
});

dc.login(config.setup.discordToken);
