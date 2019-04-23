import { Log } from '@universal/shared/log';

export const log = new Log.Logger(async (request: Log.Request) => {
    console.log(request.contents);
});