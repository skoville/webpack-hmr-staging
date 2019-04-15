import { WebClient } from "../../abstract/web-client";
import { SocketIOClientMessageTransporter } from "@universal/client/module/socketio-message-transporter-module";

class DefaultWebClient extends WebClient {
    public constructor() {
        super(new SocketIOClientMessageTransporter());
    }
}

new DefaultWebClient();