import { AbstractServerModule } from "./module";
import { ServerCommand, CompilerNotificationPayload } from "@universal/server/command-types";

export abstract class AbstractServerBoundaryModule extends AbstractServerModule<[typeof ServerCommand.CompilerNotification], [typeof ServerCommand.ReadFile, typeof ServerCommand.GetLastCompilerUpdateNotification]> {
    protected constructor() {
        super({
            [ServerCommand.CompilerNotification]: notificationPayload => this.handleCompilerNotification(notificationPayload)
        });
    }
    protected abstract async handleCompilerNotification(notificationPayload: CompilerNotificationPayload): Promise<void>
}