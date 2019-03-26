import { AbstractClientModule } from "./module";
import { ClientEventRegistry, EventName } from "../event-registry";
import { Message } from "@universal/shared/api-model";

export abstract class AbstractClientMessageTransporter extends AbstractClientModule {
    protected constructor() {
        super();
        ClientEventRegistry
            .getInstance()
            .resolvePostMiddlewareEventHandler(EventName.SendMessage, this.sendMessage.bind(this));
    }
    protected async fireHandleMessageEvent(messageString: string) {
        const message: Message = JSON.parse(messageString);
        const publishers = await ClientEventRegistry.getInstance().eventPublishers;
        await publishers[EventName.HandleMessage].publish(message);
    }
    protected abstract async sendMessage(messageString: string): Promise<void>;
}