import { IClientConfiguration } from "@universal/shared/client-configuration";
import { CLIENT_CONFIGURATION_OPTIONS } from "@universal/shared/webpack-bundle-injection-globals";
export const injectedClientConfiguration: IClientConfiguration = JSON.parse(CLIENT_CONFIGURATION_OPTIONS);