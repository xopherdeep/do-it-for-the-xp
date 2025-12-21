const requireImg = require.context("@/assets/images/");
const requireAvatar = require.context("@/assets/images/avatars", false, /\.svg$/);

export { requireAvatar };
export default requireImg;