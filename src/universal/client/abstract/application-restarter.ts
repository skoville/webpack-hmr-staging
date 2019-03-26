import { ClientEventRegistry, EventName } from "../event-registry";
import { AbstractClientModule } from "./module";

export abstract class AbstractClientApplicationRestarter extends AbstractClientModule {
    protected constructor() {
        super();
        ClientEventRegistry
            .getInstance()
            .resolvePostMiddlewareEventHandler(EventName.RestartApplication, this.restartApplication.bind(this));
    }
    protected abstract async restartApplication(): Promise<void>;
}