import {
  settingsOutline,
  settingsSharp,
  helpBuoySharp,
  helpBuoyOutline,
  informationCircleOutline,
  informationCircleSharp,
  logOutOutline,
  logOutSharp,
  diamondOutline,
  diamondSharp,
  shareOutline,
  shareSharp,
  peopleCircleOutline,
  peopleCircleSharp
} from "ionicons/icons";

export default [
      {
        title: "Switch Profile",
        url: "/switch-profile",
        iosIcon: peopleCircleOutline,
        mdIcon: peopleCircleSharp,
      },
      {
        title: "XP Membership",
        url: "/xp-membership",
        iosIcon: diamondOutline,
        mdIcon: diamondSharp,
      },
      {
        title: "XP Settings",
        url: "/xp-settings",
        iosIcon: settingsOutline,
        mdIcon: settingsSharp,
      },
      {
        title: "XP Support",
        url: "/xp-support",
        iosIcon: helpBuoyOutline,
        mdIcon: helpBuoySharp,
      },
      {
        title: "About XP",
        url: "/",
        iosIcon: informationCircleOutline,
        mdIcon: informationCircleSharp,
      },
      {
        title: "Referral Bonuses",
        url: "/referral-bonuses",
        iosIcon: shareOutline,
        mdIcon: shareSharp,
      },
      {
        title: "Log Out",
        url: "/log-out",
        iosIcon: logOutOutline,
        mdIcon: logOutSharp,
      },
]