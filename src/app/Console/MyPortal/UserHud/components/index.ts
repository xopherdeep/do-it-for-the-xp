import XpFabPageMenu from "./XpFabPageMenu.vue" 
import XpFabUserHud from "./XpFabUserHud.vue" 
import XpFabQuickDraw from "./XpFabQuickDraw.vue"
import XpFabPageShortcuts from "./XpFabPageShortcuts.vue"
import CardUserStats from "@/components/organisms/CardUserStats/CardUserStats.vue";
import { Swiper, SwiperSlide } from "swiper/vue";
import XpEquipmentModal from "./XpEquipmentModal.vue"
import XpWorldMapModal from "./XpWorldMapModal.vue"
import UserProfileModal from "./UserProfileModal.vue"
import XpXpBar from "./XpXpBar.vue"
import XpGpBar from "./XpGpBar.vue" // Import new component
import XpMainHud from "./XpMainHud.vue"


export default { 
  Swiper,
  SwiperSlide,
  CardUserStats,
  XpFabPageMenu, 
  XpFabQuickDraw,
  XpFabPageShortcuts,
  XpFabUserHud,
  XpEquipmentModal,
  XpWorldMapModal,
  UserProfileModal,
  XpXpBar,
  XpGpBar, // Export new component
  XpMainHud
}