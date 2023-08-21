import DbStorageApi from './DbStorageApi';
import User from '@/utils/User';

export interface NewProfileForm {
  id?: string
  name: {
    full: string;
  }
  avatar: string
  favoriteFood: string
  favoriteThing: string
  jobClass: string
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
      .then(this.showSuccessToast);
  }
}

export default ProfileDb