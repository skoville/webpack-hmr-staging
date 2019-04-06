import { AbstractClientModuleRegistry } from '@universal/client/module/abstract/module-registry';
import { SocketIOClientMessageTransporter } from "@universal/client/module/socketio-message-transporter-module";
import { WebClientApplicationRestarter } from "./application-restarter";
import { WebClientLoggerModule } from './logger-module';

export class DefaultWebClient extends AbstractClientModuleRegistry {
    public constructor() {
        super(
            new SocketIOClientMessageTransporter(),
            new WebClientApplicationRestarter(),
            new WebClientLoggerModule());
    }
}

new DefaultWebClient();