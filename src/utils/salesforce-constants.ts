export const SF_API_VERSION = '62.0';

export const SF_METADATA_URL = (instanceUrl: string) =>
  `${instanceUrl}/services/Soap/m/${SF_API_VERSION}`;

export const SF_TOOLING_URL = (instanceUrl: string) =>
  `${instanceUrl}/services/data/v${SF_API_VERSION}/tooling/query`;
