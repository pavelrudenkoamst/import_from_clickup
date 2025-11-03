export async function searchUsers(query) {
  if (!query || query.length < 2) {
    return [];
  }

  const response = await fetch(
    `https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=5`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  const data = await response.json();
  return data.items || [];
}

export async function searchRepos(owner, query) {
  if (!owner || !query || query.length < 1) {
    return [];
  }

  const response = await fetch(
    `https://api.github.com/search/repositories?q=user:${encodeURIComponent(owner)}+${encodeURIComponent(query)}&per_page=10`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  const data = await response.json();
  return data.items || [];
}

