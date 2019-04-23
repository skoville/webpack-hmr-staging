import { AbstractClientMessageTransporterModule } from "./message-transporter-module";
import { AbstractClientApplicationRestarterModule } from "./application-restarter-module";
import { ClientRuntime } from "../runtime-module";
import { ClientCommand } from "../../command-types";
import { AbstractClientLoggerModule } from "./logger-module";
import { AbstractModule } from "@universal/shared/abstract/module";

export abstract class AbstractClientModuleRegistry extends AbstractModule.Registry<ClientCommand.Types> {
    protected constructor(
        messageTransporter: AbstractClientMessageTransporterModule,
        applicationRestarter: AbstractClientApplicationRestarterModule,
        logger: AbstractClientLoggerModule,
    ) {
        super({
            [ClientCommand.RestartApplication]: applicationRestarter,
            [ClientCommand.HandleMessage]: new ClientRuntime(),
            [ClientCommand.SendMessage]: messageTransporter,
            [ClientCommand.Log]: logger
        });
    }
}