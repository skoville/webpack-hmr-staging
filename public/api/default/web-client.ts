import { CustomizableWebScovilleClient } from "../customizable/web-client";
import { SocketIOClientMessageTransporter } from "@universal/client/module/socketio-message-transporter-module";
new CustomizableWebScovilleClient(new SocketIOClientMessageTransporter());