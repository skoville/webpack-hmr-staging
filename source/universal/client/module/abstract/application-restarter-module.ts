import { AbstractClientModule } from "./module";
import { ClientEvent } from "@universal/client/event";
export abstract class AbstractClientApplicationRestarterModule extends AbstractClientModule<[typeof ClientEvent.RestartApplication], []> {
    protected constructor() {
        super({
            [ClientEvent.RestartApplication]: async () => {
                await this.restartApplication();
            }
        })
    }
    public abstract async restartApplication(): Promise<void>;
}