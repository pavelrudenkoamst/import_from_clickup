import { 
  getProjectIssues, 
  getIssue,
  updateIssue,
  extractGitHubUrlFromDescription,
  extractGitHubIssueNumber,
  extractGitHubOwnerAndRepo
} from './youtrackService.js';

const GITHUB_API_BASE = 'https://api.github.com';

async function fetchGitHub(url, token) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'github-youtrack-sync'
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function getIssues(owner, repo, token) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=all&per_page=100`;
  const issues = [];
  let page = 1;

  while (true) {
    const response = await fetchGitHub(`${url}&page=${page}`, token);
    
    if (response.length === 0) {
      break;
    }

    const actualIssues = response.filter(issue => !issue.pull_request);
    issues.push(...actualIssues);

    if (response.length < 100) {
      break;
    }

    page++;
  }

  return issues;
}

function mapGitHubStatusToYouTrack(githubState, githubIssue) {
  if (githubState === 'closed') {
    return null;
  }
  
  if (githubIssue.assignee) {
    return 'In Progress';
  }
  
  return 'Open';
}

function extractOriginalDescription(ytDescription) {
  if (!ytDescription) return '';
  const githubUrlPattern = /\n\nGitHub Issue: https?:\/\/[^\s]+/i;
  return ytDescription.replace(githubUrlPattern, '').trim();
}

function getYouTrackState(ytIssue) {
  if (ytIssue.customFields) {
    for (const field of ytIssue.customFields) {
      if (field.name === 'State' && field.value) {
        return field.value.name || field.value;
      }
    }
  }
  if (ytIssue.state) {
    return ytIssue.state.name || ytIssue.state;
  }
  return null;
}

function normalizeText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

function isIssueUnchanged(ytIssue, githubIssue, expectedState) {
  const ytTitle = normalizeText(ytIssue.summary || '');
  const githubTitle = normalizeText(githubIssue.title || '');
  
  if (ytTitle !== githubTitle) {
    return false;
  }
  
  const ytOriginalDescription = extractOriginalDescription(ytIssue.description || '');
  const ytNormalized = ytOriginalDescription.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const githubBody = (githubIssue.body || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  
  const ytNormalizedWhitespace = normalizeText(ytNormalized);
  const githubNormalizedWhitespace = normalizeText(githubBody);
  
  if (ytNormalizedWhitespace !== githubNormalizedWhitespace) {
    return false;
  }
  
  const ytState = getYouTrackState(ytIssue);
  
  if (expectedState === null) {
    return true;
  }
  
  if (ytState !== expectedState) {
    if ((ytState === null || ytState === undefined) && expectedState === 'Open') {
      return true;
    }
    return false;
  }
  
  return true;
}

async function importIssues(owner, repo) {
  const token = process.env.GITHUB_TOKEN;
  return getIssues(owner, repo, token);
}

async function syncIssues(owner, repo) {
  const token = process.env.GITHUB_TOKEN;
  const issues = await getIssues(owner, repo, token);
  const youtrackProjectId = process.env.YOUTRACK_PROJECT_ID;
  
  if (!youtrackProjectId) {
    throw new Error('YOUTRACK_PROJECT_ID not configured');
  }
  
  let existingYouTrackIssues = [];
  try {
    existingYouTrackIssues = await getProjectIssues(youtrackProjectId);
  } catch (error) {
    throw error;
  }
  const githubToYouTrackMap = new Map();
  const titleToYouTrackMap = new Map();
  const youTrackIssuesFull = new Map();
  
  for (const ytIssue of existingYouTrackIssues) {
    const description = ytIssue.description || '';
    const githubUrl = extractGitHubUrlFromDescription(description);
    
    if (githubUrl) {
      const githubInfo = extractGitHubOwnerAndRepo(githubUrl);
      const githubIssueNumber = extractGitHubIssueNumber(githubUrl);
      
      if (githubIssueNumber && githubInfo) {
        const ownerMatch = githubInfo.owner.toLowerCase() === owner.toLowerCase();
        const repoMatch = githubInfo.repo.toLowerCase() === repo.toLowerCase();
        
        if (ownerMatch && repoMatch) {
          githubToYouTrackMap.set(githubIssueNumber, ytIssue);
          
          try {
            const fullIssue = await getIssue(ytIssue.id);
            youTrackIssuesFull.set(githubIssueNumber, fullIssue);
          } catch (error) {
            youTrackIssuesFull.set(githubIssueNumber, ytIssue);
          }
        }
      }
    }
    
    if (ytIssue.summary) {
      const normalizedTitle = ytIssue.summary.trim().toLowerCase();
      titleToYouTrackMap.set(normalizedTitle, ytIssue);
    }
  }
  
  let updated = 0;
  let skipped = 0;
  let created = 0;
  let errors = 0;
  let unmappedIssues = 0;

  for (const githubIssue of issues) {
    try {
      let ytIssue = githubToYouTrackMap.get(githubIssue.number);
      
      if (!ytIssue) {
        const normalizedTitle = githubIssue.title.trim().toLowerCase();
        const fallbackYtIssue = titleToYouTrackMap.get(normalizedTitle);
        
        if (fallbackYtIssue) {
          ytIssue = fallbackYtIssue;
          githubToYouTrackMap.set(githubIssue.number, ytIssue);
          
          if (!youTrackIssuesFull.has(githubIssue.number)) {
            try {
              const fullIssue = await getIssue(ytIssue.id);
              youTrackIssuesFull.set(githubIssue.number, fullIssue);
            } catch (error) {
              youTrackIssuesFull.set(githubIssue.number, ytIssue);
            }
          }
        }
      }
      
      if (ytIssue) {
        const youtrackState = mapGitHubStatusToYouTrack(githubIssue.state, githubIssue);
        const fullYtIssue = youTrackIssuesFull.get(githubIssue.number) || ytIssue;
        
        const unchanged = isIssueUnchanged(fullYtIssue, githubIssue, youtrackState);
        
        if (unchanged) {
          skipped++;
          continue;
        }
        
        try {
          await updateIssue(ytIssue.id, {
            summary: githubIssue.title,
            description: githubIssue.body || '',
            state: youtrackState,
            assignee: githubIssue.assignee?.login || null
          });
          
          updated++;
        } catch (updateError) {
          errors++;
        }
      } else {
        unmappedIssues++;
        continue;
      }
    } catch (error) {
      errors++;
    }
  }
  if (githubToYouTrackMap.size === 0 || (unmappedIssues === issues.length && updated === 0)) {
    return {
      success: false,
      needsImport: true,
      message: 'You need to import issues before syncing. Please import issues first.',
      total: issues.length,
      updated,
      created,
      errors
    };
  }

  return {
    success: true,
    total: issues.length,
    updated,
    skipped,
    created,
    errors
  };
}

export {
  getIssues,
  importIssues,
  syncIssues,
  mapGitHubStatusToYouTrack
};

