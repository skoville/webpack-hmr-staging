import { AbstractClientModule } from "./module";
import { ClientEvent } from "../../event";
import { Message } from "@universal/shared/api-model";
import { AbstractModuleRegistry } from "@universal/shared/abstract/module-registry";
import { injectedClientConfiguration } from "../../injected-client-configuration";

export abstract class AbstractClientMessageTransporterModule extends AbstractClientModule {
    protected readonly url = injectedClientConfiguration.url;
    @AbstractModuleRegistry.EventTrigger
    protected async [ClientEvent.HandleMessage](messageString: string) {
        const message: Message = JSON.parse(messageString);
        return message;
    }
    public abstract async sendMessage(messageString: string): Promise<void>;
}