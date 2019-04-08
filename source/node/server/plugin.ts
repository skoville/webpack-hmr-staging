import * as webpack from 'webpack';
import { IClientConfiguration } from '@universal/shared/client-configuration';
import { CompilerManager } from './compiler-manager';
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
        const {options} = this;
        const {client} = options;
        
        // Inject client configuration into bundle.
        new webpack.DefinePlugin({[nameof(SCOVILLE_OPTIONS)]: JSON.stringify(client)}).apply(compiler);

        if(client.enableHotModuleReloading) {
            // If there is no HotModuleReplacement plugin, throw error.
            if (compiler.options.plugins === undefined || !compiler.options.plugins.some(plugin => plugin instanceof webpack.HotModuleReplacementPlugin)) {
                throw new Error(`The ${nameof.full(client.enableApplicationRestarting)} option was set to true, but the webpack config does not contain an instance of ${nameof.full(webpack.HotModuleReplacementPlugin)}`);
            }
        }

        CompilerManagerRegistry.registerCompiler
        new CompilerManager(compiler, message => {
            messageSubscribers.forEach(async subscriber => {subscriber(id, message);});
        }, options);
    }

}