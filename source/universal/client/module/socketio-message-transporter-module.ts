import { AbstractClientMessageTransporterModule } from "./abstract/message-transporter-module";
import * as socketio from 'socket.io-client';
import { SOCKET_MESSAGE_EVENT_NAME } from "@universal/shared/server-client-notification-model";
import { ClientCommand } from "../command-types";
import "@universal/shared/injected-client-configuration";

export class SocketIOClientMessageTransporter extends AbstractClientMessageTransporterModule {
    private socket: typeof socketio.Socket;
    
    public constructor() {
        super();
        this.socket = socketio(`${this.url}?${nameof(COMPILER_ID)}=${this.compilerId}`);
        this.socket.on(SOCKET_MESSAGE_EVENT_NAME, (messageString: string) => {
            this.log.info("received message");
            this.log.info(messageString);
            this.excuteCommand(ClientCommand.HandleMessage, JSON.parse(messageString));
        });
        // TODO: refactor.
        const socketioErrors = ['connect_error', 'connect_timeout', 'error', 'disconnect', 'reconnect_error', 'reconnect_failed'];
        socketioErrors.forEach(error => {
            this.socket.on(error, (...args: any[]) => {
                this.log.error("connection error: " + error + ", arguments: " + args);
            })
        });
    }

    public async sendMessage(messageString: string) {
        this.socket.emit(SOCKET_MESSAGE_EVENT_NAME, messageString);
    }
}