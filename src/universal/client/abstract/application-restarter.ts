import { AbstractClientModule } from "./module";
export abstract class AbstractClientApplicationRestarter extends AbstractClientModule {
    public abstract async restartApplication(): Promise<void>;
}