import * as admin from "firebase-admin";
import { deleteCollection } from "./deleteFS";
import configs from "../config";

admin.initializeApp({
  credential: admin.credential.cert(
    configs.dev.setup.firebase as admin.ServiceAccount
  ),
});

const init = async () => {
  await deleteCollection(admin.firestore(), "Dev/BarchBadness/Matches", 5);
  await deleteCollection(admin.firestore(), "Dev/BarchBadness/Songs", 5);
  await deleteCollection(admin.firestore(), "Dev", 5);
};

init();
