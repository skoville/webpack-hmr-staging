import { AbstractClientMessageTransporterModule } from "./message-transporter-module";
import { AbstractClientApplicationRestarterModule } from "./application-restarter-module";
import { ClientRuntime } from "../runtime-module";
import { ClientEvent } from "../../event";
import { AbstractClientLoggerModule } from "./logger-module";
import { AbstractModule } from "@universal/shared/abstract/module";

export abstract class AbstractClientModuleRegistry extends AbstractModule.Registry<ClientEvent.Payload> {
    protected constructor(
        messageTransporter: AbstractClientMessageTransporterModule,
        applicationRestarter: AbstractClientApplicationRestarterModule,
        logger: AbstractClientLoggerModule,
    ) {
        const clientRuntime = new ClientRuntime();
        super({
            [ClientEvent.RestartApplication]: applicationRestarter,
            [ClientEvent.HandleMessage]: clientRuntime,
            [ClientEvent.SendMessage]: messageTransporter,
            [ClientEvent.Log]: logger
        });
    }
}