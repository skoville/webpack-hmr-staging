import { AbstractServerModule } from "./module";
import { ServerCommand } from "@universal/server/command-types";
import { CompilerNotification } from "@universal/shared/api-model";

export abstract class AbstractServerBoundaryModule extends AbstractServerModule<[typeof ServerCommand.CompilerNotification], [typeof ServerCommand.ReadFile]> {
    protected constructor() {
        super({
            [ServerCommand.CompilerNotification]: notification => this.handleCompilerNotification(notification)
        });
    }
    protected abstract async handleCompilerNotification(notification: CompilerNotification.Body): Promise<void>
}