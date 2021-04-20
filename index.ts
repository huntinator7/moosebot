import * as admin from "firebase-admin";
import configs from "./config";

const config =
  process.env.NODE_ENV === "development" ? configs.dev : configs.prod;

admin.initializeApp({
  credential: admin.credential.cert(
    config.setup.firebase as admin.ServiceAccount
  ),
});

import Discord from "discord.js";
import SpotifyWebApi from "spotify-web-api-node";

import modules from "./modules";

const dc = new Discord.Client();
const sp = new SpotifyWebApi(config.setup.spotifyCreds);

sp.setRefreshToken(config.setup.spotifyRefreshToken);

dc.on("ready", () => {
  console.log(`Logged in as ${dc.user?.tag}!`);
  modules.forEach((m) => m(dc, sp, config));
});

dc.login(config.setup.discordToken);
