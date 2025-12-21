/**
 * vwp.js
 */
import Api from "./api.class";

/**
 * SETTINGS
 * Initialize the API as a singleton for consistent access throughout the app
 */
// Initialize the singleton instance
Api.getInstance({ 
  protocol: 'https',
  url: 'doit.forthexp.com', 
  // url: 'http://hallofthegods.docksal', 
  base: "wp-json/wp/v2" 
});

// Export the API class which will use the singleton pattern
export default Api;