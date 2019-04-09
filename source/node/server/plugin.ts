import * as webpack from 'webpack';
import { IClientConfiguration } from '@universal/shared/client-configuration';
import { CompilerManagerRegistry } from './compiler-manager-registry';

export interface PluginOptions {
    client: IClientConfiguration;
    memoryFS: boolean;
}

export class Plugin implements webpack.Plugin {
    private readonly options: PluginOptions;
    
    public constructor(options: PluginOptions) {
        this.options = options;
    }

    public apply(compiler: webpack.Compiler) {
        const {client} = this.options;
        if(client.enableHotModuleReloading) {
            // If there is no HotModuleReplacement plugin, throw error.
            if (compiler.options.plugins === undefined || !compiler.options.plugins.some(plugin => plugin instanceof webpack.HotModuleReplacementPlugin)) {
                throw new Error(`The ${nameof.full(client.enableApplicationRestarting)} option was set to true, but the webpack config does not contain an instance of ${nameof.full(webpack.HotModuleReplacementPlugin)}`);
            }
        }
        CompilerManagerRegistry.registerCompiler(compiler, this.options);
    }
}