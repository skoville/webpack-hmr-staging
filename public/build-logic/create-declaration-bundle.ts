import webpack = require("webpack");
import * as path from 'path';
import { PROJECT_DIRECTORY, DISTRIBUTION_DIRECTORY } from "./paths";
import { fsAsync, loadJSON } from "./util";
//import * as tsconfigBase from '../../tsconfig-base.json';
import * as packagejson from '../../package.json';

class UsedDeclarationFilesTracker {
    private usedDeclarationFiles = new Set<string>();
    public constructor() {}
    public markAsUsed(usedPath: string) {
        this.usedDeclarationFiles.add(path.normalize(path.resolve(usedPath)));
    }
    public async removedAllUnused(directory: string) {
        const recursiveRemovalResults = await Promise.all((await fsAsync.readDirectory(directory))
            .map(relativeChildPath => path.resolve(directory, relativeChildPath))
            .map(async absoluteChildPath => {
                const stat = await fsAsync.statistics(absoluteChildPath);
                if(stat.isFile()) {
                    if (this.usedDeclarationFiles.has(absoluteChildPath) || !absoluteChildPath.endsWith(".d.ts")) {
                        return true;
                    } else {
                        // remove the file.
                        console.log("deleting file " + absoluteChildPath);
                        await fsAsync.deleteFile(absoluteChildPath);
                        return false;
                    }
                } else if (stat.isDirectory()) {
                    return await this.removedAllUnused(absoluteChildPath);
                } else {
                    throw new Error("Neither file nor directory.");
                }
            }));
        for (const result of recursiveRemovalResults) {
            if (result === true) {
                return true;
            }
        }
        // rmdir if all children have been removed.
        console.log("deleting folder " + directory);
        await fsAsync.deleteDirectory(directory);
        return false;
    }
}
export const usedDeclarationFilesTracker = new UsedDeclarationFilesTracker();

const tsconfigBase = loadJSON(path.resolve(PROJECT_DIRECTORY, "./tsconfig-base.json")); // TODO: use import of json. Waiting on resolution of parsing jsons with comments, or removing comments.
const desclarationsDir: string = path.resolve(PROJECT_DIRECTORY, tsconfigBase.compilerOptions.outDir);
const baseDir: string = tsconfigBase.compilerOptions.baseUrl;
const aliasMap = new Map(
    Object.entries(tsconfigBase.compilerOptions.paths as Record<string, string[]>)
        .map(([key, value]) => 
            [key.split("/*")[0], value[0].split("/*")[0]]));

const moduleName: string = packagejson.name;

enum FSAction {
    Stats = "stats",
    Read  = " read",
    Write = "write"
}

const actionTracker: Record<string, Record<FSAction, boolean>> = {};

function reportFSAction(action: FSAction, p: string, start: boolean) {
    const normalized = path.normalize(p);
    if (!actionTracker[normalized]) {
        actionTracker[normalized] = {
            [FSAction.Stats]: false,
            [FSAction.Read]: false,
            [FSAction.Write]: false
        }
    }
    actionTracker[normalized][action] = start;
    // console.log(`${start ? 'start' : '  end'} ${action}: ${normalized}`);
    // If more than 1 is true, report:
    var totalActive = 0;
    for(const status of Object.values(actionTracker[normalized])) {
        if (status) totalActive++;
    }
    if (totalActive > 1) {
        console.log("");
        console.log(`alert action ${action} for path`, normalized);
        console.log(JSON.stringify(actionTracker[normalized]));
        console.log("");
    }
}

// We are going to be branching through a directory structure recursively in such a manner that the same file may have a pending read
// and write operation ocurring at the same time. If these operations are not done in series, then there could be an issue with race
// conditions. Therefore we should create a structure which maps normalized, absolute paths to a queue of functions, where the functions
// presumably have some IO operations on the file.
class IOSeriesManager {
    private readonly pathToOperationsMap: Record<string, Promise<any>> = {};
    public constructor() {}
    public enqueueOperation<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
        const normalizedAbsolutePath = path.normalize(path.resolve(filePath));
        if (!this.pathToOperationsMap[normalizedAbsolutePath]) {
            this.pathToOperationsMap[normalizedAbsolutePath] = Promise.resolve();
        }
        const result = this.pathToOperationsMap[normalizedAbsolutePath].then(operation);
        this.pathToOperationsMap[normalizedAbsolutePath] = result;
        return result;
    }
}
const ioSeriesManager = new IOSeriesManager();

async function getRelativeImportPath(absoluteFrom: string, absoluteTo: string) {
    reportFSAction(FSAction.Stats, absoluteFrom, true);
    const fromStats = await fsAsync.statistics(absoluteFrom)
    reportFSAction(FSAction.Stats, absoluteFrom, false);
    const fromFolder = fromStats.isFile() ? path.parse(absoluteFrom).dir : absoluteFrom;
    const result = path.relative(fromFolder, absoluteTo).replace(/\\/g, "/").replace(/.d.ts$/, "");
    return result;
}

/**
 * @param webpackConfig the webpack configuration for the bundle that was just generated.
 */
export async function generateDeclarationModuleText(webpackConfig: webpack.Configuration) {
    // Based on where the webpack entry file is, and by reading the outDir of the tsconfig base, we can determine the location of the entry's generated declaration file.
    const entry = webpackConfig.entry;
    if (typeof entry !== 'string') throw new Error("Currently only supports entry value as a string.");
    const webpackOutput = webpackConfig.output;
    if (webpackOutput === undefined) throw new Error("Webpack output configuration required.");
    const outputPath = webpackOutput.path;
    if (outputPath === undefined) throw new Error("Webpack output configuration path parameter required.");
    const outputFilename = webpackOutput.filename;
    if (outputFilename === undefined) throw new Error("Weback output configuration filename parameter required.");

    const entrySubpathWithinDeclarationsDirectory = entry.substring(PROJECT_DIRECTORY.length).replace(/.ts$/, ".d.ts");
    const entryDeclarationFile = path.resolve(desclarationsDir, "." + entrySubpathWithinDeclarationsDirectory);

    // Recurse starting from the entry declaration file down through dependencies. 
    // Upon reading the entry's declaration file, get all import statements. We will rewrite these import statements to transform aliased references to relative paths.

    async function rewriteImportAliases(currentDeclarationFilePath: string, prefix = "") {
        usedDeclarationFilesTracker.markAsUsed(currentDeclarationFilePath);
        const currentSourceFilePathContainingDirectory = path.dirname(currentDeclarationFilePath);

        const importRegex = /(import|export)\s*\{.*\}\s*from\s*("|')(.*)("|')/g;
        const importRegexModuleNameGroup = 3; // This is the regex group that will contain the actual module name
        await ioSeriesManager.enqueueOperation(currentDeclarationFilePath, async () => {
            reportFSAction(FSAction.Read, currentDeclarationFilePath, true);
            const sourceFileContents = (await fsAsync.readFile(currentDeclarationFilePath)).toString();
            reportFSAction(FSAction.Read, currentDeclarationFilePath, false);
            if (sourceFileContents.length === 0) {
                console.log("0    length:", currentDeclarationFilePath);
            }

            const rewrites: {before: string; after: string; absolute: string;}[] = [];
            const relativeImportPaths: string[] = [];

            var importRegexMatch = importRegex.exec(sourceFileContents);
            while (importRegexMatch !== null) {
                const referenceModuleString = importRegexMatch[importRegexModuleNameGroup];
                // Check to see if the reference source file path begins with an alias.
                var beginsWithAlias = false;
                for(const [aliasValue, aliasSubdirectory] of Array.from(aliasMap.entries())) {
                    if (referenceModuleString.startsWith(aliasValue)) {
                        beginsWithAlias = true;
                        // Transform into absolute path.
                        const referenceModuleAbsolutePath = referenceModuleString.replace(aliasValue, path.resolve(desclarationsDir, baseDir, "./" + aliasSubdirectory)) + ".d.ts";
                        // Transform into relative path.
                        const referenceModuleRelativePath = await getRelativeImportPath(currentDeclarationFilePath, referenceModuleAbsolutePath);
                        rewrites.push({
                            before: referenceModuleString,
                            after: referenceModuleRelativePath,
                            absolute: referenceModuleAbsolutePath
                        });
                        relativeImportPaths.push(referenceModuleRelativePath);
                        break;
                    }
                }
                if (!beginsWithAlias) {
                    relativeImportPaths.push(referenceModuleString);
                }
                importRegexMatch = importRegex.exec(sourceFileContents);
            }
            // Now we can do the rewriting.
            var final = sourceFileContents;
            for(const rewrite of rewrites) {
                final = final.replace(rewrite.before, rewrite.after);
            }
            reportFSAction(FSAction.Write, currentDeclarationFilePath, true);
            await fsAsync.writeFile(currentDeclarationFilePath, final);
            reportFSAction(FSAction.Write, currentDeclarationFilePath, false);
            await Promise.all(relativeImportPaths
                .map(relativeImportPath => path.resolve(currentSourceFilePathContainingDirectory, relativeImportPath + ".d.ts"))
                .map(absoluteImportPath => rewriteImportAliases(absoluteImportPath, prefix + "  ")));
        });
    }

    await rewriteImportAliases(entryDeclarationFile);

    const outputSubpathWithinDistributionDirectory = outputPath.substring(DISTRIBUTION_DIRECTORY.length) + path.sep + outputFilename.replace(/.js$/, "");
    const declarationOutput = `
declare module "${moduleName}${outputSubpathWithinDistributionDirectory.replace(/\\/g, "/")}" {
    export * from "${moduleName}/types${entrySubpathWithinDeclarationsDirectory.replace(/\\/g, "/").replace(/.d.ts$/, "")}";
}
`;
    // Write out to file.
    const outputDeclarationFile = path.resolve(outputPath, outputFilename.replace(/.js$/, ".d.ts"));
    await fsAsync.writeFile(outputDeclarationFile, declarationOutput);
    usedDeclarationFilesTracker.markAsUsed(outputDeclarationFile);
}