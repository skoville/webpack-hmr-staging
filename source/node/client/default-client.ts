import { SocketIOClientMessageTransporter } from "@universal/client/module/socketio-message-transporter-module";
import { NodeClientApplicationRestarter } from "./application-restarter";
import { AbstractClientModuleRegistry } from '@universal/client/module/abstract/module-registry';
import { NodeClientLoggerModule } from "./logger-module";

class DefaultNodeClient extends AbstractClientModuleRegistry {
    public constructor() {
        super(
            new SocketIOClientMessageTransporter(),
            new NodeClientApplicationRestarter(),
            new NodeClientLoggerModule()
        );
    }
}

new DefaultNodeClient();