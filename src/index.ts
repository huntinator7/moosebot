import Discord from "discord.js";
import SpotifyWebApi from "spotify-web-api-node";

import config from "../config";
import modules from "./modules";

const dc = new Discord.Client();
const sp = new SpotifyWebApi(config.spotify.creds);

dc.on("ready", () => {
  console.log(`Logged in as ${dc.user?.tag}!`);
  modules.forEach((m) => m(dc, sp));
});

dc.login(config.discord.token);
