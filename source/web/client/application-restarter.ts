import { AbstractClientApplicationRestarterModule } from "@universal/client/module/abstract/application-restarter-module";

export class WebClientApplicationRestarter extends AbstractClientApplicationRestarterModule {
    public constructor() {
        super();
    }

    public async restartApplication() {
        window.location.reload();
    }
}