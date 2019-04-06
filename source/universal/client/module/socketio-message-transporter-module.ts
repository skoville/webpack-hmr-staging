import { AbstractClientMessageTransporterModule } from "./abstract/message-transporter-module";
import * as socketio from 'socket.io-client';
import { SOCKET_MESSAGE_EVENT_NAME } from "@universal/shared/api-model";
import { ClientEvent } from "../event";

export class SocketIOClientMessageTransporter extends AbstractClientMessageTransporterModule {
    private socket: typeof socketio.Socket;
    
    public constructor() {
        super();
        this.socket = socketio(this.url);
        this.socket.on(SOCKET_MESSAGE_EVENT_NAME, (message: string) => {
            this.log.info("received message");
            this.log.info(message);
            this[ClientEvent.HandleMessage](message);
        });
        // TODO: refactor.
        const socketioErrors = ['connect_error', 'connect_timeout', 'error', 'disconnect', 'reconnect_error', 'reconnect_failed'];
        socketioErrors.forEach(error => {
            this.socket.on(error, (...args: any[]) => {
                this.log.info("connection error: " + error + ", arguments: " + args);
            })
        });
    }

    public async sendMessage(messageString: string) {
        this.socket.emit(SOCKET_MESSAGE_EVENT_NAME, messageString);
    }
}