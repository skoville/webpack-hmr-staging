import { AbstractCompilerManagerModule } from './compiler-manager-module';
import { AbstractServerLoggerModule } from "./logger-module";
import { AbstractServerBoundaryModule } from './server-boundary-module';
import { ServerCommand } from "../../command-types";

import { AbstractModule } from "@universal/shared/abstract/module";

export abstract class AbstractServerModuleRegistry extends AbstractModule.Registry<ServerCommand.Types> {
    protected constructor(
        compilerManager: AbstractCompilerManagerModule,
        logger: AbstractServerLoggerModule,
        serverBoundary: AbstractServerBoundaryModule
    ) {
        super({
            [ServerCommand.CompilerNotification]: serverBoundary,
            [ServerCommand.GetLastCompilerUpdateNotification]: compilerManager,
            [ServerCommand.Log]: logger,
            [ServerCommand.ReadFile]: compilerManager
        });
    }
}