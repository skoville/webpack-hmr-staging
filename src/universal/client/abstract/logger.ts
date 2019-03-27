import { ClientEventRegistry, ClientEventName } from "../event-registry";
import { AbstractClientModule } from "./module";

export abstract class AbstractClientLogger extends AbstractClientModule {
    protected constructor() {
        super();
        ClientEventRegistry
            .getInstance()
            //.resolvePostMiddlewareEventHandler(EventName.RestartApplication, this.restartApplication.bind(this));
    }
    protected abstract async log(): Promise<void>;
}