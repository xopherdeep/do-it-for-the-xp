import type { NewProfileForm } from "@/lib/databases/ProfileDb"
import Stats from "./stats"
import { v4 as uuidv4 } from 'uuid'
import { isHeroSkin, type HeroSkin } from "@/lib/services/profile/heroSkin"

export interface ProfileName {
  fullName: string,
  first: string,
  last: string,
  middle: string,
  nick: string,
  preferred: string
}

interface UserName {
  full: string
  first: string
  middle: string
  last: string
  nick: string
  preferred: string
}

export default class User {
  public id: string
  public email: string
  public passcode: string
  public name: UserName
  public stats: Stats
  public birthday?: string
  public avatar: string
  public favoriteThing: string
  public favoriteFood: string
  public jobClass: string
  public isAdult: boolean
  /** A new hero starts with no items unlocked; temples, shops and the Pegasi add to this (see ItemEffects.ts) */
  public unlockedItems: string[]
  /** Retro or Modern; missing on a hero who never chose (services/profile/heroSkin.ts) */
  public skin?: HeroSkin

  constructor(defaults: NewProfileForm) {
    this.id = defaults?.id || uuidv4()
    this.email = defaults.email || ""
    this.passcode = defaults.passcode || "";
    this.name = this.setName(defaults.name)
    this.stats = new Stats(defaults.stats)
    this.birthday = defaults.birthday
    this.avatar = defaults.avatar
    this.favoriteThing = defaults.favoriteThing
    this.favoriteFood = defaults.favoriteFood
    this.jobClass = defaults.jobClass
    this.isAdult = defaults.isAdult
    this.unlockedItems = Array.isArray(defaults.unlockedItems) ? [...defaults.unlockedItems] : []
    if (isHeroSkin(defaults.skin)) this.skin = defaults.skin
  }
  setName(name: any) {
    return nameFromFull(name)
  }
}

/**
 * A hero's name block from what the form holds. Accepts "First Last", "First Middle Last" (any
 * number of middle names) and an optional nickname after "aka" or "a.k.a.", e.g. "Sam J. Smith a.k.a. Sammy".
 */
export function nameFromFull({ full, first, last, middle, nick, preferred }: any) {
  const name = { full, first, last, middle, nick, preferred }
  if (full) {
    const [realName, akaNick] = String(full).split(/\s+a\.?k\.?a\.?\s+/i)
    const parts = realName.trim().split(/\s+/).filter(Boolean)
    const hasParts = parts.length > 0
    if (hasParts) {
      name.first = name.first || parts[0]
      name.last = name.last || (parts.length > 1 ? parts[parts.length - 1] : "")
      name.middle = name.middle || parts.slice(1, -1).join(" ")
    }
    if (akaNick) name.nick = name.nick || akaNick.trim()
  }
  // Every hero needs something to be called by; fall back to the first name
  const hasNoNick = !name.nick
  if (hasNoNick) name.nick = name.first || name.full
  return name
}

// --- Saving the profile form ------------------------------------------------------------------

/** A hero as it sits in profile storage: every field the app has ever put on it, not only the ones the form shows */
export type StoredProfile = Record<string, any>

/** What the profile form holds: the `new User` fields, plus the 3D hero built in the look builder and its picture */
export type ProfileFormValues = NewProfileForm & { look?: unknown; avatarImage?: string }

/** The only fields the profile form edits. Everything else on a stored hero is not the form's to touch. */
const FORM_EDITED_FIELDS = ["email", "passcode", "avatar", "favoriteThing", "favoriteFood", "jobClass", "isAdult", "skin"] as const

/**
 * The record to save when the form edits a hero that already exists: the stored record with the
 * form's own fields laid over it. Stats, equipment, inventory, quest effects, Pegasi, unlocked
 * items and anything else the form never shows come through untouched, because `new User` keeps
 * only a fixed list of fields and would drop the rest.
 */
export function mergeProfileEdit(stored: StoredProfile, form: ProfileFormValues): StoredProfile {
  const edited: StoredProfile = {}
  for (const field of FORM_EDITED_FIELDS) {
    const isEdited = form[field] !== undefined
    if (isEdited) edited[field] = form[field]
  }
  // The same normalisation `new User` applies, so an edit never turns "" into a missing field
  edited.email = form.email || ""
  edited.passcode = form.passcode || ""

  // A renamed hero gets the name block derived again; the same name keeps the block as it is
  // (nickname and all). A nickname someone chose for themselves survives a rename.
  const storedName = stored.name ?? {}
  const full = form.name?.full
  const isRenamed = full && full !== storedName.full;
  if (isRenamed) {
    edited.name = { ...nameFromFull({ full }), ...(storedName.preferred ? { preferred: storedName.preferred } : {}) }
  }

  // Only a look the form really holds is laid over the stored one; the form cannot clear it
  const hasLook = !!form.look
  if (hasLook) edited.look = form.look
  const hasAvatarImage = !!form.avatarImage
  if (hasAvatarImage) edited.avatarImage = form.avatarImage

  return { ...stored, ...edited }
}

/** What the save path reads from profile storage (ProfileDb has both) */
export interface ProfileSaveStorage {
  get(id: string): Promise<StoredProfile | null | undefined>
  newProfile(form: NewProfileForm): StoredProfile
}

/**
 * The record the profile form saves. A hero that already exists (found in storage, else the
 * profile the form was opened with) is merged with the form's fields, so editing never wipes what
 * the form does not show. A new hero is built by `new User` as always, with the 3D look and its
 * picture added back by hand because `new User` does not keep them.
 */
export async function profileToSave(
  storage: ProfileSaveStorage,
  form: ProfileFormValues,
  openedWith?: StoredProfile | null
): Promise<StoredProfile> {
  let stored: StoredProfile | null | undefined
  const formId = form.id
  if (formId) {
    try {
      // Read it again now: the copy the form was opened with may be older than what is stored
      stored = await storage.get(formId)
    } catch {
      stored = undefined
    }
  }
  const existing = stored || openedWith
  if (existing) return mergeProfileEdit(existing, form)

  return {
    ...storage.newProfile(form),
    ...(form.look ? { look: form.look } : {}),
    ...(form.avatarImage ? { avatarImage: form.avatarImage } : {}),
  }
}
