import { AbstractModuleRegistry } from "@universal/shared/abstract/module-registry";
import { AbstractClientMessageTransporterModule } from "./message-transporter-module";
import { AbstractClientApplicationRestarterModule } from "./application-restarter-module";
import { ClientRuntime } from "../runtime-module";
import { ClientEvent } from "../../event";
import { AbstractClientLoggerModule } from "./logger-module";

export abstract class AbstractClientModuleRegistry extends AbstractModuleRegistry<ClientEvent.Payload> {
    protected constructor(
        messageTransporter: AbstractClientMessageTransporterModule,
        applicationRestarter: AbstractClientApplicationRestarterModule,
        logger: AbstractClientLoggerModule,
    ) {
        const clientRuntime = new ClientRuntime();
        super({
            [ClientEvent.RestartApplication]: applicationRestarter.restartApplication.bind(applicationRestarter),
            [ClientEvent.HandleMessage]: clientRuntime.handleMessage.bind(clientRuntime),
            [ClientEvent.SendMessage]: messageTransporter.sendMessage.bind(messageTransporter),
            [ClientEvent.Log]: logger.handleLogEvent.bind(logger)
        });
    }
}