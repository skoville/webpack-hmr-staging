import { AbstractClientModule } from "./module";
import { ClientCommand } from "../../command-types";
import "@universal/shared/injected-client-configuration";

export abstract class AbstractClientMessageTransporterModule extends AbstractClientModule<[typeof ClientCommand.SendMessage], [typeof ClientCommand.HandleMessage]> {
    protected readonly url = CLIENT_CONFIGURATION_OPTIONS.url;
    protected readonly compilerId = COMPILER_ID;
    protected constructor() {
        super({
            [ClientCommand.SendMessage]: message => this.sendMessage(message)
        });
        this.log.info(`this is the ${nameof(AbstractClientMessageTransporterModule)} here. Follow your dreams.`);
    }
    protected abstract async sendMessage(messageString: string): Promise<void>;
}