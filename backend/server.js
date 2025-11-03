import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { syncIssues, importIssues } from './services/githubService.js';
import { createIssue, updateIssue, getIssuesByQuery, getProjectIssues, extractGitHubUrlFromDescription, extractGitHubIssueNumber, extractGitHubOwnerAndRepo } from './services/youtrackService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/test-token', async (req, res) => {
  try {
    const result = await getIssuesByQuery('project: test limit: 1');
    res.json({
      success: true,
      message: 'Token is valid',
      result: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message,
      hint: 'Check your YOUTRACK_TOKEN in .env file'
    });
  }
});

app.post('/api/import', async (req, res) => {
  try {
    const { owner, repo } = req.body;
    const youtrackProjectId = process.env.YOUTRACK_PROJECT_ID;

    if (!owner || !repo) {
      return res.status(400).json({ 
        error: 'Missing required parameters: owner, repo' 
      });
    }

    if (!youtrackProjectId) {
      return res.status(400).json({ 
        error: 'YOUTRACK_PROJECT_ID not configured in environment variables' 
      });
    }

    let existingYouTrackIssues = [];
    try {
      existingYouTrackIssues = await getProjectIssues(youtrackProjectId);
    } catch (error) {
      existingYouTrackIssues = [];
    }
    const existingIssuesMap = new Map();
    const titleToYouTrackMap = new Map();
    
    for (const ytIssue of existingYouTrackIssues) {
      const description = ytIssue.description || '';
      const githubUrl = extractGitHubUrlFromDescription(description);
      
      if (githubUrl) {
        const githubInfo = extractGitHubOwnerAndRepo(githubUrl);
        const githubIssueNumber = extractGitHubIssueNumber(githubUrl);
        
        if (githubIssueNumber && githubInfo) {
          if (githubInfo.owner.toLowerCase() === owner.toLowerCase() &&
              githubInfo.repo.toLowerCase() === repo.toLowerCase()) {
            existingIssuesMap.set(githubIssueNumber, ytIssue);
          }
        }
      }
      
      if (ytIssue.summary) {
        const normalizedTitle = ytIssue.summary.trim().toLowerCase();
        titleToYouTrackMap.set(normalizedTitle, ytIssue);
      }
    }
    const issues = await importIssues(owner, repo);
    
    if (!issues || issues.length === 0) {
      return res.json({
        success: false,
        noIssues: true,
        message: 'There isn\'t any issues to import'
      });
    }
    
    const results = [];

    for (const issue of issues) {
      try {
        let existingYtIssue = existingIssuesMap.get(issue.number);
        
        if (!existingYtIssue) {
          const normalizedTitle = issue.title.trim().toLowerCase();
          const fallbackYtIssue = titleToYouTrackMap.get(normalizedTitle);
          
          if (fallbackYtIssue) {
            existingYtIssue = fallbackYtIssue;
            existingIssuesMap.set(issue.number, existingYtIssue);
          }
        }
        
        if (existingYtIssue) {
          results.push({
            githubId: issue.number,
            youtrackId: existingYtIssue.id,
            status: 'skipped',
            message: 'Issue already exists in YouTrack'
          });
          continue;
        }

        const youtrackIssue = await createIssue({
          projectId: youtrackProjectId,
          summary: issue.title,
          description: issue.body || '',
          githubNumber: issue.number,
          githubUrl: issue.html_url
        });

        results.push({
          githubId: issue.number,
          youtrackId: youtrackIssue.id,
          status: 'imported',
          title: issue.title
        });
      } catch (error) {
        results.push({
          githubId: issue.number,
          status: 'error',
          error: error.message
        });
      }
    }

    const importedCount = results.filter(r => r.status === 'imported').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    res.json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      errors: errorCount,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sync', async (req, res) => {
  try {
    const { owner, repo } = req.body;

    if (!owner || !repo) {
      return res.status(400).json({ 
        error: 'Missing required parameters: owner, repo' 
      });
    }

    const result = await syncIssues(owner, repo);
    
    if (result.needsImport) {
      return res.json(result);
    }
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    res.json({
      status: 'running',
      message: 'Service is operational. Use /api/import and /api/sync endpoints.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT);

