import { HuggingFaceClient } from '../hf-client.mjs';

describe('HuggingFaceClient', () => {
  it('should construct with or without token', () => {
    const client = new HuggingFaceClient('test-token');
    expect(client.token).toBe('test-token');
    expect(client.headers['Authorization']).toBe('Bearer test-token');

    const clientNoToken = new HuggingFaceClient(null);
    expect(clientNoToken.token).toBeNull();
    expect(clientNoToken.headers['Authorization']).toBeUndefined();
  });

  it('should use correct baseUrl', () => {
    const client = new HuggingFaceClient();
    expect(client.baseUrl).toBe('https://huggingface.co/api');
  });
});
