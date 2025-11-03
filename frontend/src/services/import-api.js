import { apiClient } from './api-client.js';

export async function importIssues(owner, repo) {
  return apiClient.import({ owner, repo });
}

