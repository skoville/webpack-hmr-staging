import { AbstractClientModule } from "./module";
import { ClientEvent } from "../event";
import { Message } from "@universal/shared/api-model";
import { AbstractModuleRegistry } from "@universal/shared/abstract/module-registry";

export abstract class AbstractClientMessageTransporter extends AbstractClientModule {
    @AbstractModuleRegistry.EventTrigger
    protected async [ClientEvent.HandleMessage](messageString: string) {
        const message: Message = JSON.parse(messageString);
        return message;
    }
    public abstract async sendMessage(messageString: string): Promise<void>;
}