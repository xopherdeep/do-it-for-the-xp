/**
 * vwp.js
 */
import Api from "./api.class";

/**
 * SETTINGS
 */
export default new Api({ 
  protocol: 'https',
  url: 'doit.forthexp.com', 
  // url: 'http://hallofthegods.docksal', 
  base: "wp-json/wp/v2" 
});