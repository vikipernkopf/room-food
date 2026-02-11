# Contributing to RoomFood

## Git Workflow

### Branching Strategy
- `main` - Production-ready code
- `feature/*` - Feature branches (e.g., `feature/user-auth`, `feature/room-list`)
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Critical production fixes

### Development Process

1. **Create a Feature Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code
   - Test locally
   - Commit often with clear messages
   ```bash
   git add .
   git commit -m "feat: add user authentication"
   ```

3. **Push to GitHub**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**
   - Go to GitHub repository
   - Click "New Pull Request"
   - Select your feature branch
   - Add description of changes
   - Request review from team members

5. **Code Review**
   - Address feedback
   - Make requested changes
   - Push updates to same branch

6. **Merge**
   - Once approved, merge to `main`
   - Delete feature branch

## Local Development Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/vikipernkopf/room-food.git
   cd room-food/code
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   # Copy example env file
   cp ../.env.example ../.env
   # Edit .env with your local settings
   ```

4. **Initialize Database**
   ```bash
   npm run db:init
   ```

5. **Start Development Server**
   ```bash
   npm start
   # Server runs on http://localhost:4200
   ```

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```
