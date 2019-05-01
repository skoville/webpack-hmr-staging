import * as path from 'path';
export const PUBLIC_DIRECTORY = path.resolve(__dirname, "..");
export const PUBLIC_API_DIRECTORY = path.resolve(PUBLIC_DIRECTORY, "api");
export const PROJECT_DIRECTORY = path.resolve(PUBLIC_DIRECTORY, "..");
export const DISTRIBUTION_DIRECTORY = path.resolve(PROJECT_DIRECTORY, "distribution");
export const SOURCE_DIRECTORY = path.resolve(PROJECT_DIRECTORY, "source");
export const UNIVERSAL_SOURCE_DIRECTORY = path.resolve(SOURCE_DIRECTORY, "universal");