import { Log } from "@universal/shared/log";

export const log = (() => {
    async function handler(request: Log.Request) {
        console.log(request.contents);
    }
    return new Log.Logger(handler);
})();