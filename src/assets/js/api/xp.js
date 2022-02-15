/**
 * vwp.js
 */
import Api from "./api.class";

/**
 * SETTINGS
 */
export default new Api({ 
  url: 'http://xp.mycompassconsulting.com', 
  // url: 'http://hallofthegods.docksal', 
  base: "wp-json/wp/v2" 
});