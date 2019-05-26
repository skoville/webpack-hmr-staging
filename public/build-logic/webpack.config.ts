import * as webpack from 'webpack';
import * as path from 'path';
import { deletePathAsync } from '../../source/node/shared/delete-path-async';
import { Log } from '../../source/universal/shared/log';
import * as packagejson from '../../package.json';
import { generateDeclarationModuleText, usedDeclarationFilesTracker } from './create-declaration-bundle';
import { PUBLIC_API_DIRECTORY, SOURCE_DIRECTORY, DISTRIBUTION_DIRECTORY, UNIVERSAL_SOURCE_DIRECTORY } from './paths';
import { fsAsync, prettyPrintJSON } from './util';

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
class Externalize {
    public static readonly Nothing: ExternalsHandler = (_context, request, callback) => {
        if (["bufferutil", "utf-8-validate"].includes(request)) { // This is needed to solve a bug in the 'ws' library. https://github.com/websockets/ws/issues/1220
            callback(null, request, "commonjs"); // This externalizes the module
            return;
        }
        callback(); // This includes the module in the bundle.
    }
    public static readonly Dependencies: ExternalsHandler = (context, request, callback) => {
        if (directDependencies.has(request)) {
            callback(null, request, 'commonjs'); // This externalizes the module
        } else {
            if ((request.includes("node_modules") || context.includes("node_modules"))) {
                log.trace("bundling node_modules file due to explicit reference from source.");
                log.warn("request = " + request);
                log.warn("context = " + context);
                console.log();
            }
            callback(); // This includes the module in the bundle.
        }
    }
}

function generateWebpackConfiguration(target: Target, entry: string, externals: ExternalsHandler, side?: Side): webpack.Configuration {
    const {name: outFile, dir: outDistSubDirectory} = path.parse(entry.substring(PUBLIC_API_DIRECTORY.length));
    const tsconfigPath = path.resolve(SOURCE_DIRECTORY, target, "tsconfig.json");
    const plugins = side === Side.client ?
        [
            new webpack.DefinePlugin({
                // Passthrough of constants, they will be transformed during the child bundle
                CLIENT_CONFIGURATION_OPTIONS: "CLIENT_CONFIGURATION_OPTIONS",
                COMPILER_ID: "COMPILER_ID",
                // Passthrough of module apis. These should refer to the module and hash of the child bundle, not the library bundle.
                // In the future, it would be great for a more clear API to allow hot module reloading of libraries into dependant code,
                // imagine your code updating live when the mods push to github.
                WEBPACK_HASH: "WEBPACK_HASH",
                WEBPACK_HOT_MODULE: "WEBPACK_HOT_MODULE"
            })
        ] : [];
    return {
        devtool: "source-map",
        entry,
        externals,
        mode: 'production',
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: [
                        {
                            loader: 'ts-nameof-loader'
                        },
                        {
                            loader: 'ts-loader',
                            options: {
                                configFile: tsconfigPath,
                                // getCustomTransformers: () => ({ before: [tsnameof] })
                            }
                        }
                    ]
                }
            ]
        },
        output: {
            filename: outFile + '.js',
            path: path.resolve(DISTRIBUTION_DIRECTORY, "." + outDistSubDirectory),
            libraryTarget: "commonjs"
        },
        plugins,
        resolve: {
            extensions: side === Side.client ? ['.ts', '.js'] : ['.ts'],
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
    const orders: ConfigOrder[] = [
        [Configuration.customizable, Target.node, Side.client, Externalize.Dependencies],
        [Configuration.customizable, Target.node, Side.server, Externalize.Dependencies],
        [Configuration.customizable, Target.web,  Side.client, Externalize.Dependencies],
        [Configuration.default,      Target.node, Side.client, Externalize.Nothing],
        [Configuration.default,      Target.node, Side.server, Externalize.Dependencies],
        [Configuration.default,      Target.web,  Side.client, Externalize.Nothing]
    ];
    const configs: webpack.Configuration[] = orders.map(([configuration, target, side, externals]) => generateWebpackConfiguration(
        target,
        path.resolve(PUBLIC_API_DIRECTORY, configuration, target + "-" + side + ".ts"),
        externals,
        side
    ));
    configs.push(generateWebpackConfiguration(
        Target.node,
        path.resolve(PUBLIC_API_DIRECTORY, "plugin.ts"),
        Externalize.Dependencies
    ));
    return configs;
}

async function start() {
    const configs = await createWebpackConfigs();
    await deletePathAsync(DISTRIBUTION_DIRECTORY);
    webpack(configs).run(async (err?: Error, stats?: webpack.Stats) => {
        if (err) {
            console.log("ERROR");
            console.log(err);
        }
        if (stats) {
            const statsJSON = stats.toJson();
            console.log("hash =", statsJSON.hash);
            const errorsPresent = stats.hasErrors();
            const warningsPresent = stats.hasWarnings();
            if (errorsPresent) {
                console.log();
                console.log("STATS HAS ERRORS");
                console.log();
                statsJSON.errors.forEach((error: string) => {
                    log.error(error);
                    console.log();
                });
            }
            if (warningsPresent) {
                console.log("STATS HAS WARNINGS");
                console.log();
                statsJSON.warnings.forEach((warning: string) => {
                    log.warn(warning);
                    console.log();
                })
            }
            console.log();
        }
        await Promise.all(configs.map(config => generateDeclarationModuleText(config)));
        await usedDeclarationFilesTracker.removedAllUnused(DISTRIBUTION_DIRECTORY);
        // Copy package.json
        await fsAsync.writeFile(path.resolve(DISTRIBUTION_DIRECTORY, "package.json"), prettyPrintJSON(packagejson));
    });
}

start();