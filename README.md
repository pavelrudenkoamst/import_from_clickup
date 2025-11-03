# GitHub → YouTrack Sync

A full-stack application to import and synchronize GitHub issues with YouTrack. Built with Node.js/Express backend and React frontend, orchestrated with Docker Compose.

## Features

- **Import Issues**: Import GitHub issues into YouTrack
- **Sync Issues**: Synchronize existing issues between GitHub and YouTrack
- **Smart Matching**: Automatically matches issues by GitHub URL or title
- **Duplicate Prevention**: Prevents importing duplicate issues
- **Autocomplete**: GitHub owner and repository autocomplete with debounce
- **Real-time Updates**: Progress indicators and result modals

## Requirements

- Docker and Docker Compose installed
- GitHub Personal Access Token
- YouTrack instance URL
- YouTrack Permanent Token
- YouTrack Project ID

## Configuration

### 1. Environment Variables

Create a `.env` file in the project root directory:

```bash
# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token

# YouTrack Configuration
YOUTRACK_URL=https://your-youtrack-instance.youtrack.cloud
YOUTRACK_TOKEN=perm:your-youtrack-token-here
YOUTRACK_PROJECT_ID=your-project-id
```

### 2. Getting Your Tokens

#### GitHub Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (to access repository issues)
4. Copy the token and add it to `.env` as `GITHUB_TOKEN`

#### YouTrack Token
1. Log into your YouTrack instance
2. Go to **Account Settings** → **Security** → **Permanent Tokens**
3. Click **Create Permanent Token**
4. Give it a name (e.g., "GitHub Sync")
5. Copy the token value immediately (it won't be shown again)
6. Add it to `.env` as `YOUTRACK_TOKEN` (without `Bearer` prefix - the code adds it automatically)

#### YouTrack Project ID
- This can be either the project short name (e.g., `TEST`) or numeric ID (e.g., `0-0`)
- You can find it in your YouTrack project settings

### 3. Environment File Example

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
YOUTRACK_URL=https://your-instance.youtrack.cloud
YOUTRACK_TOKEN=perm:xxxx-xxxx-xxxx-xxxx
YOUTRACK_PROJECT_ID=TEST
```

## Running the Application

### Using Docker Compose (Recommended)

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   # View all logs
   docker-compose logs -f
   
   # View backend logs only
   docker-compose logs -f backend
   
   # View frontend logs only
   docker-compose logs -f frontend
   ```

3. **Stop services:**
   ```bash
   docker-compose down
   ```

4. **Restart services:**
   ```bash
   docker-compose restart
   ```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Usage

### Import Issues

1. Open the application at http://localhost:3000
2. Enter GitHub owner/organization (e.g., `JetBrains`)
3. Enter repository name (e.g., `youtrack-workflows`)
4. Click **"Import Issues"**
5. Wait for the import to complete
6. Review the results in the modal

### Sync Issues

1. After importing issues, you can sync them
2. Enter the same GitHub owner and repository
3. Click **"Sync Now"**
4. The system will:
   - Compare GitHub issues with YouTrack issues
   - Update only changed issues
   - Skip unchanged issues
5. Review the sync results in the modal

### Notes

- **First-time sync**: You must import issues before syncing
- **Duplicate prevention**: The system automatically detects and skips already imported issues
- **Matching**: Issues are matched by GitHub URL in YouTrack description, with title-based fallback