import { AbstractModuleRegistry } from "@universal/shared/abstract/module-registry";
import { AbstractClientMessageTransporter } from "./message-transporter";
import { AbstractClientApplicationRestarter } from "./application-restarter";
import { ClientRuntime } from "../runtime";
import { ClientEvent } from "../event";
import { AbstractClientLogger } from "./logger";

export abstract class AbstractClientModuleRegistry extends AbstractModuleRegistry<ClientEvent.Payload> {
    protected constructor(
        messageTransporter: AbstractClientMessageTransporter,
        applicationRestarter: AbstractClientApplicationRestarter,
        logger: AbstractClientLogger,
        hotEnabled: boolean, restartingEnabled: boolean
    ) {
        const clientRuntime = new ClientRuntime(hotEnabled, restartingEnabled);
        super({
            [ClientEvent.RestartApplication]: applicationRestarter.restartApplication.bind(applicationRestarter),
            [ClientEvent.HandleMessage]: clientRuntime.handleMessage.bind(clientRuntime),
            [ClientEvent.SendMessage]: messageTransporter.sendMessage.bind(messageTransporter),
            [ClientEvent.Log]: logger.handleLogEvent.bind(logger)
        });
    }
}