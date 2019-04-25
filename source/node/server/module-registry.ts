import * as webpack from 'webpack';
import { IClientConfiguration } from '@universal/shared/client-configuration';
import { v4 as generateUUID } from 'uuid';
import { AbstractServerModuleRegistry } from '@universal/server/module/abstract/module-registry';
import { AbstractServerBoundaryModule } from '@universal/server/module/abstract/server-boundary-module';
import { NodeCompilerManagerRegistryModule } from './compiler-manager-module';
import { NodeServerLoggerModule } from './logger-module';

export interface PluginOptions {
    client: IClientConfiguration;
    server: NodeServerModuleRegistry;
}

export class NodeServerModuleRegistry extends AbstractServerModuleRegistry {
    private readonly compilerManager: NodeCompilerManagerRegistryModule;

    public constructor(serverBoundary: AbstractServerBoundaryModule, memoryFS: boolean) {
        const compilerManager = new NodeCompilerManagerRegistryModule(memoryFS);
        super(
            compilerManager,
            new NodeServerLoggerModule(),
            serverBoundary
        );
        this.compilerManager = compilerManager;
    }

    public static readonly Plugin = class Plugin implements webpack.Plugin {
        public constructor(private readonly options: PluginOptions) {}

        public apply(compiler: webpack.Compiler) {
            const {client} = this.options;
            const compilerId = generateUUID();
            
            if(client.enableHotModuleReloading) {
                // If there is no HotModuleReplacement plugin, throw error.
                if (compiler.options.plugins === undefined || !compiler.options.plugins.some(plugin => plugin instanceof webpack.HotModuleReplacementPlugin)) {
                    throw new Error(`The ${nameof.full(client.enableApplicationRestarting)} option was set to true, but the webpack config does not contain an instance of ${nameof.full(webpack.HotModuleReplacementPlugin)}`);
                }
            }

            new webpack.DefinePlugin({
                [nameof(CLIENT_CONFIGURATION_OPTIONS)]: JSON.stringify(this.options.client),
                [nameof(BUNDLE_ID)]: compilerId
            }).apply(compiler);

            this.options.server.compilerManager.register(compiler, compilerId);
        }
    }
}