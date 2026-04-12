const { SF_METADATA_URL, SF_API_VERSION } = require('./src/utils/salesforce-constants');
console.log('SF_API_VERSION:', SF_API_VERSION);
console.log('SF_METADATA_URL:', SF_METADATA_URL('https://my-domain.salesforce.com'));
