import nintendo from "./nintendo.fx";
import earthbound from "./earthbound.fx";
import sony from "./sony.fx";

import key from "@/assets/audio/key.mp3";
import useKey from "@/assets/audio/use-key.mp3";

export const uiSounds = {
  nintendo: {
    loading: new Audio(nintendo.EshopIntro),
    intro: new Audio(nintendo.EshopIntro),
    setup: new Audio(nintendo.Settings),
    start: new Audio(nintendo.EnterBack),
    select: new Audio(nintendo.Select),
    click: new Audio(nintendo.Klick),
    klick: new Audio(nintendo.Klick),
    noSelect: new Audio(nintendo.Border),
    yes: new Audio(nintendo.Tick),
    no: new Audio(nintendo.Standby),
    alert: new Audio(nintendo.Bing),
    // error: new Audio(nintendo.),
    options: new Audio(earthbound.okdesuka),
    openTask: new Audio(nintendo.News),
    closeTask: new Audio(nintendo.Home),
    openPage: new Audio(nintendo.Album),
    closePage: new Audio(earthbound.okdesuka),
    chooseUser: new Audio(nintendo.User),
    openShop: new Audio(nintendo.Eshop),
    okdesuka: new Audio(earthbound.okdesuka),
    GameBoy: new Audio(nintendo.GameBoy),
    key: new Audio(key),
    useKey: new Audio(useKey),
  },
  sony: {
    loading: new Audio(nintendo.EshopIntro),
    intro: new Audio(nintendo.EshopIntro),
    setup: new Audio(sony.NavigationEnter),
    start: new Audio(sony.NavigationEnter),
    select: new Audio(sony.Navigation),
    click: new Audio(sony.Navigation),
    klick: new Audio(sony.Navigation),
    yes: new Audio(sony.PromptEnter),
    no: new Audio(sony.PromptBack),
    alert: new Audio(sony.Prompt),
    // error: new Audio(nintendo.),
    options: new Audio(sony.ControlCenterOn),
    openTask: new Audio(sony.NavigationEnter),
    closeTask: new Audio(sony.NavigationBack),
    openPage: new Audio(sony.NavigationEnter),
    closePage: new Audio(sony.NavigationBack),
    chooseUser: new Audio(sony.ControlCenterOn),
    openShop: new Audio(sony.TrophyNotification),
  },
};
