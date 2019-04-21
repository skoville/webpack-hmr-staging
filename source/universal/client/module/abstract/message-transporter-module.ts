import { AbstractClientModule } from "./module";
import { ClientEvent } from "../../event";
import { injectedClientConfiguration } from "../../injected-client-configuration";

export abstract class AbstractClientMessageTransporterModule extends AbstractClientModule<[typeof ClientEvent.SendMessage], [typeof ClientEvent.HandleMessage]> {
    protected readonly url = injectedClientConfiguration.url;
    protected constructor() {
        super({
            [ClientEvent.SendMessage]: async message => {
                await this.sendMessage(message);
            }
        });
    }
    public abstract async sendMessage(messageString: string): Promise<void>;
}