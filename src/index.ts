import Discord from "discord.js";
import SpotifyWebApi from "spotify-web-api-node";

import configs from "../config";
import modules from "./modules";

console.log(process.env.NODE_ENV);

const config = configs.dev;

const dc = new Discord.Client();
const sp = new SpotifyWebApi(config.setup.spotifyCreds);

dc.on("ready", () => {
  console.log(`Logged in as ${dc.user?.tag}!`);
  modules.forEach((m) => m(dc, sp, config));
});

dc.login(config.setup.discordToken);
