import { HuggingFaceClient } from './hf-client.mjs';

export class StateManager {
  constructor(config) {
    this.config = config;
    this.client = new HuggingFaceClient(config.hf.token);
    this.state = {}; // map of profile_id -> [spaces]
    this.lastRefreshed = null;
    this.isRefreshing = false;
  }

  async refreshAll() {
    if (this.isRefreshing) return this.state;
    this.isRefreshing = true;

    try {
      const newState = {};
      const profiles = this.config.hf.profiles;

      for (const profile of profiles) {
        if (!profile) continue;
        const spacesData = await this.client.getSpacesForProfile(profile);

        // spacesData is usually an array of space objects. We need to fetch the status for each.
        const spaces = [];
        for (const spaceSummary of spacesData) {
          try {
            const fullSpace = await this.client.getSpaceStatus(spaceSummary.id);
            spaces.push({
              id: fullSpace.id,
              name: fullSpace.id.split('/')[1],
              profile: profile,
              status: fullSpace.runtime?.stage || 'UNKNOWN', // running, paused, sleeping
              hardware: fullSpace.runtime?.hardware || 'cpu',
              lastModified: fullSpace.lastModified,
              author: fullSpace.author,
              likes: fullSpace.likes,
            });
          } catch (e) {
            console.error(`Failed to fetch full status for ${spaceSummary.id}:`, e);
          }
        }
        newState[profile] = spaces;
      }

      this.state = newState;
      this.lastRefreshed = new Date();
    } catch (e) {
      console.error('Error refreshing all spaces:', e);
    } finally {
      this.isRefreshing = false;
    }

    return this.state;
  }

  getState() {
    return {
      lastRefreshed: this.lastRefreshed,
      isRefreshing: this.isRefreshing,
      spaces: this.state,
    };
  }
}
