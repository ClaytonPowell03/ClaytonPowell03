import { PostHog } from 'posthog-node';

let _client = null;

export function getPostHogClient() {
  if (_client) return _client;

  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST;

  if (!apiKey || !host) return null;

  _client = new PostHog(apiKey, { host });
  return _client;
}

export async function shutdownPostHog() {
  if (_client) {
    await _client.shutdown();
    _client = null;
  }
}
