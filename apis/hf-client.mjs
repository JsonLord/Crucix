import fetch from 'node-fetch';

export class HuggingFaceClient {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://huggingface.co/api';
  }

  get headers() {
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async getSpacesForProfile(profile) {
    const response = await fetch(`${this.baseUrl}/spaces?author=${encodeURIComponent(profile)}`, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch spaces for ${profile}: ${response.statusText}`);
    }
    return await response.json();
  }

  async getSpaceStatus(spaceId) {
    const response = await fetch(`${this.baseUrl}/spaces/${encodeURIComponent(spaceId)}`, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch status for ${spaceId}: ${response.statusText}`);
    }
    return await response.json();
  }

  async getSpaceReadme(spaceId) {
    const response = await fetch(`https://huggingface.co/spaces/${encodeURIComponent(spaceId)}/raw/main/README.md`, {
      headers: this.headers,
    });
    if (!response.ok) {
      return null;
    }
    return await response.text();
  }
}
