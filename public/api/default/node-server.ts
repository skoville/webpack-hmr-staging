import { CustomizableNodeJSScovilleServer } from '../customizable/node-server';
import { DefaultNodeServerBoundaryModule } from '@node/server/default-server-boundary-module';
export class DefaultNodeJSScovilleServer extends CustomizableNodeJSScovilleServer {
    private readonly nodeServerBoundaryModule: DefaultNodeServerBoundaryModule;
    public constructor(memoryFS: boolean, port: number) {
        const nodeServerBoundaryModule = new DefaultNodeServerBoundaryModule(port);
        super(nodeServerBoundaryModule, memoryFS);
        this.nodeServerBoundaryModule = nodeServerBoundaryModule;
    }
    public close(callback: Function) {
        this.nodeServerBoundaryModule.close(callback);
    }
}