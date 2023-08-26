import Stats from '@/utils/User/stats';
import DbStorageApi from './DbStorageApi';
import User from '@/utils/User';

export interface NewProfileForm {
  id?: string
  email?: string
  name: {
    full: string;
  }
  avatar: string
  favoriteFood: string
  favoriteThing: string
  jobClass: string
  isAdult: boolean
  birthday?: string
  stats: Stats
}

export class ProfileDb extends DbStorageApi {
  public newProfile(profile: NewProfileForm) {
    return new User(profile)
  }

  public async getProfiles() {
    const profiles = await this.getAll()
    return profiles
  }

  public async setProfile(profile: NewProfileForm) {
    if (!profile.id) return
    await this.set(profile.id, profile)
  }


  public async removeProfile(profileId: string) {
    await this.remove(profileId)
  }

  // Update stats like gp, xp, etc
  public async updateStats(profileId: string, stats: Stats) {
    const profile = await this.get(profileId)
    await this.set(profileId, {
      ...profile,
      stats
    })
  }

}


export default ProfileDb