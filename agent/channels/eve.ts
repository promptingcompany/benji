import { vercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { localOperatorAuth, operatorAuth } from "../../server/operator-auth";
import { browserChannelEvents } from "../lib/browser-runtime";

export default eveChannel({
	auth: [operatorAuth, vercelOidc(), localOperatorAuth],
	events: browserChannelEvents,
});
