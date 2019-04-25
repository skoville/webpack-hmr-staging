import { AbstractClientModule } from "./module";
import { ClientCommand } from "../../command-types";
import { injectedClientConfiguration } from "../../injected-client-configuration";

export abstract class AbstractClientMessageTransporterModule extends AbstractClientModule<[typeof ClientCommand.SendMessage], [typeof ClientCommand.HandleMessage]> {
    protected readonly url = injectedClientConfiguration.url;
    protected readonly compilerId = COMPILER_ID;
    protected constructor() {
        super({
            [ClientCommand.SendMessage]: message => this.sendMessage(message)
        });
    }
    protected abstract async sendMessage(messageString: string): Promise<void>;
}