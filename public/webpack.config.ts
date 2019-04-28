import * as webpack from 'webpack';
import * as path from 'path';
import { deletePathAsync } from '../source/node/shared/delete-path-async';
import { Log } from '../source/universal/shared/log';
import * as packagejson from '../package.json';

const PUBLIC_API_DIRECTORY = path.resolve(__dirname, "api");
const PROJECT_DIRECTORY = path.resolve(__dirname, "..");
const DISTRIBUTION_DIRECTORY = path.resolve(PROJECT_DIRECTORY, "distribution");
// const NODE_MODULES_DIRECTORY = path.resolve(PROJECT_DIRECTORY, "node_modules");
const SOURCE_DIRECTORY = path.resolve(PROJECT_DIRECTORY, "source");
const UNIVERSAL_SOURCE_DIRECTORY = path.resolve(SOURCE_DIRECTORY, "universal");

enum Target {
    node = 'node',
    web = 'web'
}

enum Configuration {
    customizable = 'customizable',
    default = 'default'
}

enum Side {
    client = 'client',
    server = 'server'
}

const log = new Log.Logger(async req => {
    console.log(req.contents);
});

const directDependencies = new Set<string>(Object.keys(packagejson.dependencies));

// TODO: https://github.com/TypeStrong/ts-loader/blob/master/README.md#declarations-dts

type ExternalsHandler = (ctx: string, req: string, callback: (err?: any, val?: string, type?: 'commonjs') => void) => void;
// To externalize means to exclude from the final bundle, preserving the require/import statement in the output.
class Externals {
    public static readonly ExternalizeNothing: ExternalsHandler = (_context, request, callback) => {
        if (["bufferutil", "utf-8-validate"].includes(request)) { // This is needed to solve a bug in the 'ws' library. https://github.com/websockets/ws/issues/1220
            callback(null, request, "commonjs");
            return;
        }
        callback(); // This includes the module in the bundle.
    }
    public static readonly ExternalizeDependencies: ExternalsHandler = (context, request, callback) => {
        if (directDependencies.has(request)) {
            callback(null, request, 'commonjs'); // This externalizes the module
        } else {
            if (!request.startsWith("@") && (request.includes("node_modules") || context.includes("node_modules"))) {
                console.log("request =", request);
                console.log("context =", context);
                console.log();
            }
            callback(); // This includes the module in the bundle.
        }
    }
}

function generateWebpackConfiguration(target: Target, entry: string, externals: ExternalsHandler, extensions: string[] = ['.ts']): webpack.Configuration {
    const {name: outFile, dir: outPath} = path.parse(entry.substring(PUBLIC_API_DIRECTORY.length));
    const tsconfigPath = path.resolve(SOURCE_DIRECTORY, target, "tsconfig.json");
    return {
        entry,
        externals, // https://github.com/webpack/webpack/blob/master/lib/ExternalModuleFactoryPlugin.js#L77
        mode: 'production',
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            configFile: tsconfigPath,
                            compilerOptions: {
                                outFile
                            }
                        }
                    }
                }
            ]
        },
        output: {
            filename: outFile + '.js',
            path: path.resolve(DISTRIBUTION_DIRECTORY, "." + outPath)
        },
        resolve: {
            extensions,
            alias: {
                "@universal": UNIVERSAL_SOURCE_DIRECTORY,
                ["@" + target]: path.resolve(SOURCE_DIRECTORY, target)
            }
        },
        target
    };
}

type ConfigOrder = [Configuration, Target, Side, ExternalsHandler];

async function createWebpackConfigs() {
    await deletePathAsync(DISTRIBUTION_DIRECTORY);
    const orders: ConfigOrder[] = [
        [Configuration.customizable, Target.node, Side.client, Externals.ExternalizeDependencies],
        [Configuration.customizable, Target.node, Side.server, Externals.ExternalizeDependencies],
        [Configuration.customizable, Target.web,  Side.client, Externals.ExternalizeDependencies],
        [Configuration.default,      Target.node, Side.client, Externals.ExternalizeNothing],
        [Configuration.default,      Target.node, Side.server, Externals.ExternalizeDependencies],
        [Configuration.default,      Target.web,  Side.client, Externals.ExternalizeNothing]
    ];
    const configs: webpack.Configuration[] = orders.map(([configuration, target, side, externals]) => generateWebpackConfiguration(
        target,
        path.resolve(PUBLIC_API_DIRECTORY, configuration, target + "-" + side + ".ts"),
        externals,
        side === Side.client ? ['.ts', '.js'] : ['.ts']
    ));
    configs.push(generateWebpackConfiguration(
        Target.node,
        path.resolve(PUBLIC_API_DIRECTORY, "plugin.ts"),
        Externals.ExternalizeDependencies
    ));
    // console.log(JSON.stringify(configs[0], null, 2));
    webpack(configs).run((err?: Error, stats?: webpack.Stats) => {
        if (err) {
            console.log("ERROR");
            console.log(err);
        }
        if (stats) {
            const statsJSON = stats.toJson();
            console.log("hash =", statsJSON.hash);
            if (stats.hasErrors()) {
                console.log();
                console.log("STATS HAS ERRORS");
                console.log();
                statsJSON.errors.forEach((error: string) => {
                    log.error(error);
                    console.log();
                });
            }
            if (stats.hasWarnings()) {
                console.log("STATS HAS WARNINGS");
                console.log();
                statsJSON.warnings.forEach((warning: string) => {
                    log.warn(warning);
                    console.log();
                })
            }
            console.log();
        }
    });
}

createWebpackConfigs();