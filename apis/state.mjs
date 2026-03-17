import { HuggingFaceClient } from './hf-client.mjs';

export class StateManager {
  constructor(config) {
    this.config = config;
    this.clients = {}; // profileName -> HuggingFaceClient
    this.state = {};   // profileName -> [spaces]
    this.lastRefreshed = null;
    this.isRefreshing = false;

    // Initialize clients for configured profiles
    if (this.config.hf && Array.isArray(this.config.hf.profiles)) {
      for (const p of this.config.hf.profiles) {
        if (p.name) {
          this.clients[p.name] = new HuggingFaceClient(p.token);
          this.state[p.name] = []; // Initialize empty array for profile
        }
      }
    }
  }

  // Get a client for a specific profile name
  getClient(profileName) {
    return this.clients[profileName];
  }

  // Get the token configured for a specific profile name
  getToken(profileName) {
    const p = this.config.hf.profiles.find(x => x.name === profileName);
    return p ? p.token : null;
  }

  async refreshAll() {
    if (this.isRefreshing) return this.state;
    this.isRefreshing = true;

    try {
      const newState = {};
      const profiles = Object.keys(this.clients);

      for (const profileName of profiles) {
        const client = this.clients[profileName];
        try {
          const spacesData = await client.getSpacesForProfile(profileName);

          const spaces = [];
          // Fetch up to 10 for dev/demo to avoid rate limit
          for (const spaceSummary of spacesData.slice(0, 10)) {
            try {
              const fullSpace = await client.getSpaceStatus(spaceSummary.id);
              spaces.push({
                id: fullSpace.id,
                name: fullSpace.id.split('/')[1],
                profile: profileName,
                status: fullSpace.runtime?.stage || 'UNKNOWN', // running, paused, sleeping
                hardware: fullSpace.runtime?.hardware || 'cpu',
                lastModified: fullSpace.lastModified,
                author: fullSpace.author,
                likes: fullSpace.likes,
              });
            } catch (e) {
              console.error(`Failed to fetch full status for ${spaceSummary.id}:`, e.message);
            }
          }
          newState[profileName] = spaces;
        } catch (e) {
           console.error(`Failed to fetch spaces for profile ${profileName}:`, e.message);
           newState[profileName] = [];
        }
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
      profiles: this.config.hf.profiles.map(p => p.name) // Return list of profile names
    };
  }
}
