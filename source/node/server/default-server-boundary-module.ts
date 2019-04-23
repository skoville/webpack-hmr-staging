import {NodeCompilerManagerRegistry} from './compiler-manager-module';
import * as express from 'express';
import * as mime from 'mime';
import * as http from 'http';
import * as socketio from 'socket.io';
import {SOCKET_MESSAGE_EVENT_NAME, CompilerNotification} from '@universal/shared/api-model';
import { AbstractServerBoundaryModule } from '@universal/server/module/abstract/server-boundary-module';

export class DefaultNodeServerBoundary extends AbstractServerBoundaryModule {
    private server: http.Server;
    private sockets: socketio.Socket[];

    public constructor(port: number) {
        super();
        const app = express();
        app.get("*", async (req, res, next) => {
            try {
                const path = req.path === '/' ? '/index.html' : req.path;
                const mimeType = mime.getType(path);
                if (mimeType == null) {
                    throw new Error(`unable to resolve mime type for resource at '${req.path}'`);
                }
                res.setHeader("Content-Type", mimeType);

                // Ideally we would be able to get the bundle id from the header of the get request, but we don't really have control over the get
                // requests being sent by webpack hot module replacement plugin. Therefore, the bottom code doesn't work.
                // TODO: find a way either to modify webpack's HMR behavior or to replace the plugin entirely so we can add the bundle id to the 
                // header of GET requests made to the header. Also add bundle id to header of GET requests of node HMR client, but this is easier
                // since we are currently controlling this portion.
                /**
                const bundleId = req.header(nameof(BUNDLE_ID));
                if (bundleId === undefined) {
                    throw new Error(`Request is missing '${nameof(BUNDLE_ID)}' header. Cannot complete request`);
                }
                console.log(`NEW GET REQUEST. ${nameof(bundleId)} = ${bundleId}`);
                const compilerManager = CompilerManagerRegistry.getCompilerManager(bundleId);
                const stream = await compilerManager.getReadStream(path);
                if(stream === false) {
                    throw new Error(`The compiler manager does not have any file stored at path '${req.path}'`);
                }
                */

                // For now we have to do it this way.
                const stream = await NodeCompilerManagerRegistry.getReadStream(path);

                // Keep the following line in either case, because either way we must pipe the stream to the response.
                stream.pipe(res);
            } catch(e) {
                // TODO: log.error(e.message); once logging is hooked up.
                return next();
            }
        });

        this.server = new http.Server(app);
        const io = socketio(this.server);
        this.sockets = [];
        io.on('connection', socket => {
            const bundleId: string = socket.handshake.query[nameof(BUNDLE_ID)];
            console.log(`NEW CONNECTION. ${nameof(bundleId)} = ${bundleId}`);
            const compilerManager = NodeCompilerManagerRegistry.getCompilerManager(bundleId);

            const unsubscribeFunction = compilerManager.subscribeToMessages(async message => {
                // TODO: I wrote the below comment a while ago regarding the same line but in a different context. See if it is still
                // needed.
                // Will want to end up using the socket.io emitted boolean to tell what clients are up to date and which are behind.
                io.to(socket.id).emit(SOCKET_MESSAGE_EVENT_NAME, message);
            });

            this.sockets.push(socket);
            socket.on("disconnect", () => {
                // TODO: check to see if the event's unsub implementation is idempotent, otherwise this could be the source of some errors.
                unsubscribeFunction();
                const index = this.sockets.indexOf(socket);
                if(index !== -1) this.sockets.splice(index, 1);
                socket.disconnect(true);
            });
        });

        this.server.listen(port, () => {
            console.log("listening");
        });
    }

    public close(cb: Function) {
        this.sockets.forEach(socket => socket.disconnect(true));
        this.sockets = [];
        this.server.close(() => {
            cb();
        });
    }

    protected async handleCompilerNotification(notification: CompilerNotification.Body) {
        
    }
}