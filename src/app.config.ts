// Extras
import $fx, { play$fx } from "@/assets/fx"

const appConfig = {
  $fx,
  play$fx,
  $requireAvatar: require.context("@/assets/images/avatars/"),
  $requireImg: require.context("@/assets/images/"),
  $requireIcon: require.context("@/assets/icons/"),
  $historyCount: window.history.length
}

export default appConfig 