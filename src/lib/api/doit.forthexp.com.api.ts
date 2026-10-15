/**
 * vwp.js
 */
import Api from "./api.class";
import { resolveApiConfig } from "./apiHost";

/**
 * SETTINGS
 * Initialize the API as a singleton: the hosting WordPress site when xophz-compass-xp
 * serves the app, doit.forthexp.com otherwise (see apiHost.ts)
 */
Api.getInstance(resolveApiConfig(window.wpApiSettings));

// Export the API class which will use the singleton pattern
export default Api;