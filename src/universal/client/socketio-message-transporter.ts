import { AbstractClientMessageTransporter } from "./abstract/message-transporter";
import socketio, {Socket} from 'socket.io-client';
import { SOCKET_MESSAGE_EVENT_NAME } from "@universal/shared/api-model";

// TODO: replace console.log statements with logger calls
export class SocketIOClientMessageTransporter extends AbstractClientMessageTransporter {
    private socket: typeof Socket;
    
    public constructor(url: string) {
        super();
        this.socket = socketio(url);
        this.socket.on(SOCKET_MESSAGE_EVENT_NAME, (message: string) => {
            console.log("received message");
            console.log(message);
            this.fireHandleMessageEvent(message);
        });
        // TODO: refactor.
        const socketioErrors = ['connect_error', 'connect_timeout', 'error', 'disconnect', 'reconnect_error', 'reconnect_failed'];
        socketioErrors.forEach(error => {
            this.socket.on(error, (...args: any[]) => {
                console.log("connection error: " + error + ", arguments: " + args);
            })
        });
    }

    protected async sendMessage(messageString: string) {
        this.socket.emit(SOCKET_MESSAGE_EVENT_NAME, messageString);
    }
}