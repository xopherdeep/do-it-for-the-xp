// import img1 from "@/assets/images/avatars/001-gamer.svg"
import ProfileDb from "@/databases/ProfileDb"
import { profileStorage } from "@/views/App/SideMenu/SwitchProfile/SwitchProfile.vue"

const profilesDb = new ProfileDb(profileStorage)
const users = async () => await profilesDb.getAll()

export default users