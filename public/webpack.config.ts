import * as webpack from 'webpack';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const deleteDirAsync = promisify(fs.rmdir);
const existsAsync = promisify(fs.exists);
const readDirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

const PUBLIC_API_DIRECTORY = path.resolve(__dirname, "api");
const DIST_DIRECTORY = path.resolve(__dirname, "..", "dist");

async function generateResolutionAliasMap()  {
    const aliasMap: Record<string, string> = {};
    const sourceDirectory = path.resolve(__dirname, "..", "source");
    const possibleRuntimes = await readDirAsync(sourceDirectory);
    possibleRuntimes
        .forEach(runtime => {
            aliasMap["@" + runtime] = path.resolve(sourceDirectory, runtime);
        });
    return aliasMap;
}

// Recursive read of the './api' directory.
// Each file is its own webpack bundle, which will be output to the dist folder.
async function recursiveAddEntries(curPath: string, entryPathsCollector: string[]) {
    const stats = await statAsync(curPath);
    if(stats.isDirectory()) {
        await Promise.all((await readDirAsync(curPath))
            .map(child => path.join(curPath, child))
            .map(absoluteChild => recursiveAddEntries(absoluteChild, entryPathsCollector)));
    } else { // is a file.
        entryPathsCollector.push(curPath);
    }
    return entryPathsCollector;
}

function generateWebpackConfiguration(entryPath: string, alias: Record<string, string>): webpack.Configuration {
    const filename = path.basename(entryPath);
    const directoryWithinPublicSource = (() => {
        const filePathWithinPublicAPIDirectory = entryPath.substring(PUBLIC_API_DIRECTORY.length, entryPath.length)
        return filePathWithinPublicAPIDirectory.substring(0, filePathWithinPublicAPIDirectory.indexOf(filename));
    })();
    return {
        entry: entryPath,
        mode: 'production',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: {
                        loader: 'ts-loader'
                    }
                }
            ]
        },
        output: {
            filename: path.parse(filename).name + '.js',
            path: path.resolve(DIST_DIRECTORY, "." + directoryWithinPublicSource)
        },
        resolve: { alias }
    };
}

async function createWebpackConfigs(): Promise<webpack.Configuration[]> {
    if (await existsAsync(DIST_DIRECTORY)) {
        await deleteDirAsync(DIST_DIRECTORY);
    }
    const alias = await generateResolutionAliasMap();
    return (await recursiveAddEntries(PUBLIC_API_DIRECTORY, []))
        .map(entryPath => generateWebpackConfiguration(entryPath, alias))
        .map(config => {
            console.log(config);
            return config;
        });
}

export default createWebpackConfigs();