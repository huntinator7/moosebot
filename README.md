# How to add onto this bot

## Add Module

1. Add a folder in the `src/modules` folder with the name of your module, PascalCase

2. Within that folder, create an `index.ts` file

3. Inside that file, copy and paste the following template

```ts
import SpotifyWebApi from "spotify-web-api-node";
import Discord from "discord.js";
import { MooseConfig } from "../../../config";

async function ModuleName(
  dc: Discord.Client,
  sp: SpotifyWebApi,
  config: MooseConfig
) {}

export default ModuleName;
```

changing ModuleName to whatever your module name is. This function will contain any discord `.on` events, database initialization, cron jobs, etc., and can call any additional functions in the file or other files in the folder.

4. Import your module in `src/modules/index.ts` and export it in the array

5. (Optional) If you have a database you want to use, copy and paste the following code into the end of `init.js`

```js
const ModuleNameDB = new sqlite3.Database("./db/module_name.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Created module_name");
});

// CREATE TABLE commands go here

ModuleNameDB.close();
```

and create a `queries.ts` file inside your module folder. This will help you organize your queries and keep your module as clean as possible.

6. Add your config types and values to `config.ts`. Create an interface under the MooseConfig interface with your config values, and add it to MooseConfig as `ModuleName: ModuleName`. Then in `defaultConfig`, provide any values that won't change depending on environment, and in `config`, provide any values that will (please utilize the console-log discord channel for testing, if you don't I will fucking murder you kthxbai)
