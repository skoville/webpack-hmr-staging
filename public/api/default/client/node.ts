import { NodeClient } from "../../abstract/node-client";
import { SocketIOClientMessageTransporter } from "@universal/client/module/socketio-message-transporter-module";

class DefaultNodeClient extends NodeClient {
    public constructor() {
        super(new SocketIOClientMessageTransporter());
    }
}

new DefaultNodeClient();