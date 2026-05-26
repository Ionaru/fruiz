import { App, staticFiles, trailingSlashes } from "fresh";
import { type State } from "./utils.ts";
import { sessionMiddleware } from "./middlewares/session.ts";
import { passkeyAuth } from "@ionaru/fresh-passkeys/server";
import { buildPasskeyConfig } from "./lib/passkeyConfig.ts";

export const app = new App<State>();

app.use(staticFiles());
app.use(trailingSlashes("never"));

// Session must be global (not just routes/_middleware.ts) so the passkey
// plugin's middleware-registered endpoints also get ctx.state.session.
app.use(sessionMiddleware);

// Passkey auth endpoints, registered by the fresh-passkeys plugin before fs routes.
passkeyAuth(app, buildPasskeyConfig());

// Include file-system based routes here
app.fsRoutes();
