import { CustomizableNodeJSScovilleClient } from "../customizable/node-client";
import { SocketIOClientMessageTransporter } from "@universal/client/module/socketio-message-transporter-module";
new CustomizableNodeJSScovilleClient(new SocketIOClientMessageTransporter());