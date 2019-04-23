import { AbstractClientModule } from "./module";
import { ClientCommand } from "@universal/client/command-types";
export abstract class AbstractClientApplicationRestarterModule extends AbstractClientModule<[typeof ClientCommand.RestartApplication], []> {
    protected constructor() {
        super({
            [ClientCommand.RestartApplication]: () => this.restartApplication()
        })
    }
    protected abstract async restartApplication(): Promise<void>;
}