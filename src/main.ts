import { App, staticFiles, trailingSlashes } from "fresh";
import { type State } from "./utils.ts";
import { passkeyAuth } from "./vendor/fresh-passkeys/mod.ts";
import { buildPasskeyConfig } from "./lib/passkeyConfig.ts";

export const app = new App<State>();

app.use(staticFiles());
app.use(trailingSlashes("never"));

// Passkey auth endpoints, registered by the vendored plugin before fs routes.
passkeyAuth(app, buildPasskeyConfig());

// Include file-system based routes here
app.fsRoutes();
</content>
