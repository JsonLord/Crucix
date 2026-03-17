import { StateManager } from '../state.mjs';

// Mock config
const config = {
  hf: {
    token: 'test',
    profiles: ['test-profile']
  }
};

describe('StateManager', () => {
  it('should initialize correctly', () => {
    const manager = new StateManager(config);
    expect(manager.config).toBe(config);
    expect(manager.state).toEqual({});
    expect(manager.isRefreshing).toBe(false);
  });

  it('getState should return current state', () => {
    const manager = new StateManager(config);
    const state = manager.getState();
    expect(state).toHaveProperty('lastRefreshed');
    expect(state).toHaveProperty('isRefreshing');
    expect(state).toHaveProperty('spaces');
  });
});
