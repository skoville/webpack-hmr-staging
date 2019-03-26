import { SocketIOClientMessageTransporter } from "@universal/client/socketio-message-transporter";
import { NodeClientApplicationRestarter } from "./application-restarter";
import { InitializeClient } from '@universal/client/initializer';

/*globals __resourceQuery*/

if(!__resourceQuery) {
    throw new Error("You must add in a resource query with the port in the webpack config.");
}
const url = __resourceQuery
    .substring(1); // Get rid of the '?' character at the front of the query.

InitializeClient(
    new NodeClientApplicationRestarter(),
    new SocketIOClientMessageTransporter(url)
);