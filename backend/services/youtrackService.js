function getApiBase() {
  const baseUrl = process.env.YOUTRACK_URL || 'https://youtrack.jetbrains.com';
  return `${baseUrl.replace(/\/$/, '')}/api`;
}

const YOUTRACK_API_BASE = getApiBase();

async function fetchYouTrack(url, options = {}) {
  const token = process.env.YOUTRACK_TOKEN;
  
  if (!token) {
    throw new Error('YOUTRACK_TOKEN not configured');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTrack API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

async function createIssue(data) {
  const { projectId, summary, description, githubNumber, githubUrl } = data;
  
  const endpointsToTry = [
    `${YOUTRACK_API_BASE}/issues`,
    `${YOUTRACK_API_BASE}/issues?fields=id,idReadable,summary`,
    `${YOUTRACK_API_BASE}/rest/issue`,
    `${YOUTRACK_API_BASE}/commands`
  ];
  
  let projectField;
  
  if (projectId.match(/^\d+-\d+$/)) {
    projectField = { 
      $type: 'Project',
      id: projectId 
    };
  } else {
    projectField = { 
      $type: 'Project',
      shortName: projectId 
    };
  }
  
  const body = {
    $type: 'Issue',
    project: projectField,
    summary: summary,
    description: description || ''
  };

  if (githubUrl) {
    const githubRef = `\n\nGitHub Issue: ${githubUrl}`;
    body.description = (body.description || '') + githubRef;
  }

  let lastError;
  for (const url of endpointsToTry) {
    try {
      const issue = await fetchYouTrack(url, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      return issue;
    } catch (error) {
      lastError = error;
      if (!error.message.includes('405')) {
        throw error;
      }
    }
  }
  
  throw lastError || new Error('All YouTrack API endpoints returned 405 Method Not Allowed');
}

async function updateIssue(youtrackId, data) {
  const { summary, description, state, assignee } = data;
  const url = `${YOUTRACK_API_BASE}/issues/${youtrackId}?fields=id,idReadable,summary`;
  
  const updates = {
    $type: 'Issue'
  };
  const customFields = [];
  
  if (summary !== undefined) {
    updates.summary = summary;
  }
  
  if (description !== undefined) {
    updates.description = description;
  }

  if (state) {
    customFields.push({
      $type: 'StateIssueCustomField',
      name: 'State',
      value: {
        $type: 'StateBundleElement',
        name: state
      }
    });
  }

  if (customFields.length > 0) {
    updates.customFields = customFields;
  }

  if (Object.keys(updates).filter(k => k !== '$type').length === 0) {
    return null;
  }

  return fetchYouTrack(url, {
    method: 'POST',
    body: JSON.stringify(updates)
  });
}

async function getIssue(youtrackId) {
  const url = `${YOUTRACK_API_BASE}/issues/${youtrackId}?fields=id,idReadable,summary,description,customFields`;
  return fetchYouTrack(url);
}

async function getIssuesByQuery(query) {
  const urlsToTry = [
    `${YOUTRACK_API_BASE}/issues?query=${encodeURIComponent(query)}&fields=id,idReadable,summary,description`,
    `${YOUTRACK_API_BASE}/issues?fields=id,idReadable,summary,description&query=${encodeURIComponent(query)}`,
    `${YOUTRACK_API_BASE}/issues?filter=project:${encodeURIComponent(query.split(':')[1]?.trim() || query)}&fields=id,idReadable,summary,description`,
  ];
  
  let result;
  let lastError;
  
  for (const url of urlsToTry) {
    try {
      result = await fetchYouTrack(url);
      break;
    } catch (error) {
      lastError = error;
    }
  }
  
  if (!result && lastError) {
    try {
      const searchUrl = `${YOUTRACK_API_BASE}/issues/search`;
      const postBody = {
        query: query,
        $fields: 'id,idReadable,summary,description'
      };
      result = await fetchYouTrack(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postBody)
      });
    } catch (postError) {
      throw postError;
    }
  }
  
  if (!result) {
    throw lastError || new Error('All query attempts failed');
  }
  
  let issues = [];
  if (Array.isArray(result)) {
    issues = result;
  } else if (result && Array.isArray(result.issue)) {
    issues = result.issue;
  } else if (result && Array.isArray(result.issues)) {
    issues = result.issues;
  } else if (result && result.length !== undefined) {
    issues = Array.from(result);
  } else if (result) {
    for (const key in result) {
      if (Array.isArray(result[key])) {
        issues = result[key];
        break;
      }
    }
  }
  
  return issues;
}

async function getProjectIssues(projectId) {
  const queriesToTry = [];
  
  if (projectId.match(/^\d+-\d+$/)) {
    queriesToTry.push(
      `project id: ${projectId}`,
      `project:{${projectId}}`,
      `project:${projectId}`
    );
  } else {
    queriesToTry.push(
      `project:${projectId}`,
      `project:{${projectId}}`,
      `#${projectId}`
    );
  }
  
  const allIssues = [];
  
  for (const query of queriesToTry) {
    try {
      const issues = await getIssuesByQuery(query);
      
      if (issues && issues.length > 0) {
        allIssues.push(...issues);
        break;
      }
    } catch (error) {
      continue;
    }
  }
  
  if (allIssues.length === 0) {
    try {
      const url = `${YOUTRACK_API_BASE}/issues?fields=id,idReadable,summary,description,project`;
      const allIssuesResult = await fetchYouTrack(url);
      
      if (Array.isArray(allIssuesResult)) {
        const filtered = allIssuesResult.filter(issue => {
          if (projectId.match(/^\d+-\d+$/)) {
            return issue.project && (issue.project.id === projectId || issue.projectId === projectId);
          } else {
            return issue.project && (
              issue.project.shortName === projectId ||
              issue.projectShortName === projectId ||
              (issue.project.name && issue.project.name.toUpperCase() === projectId.toUpperCase())
            );
          }
        });
        allIssues.push(...filtered);
      }
    } catch (error) {
    }
  }
  return allIssues;
}

function extractGitHubUrlFromDescription(description) {
  if (!description) return null;
  
  const patterns = [
    /GitHub Issue:\s*(https?:\/\/github\.com\/[^\s\n\)]+)/i,
    /GitHub:\s*(https?:\/\/github\.com\/[^\s\n\)]+)/i,
    /(https?:\/\/github\.com\/[^\/\s\)]+\/[^\/\s\)]+\/issues\/\d+[^\s\)]*)/i,
    /(https?:\/\/[^\/]*github\.com\/[^\/\s\)]+\/[^\/\s\)]+\/issues\/\d+[^\s\)]*)/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      let url = match[1];
      url = url.replace(/[.,;!?]+$/, '');
      if (url.includes('/issues/')) {
        return url;
      }
    }
  }
  
  return null;
}

function extractGitHubIssueNumber(githubUrl) {
  if (!githubUrl) return null;
  const match = githubUrl.match(/\/issues\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function extractGitHubOwnerAndRepo(githubUrl) {
  if (!githubUrl) return null;
  const match = githubUrl.match(/https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/\d+/i);
  if (match) {
    return {
      owner: match[1],
      repo: match[2]
    };
  }
  return null;
}

export {
  createIssue,
  updateIssue,
  getIssue,
  getIssuesByQuery,
  getProjectIssues,
  extractGitHubUrlFromDescription,
  extractGitHubIssueNumber,
  extractGitHubOwnerAndRepo
};

