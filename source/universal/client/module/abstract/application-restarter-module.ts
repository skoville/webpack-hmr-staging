import { AbstractClientModule } from "./module";
export abstract class AbstractClientApplicationRestarterModule extends AbstractClientModule {
    public abstract async restartApplication(): Promise<void>;
}