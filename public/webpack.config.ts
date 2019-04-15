import * as webpack from 'webpack';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const statAsync = promisify(fs.stat);
const readDirAsync = promisify(fs.readdir);

const PUBLIC_SOURCE_DIRECTORY = path.resolve(__dirname, "api");

// Recursive read of the './api' directory.
// Each file is its own webpack bundle, which will be output to the dist folder.
async function recursiveAddEntries(curPath: string, entryPathsCollector: string[]) {
    const stats = await statAsync(curPath);
    if(stats.isDirectory()) {
        (await readDirAsync(curPath))
            .map(child => path.join(curPath, child))
            .forEach(absoluteChild => recursiveAddEntries(absoluteChild, entryPathsCollector));
    } else { // is a file.
        entryPathsCollector.push(curPath);
    }
    return entryPathsCollector;
}

function generateWebpackConfiguration(entryPath: string): webpack.Configuration {
    const filename = path.basename(entryPath);
    const directoryWithinPublicSource = (() => {
        const pathWithinPublicSource = entryPath.substring(entryPath.indexOf(PUBLIC_SOURCE_DIRECTORY));
        return pathWithinPublicSource.substring(0, pathWithinPublicSource.indexOf(filename));
    })();
    return {
        entry: entryPath,
        output: {
            filename,
            path: path.resolve(__dirname, "../dist", directoryWithinPublicSource)
        }
    };
}

async function createWebpackConfigs(): Promise<webpack.Configuration[]> {
    return (await recursiveAddEntries(PUBLIC_SOURCE_DIRECTORY, []))
        .map(generateWebpackConfiguration);
}

export default createWebpackConfigs();