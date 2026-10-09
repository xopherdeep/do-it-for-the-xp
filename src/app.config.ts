// Extras
import $fx, { play$fx } from "@/assets/fx"
// Narrow image contexts live in one place so a catch-all can't creep back in (see requireImg.ts)
import requireImg, { requireAvatar } from "@/lib/utils/requireImg"

const appConfig = {
  $fx,
  play$fx,
  $requireAvatar: requireAvatar,
  $requireImg: requireImg,
  // Only SVG icons are looked up by key (XpAbout); the PNG icons are required directly
  $requireIcon: require.context("@/assets/icons/", false, /\.svg$/),
  $historyCount: window.history.length,

  $getUserAvatar(user: any) {
    if (!user) return "";
    const { avatar } = user;
    if (avatar) {
      return this.$requireAvatar(`./${avatar}.svg`);
    }
    return "";
  },
}

export default appConfig;