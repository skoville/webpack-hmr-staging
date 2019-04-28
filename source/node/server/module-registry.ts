import * as webpack from 'webpack';
import { IClientConfiguration } from '@universal/shared/client-configuration';
import { v4 as generateUUID } from 'uuid';
import { AbstractServerModuleRegistry } from '@universal/server/module/abstract/module-registry';
import { AbstractServerBoundaryModule } from '@universal/server/module/abstract/server-boundary-module';
import { NodeCompilerManagerRegistryModule } from './compiler-manager-module';
import { NodeServerLoggerModule } from './logger-module';
import { CLIENT_CONFIGURATION_OPTIONS, COMPILER_ID } from '@universal/shared/webpack-bundle-injection-globals';

export interface PluginOptions {
    client: IClientConfiguration;
    server: NodeServerModuleRegistry;
}

export class NodeServerModuleRegistry extends AbstractServerModuleRegistry {
    private static readonly PluginOptionsMap: Map<webpack.Plugin, PluginOptions> = new Map();
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
        public constructor(options: PluginOptions) {
            // Need to use this map instead of making options a private instance variable because of this:
            // https://github.com/Microsoft/TypeScript/issues/30355
            NodeServerModuleRegistry.PluginOptionsMap.set(this, options);
        }

        public apply(compiler: webpack.Compiler) {
            const options = NodeServerModuleRegistry.PluginOptionsMap.get(this);
            if (options === undefined) {
                throw new Error("Impossible state: options undefined");
            }

            const {client} = options;
            const compilerId = generateUUID();
            
            if(client.enableHotModuleReloading) {
                // If there is no HotModuleReplacement plugin, throw error.
                if (compiler.options.plugins === undefined || !compiler.options.plugins.some(plugin => plugin instanceof webpack.HotModuleReplacementPlugin)) {
                    throw new Error(`The ${nameof.full(client.enableApplicationRestarting)} option was set to true, but the webpack config does not contain an instance of ${nameof.full(webpack.HotModuleReplacementPlugin)}`);
                }
            }

            new webpack.DefinePlugin({
                [nameof(CLIENT_CONFIGURATION_OPTIONS)]: JSON.stringify(options.client),
                [nameof(COMPILER_ID)]: compilerId
            }).apply(compiler);

            options.server.compilerManager.register(compiler, compilerId);
        }
    }
}