import { apiClient } from './api-client.js';

export async function syncIssues(owner, repo) {
  return apiClient.sync({ owner, repo });
}

