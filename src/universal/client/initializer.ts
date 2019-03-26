import { AbstractClientApplicationRestarter } from "./abstract/application-restarter";
import { AbstractClientMessageTransporter } from "./abstract/message-transporter";
import { ClientRuntime } from "./runtime";

export function InitializeClient(
    _applicationRestarter: AbstractClientApplicationRestarter,
    _messageTransporter: AbstractClientMessageTransporter
) {
    new ClientRuntime();
}