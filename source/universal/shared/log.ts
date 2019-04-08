import ansicolor from 'ansicolor';

export namespace Log {
    // levels and their ranks are based off of Log4j
    export enum Level {
        ALL,
        TRACE,
        DEBUG,
        INFO,
        WARN,
        ERROR,
        FATAL,
        OFF
    }

    export interface Request {
        level: Level;
        contents: string;
    }

    type RequestHandler = (request: Request) => Promise<void>;

    export class Logger {
        private requestHandler: RequestHandler;
        private prefix: string;
        private level: Level;
        
        public constructor(requestHandler: RequestHandler, prefix: string = "", level: number = Level.ALL) {
            this.requestHandler = requestHandler;
            this.prefix = prefix;
            this.level = level;
        }

        private handle(level: Level, message: string) {
            if (level >= this.level) {
                const contents = this.prefix + message;
                this.requestHandler({level, contents});
            }
        }

        public clone(newPrefix?: string, level?: number) {
            return new Logger(this.requestHandler, newPrefix, level);
        }

        // The logging methods.
        public trace(message: string) {
            this.handle(Level.TRACE, ansicolor.cyan(message));
        }
        public debug(message: string) {
            this.handle(Level.DEBUG, ansicolor.magenta(message));
        }
        public info(message: string) {
            this.handle(Level.INFO, message);
        }
        public warn(message: string) {
            this.handle(Level.WARN, ansicolor.yellow(message));
        }
        public error(message: string) {
            this.handle(Level.ERROR, ansicolor.red(message));
        }
        public fatal(message: string) {
            this.handle(Level.FATAL, ansicolor.bright.red(message));
        }
    }
}