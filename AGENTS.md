# Workshop Management System - Agent Guidelines & Procedures

## Deployment Workflow

When the user asks to **"deploy"**, **"update deployment"**, or **"update the diployment"**, always follow this exact standard procedure:

1. **Verify Git Status & Active Branch**:
   - Ensure you are on the working branch (typically `New-Workshop-MS`).
   - Run `git status` to ensure all working changes are committed or staged.

2. **Run Production Build Validation**:
   - Execute `npm run build` in the project directory.
   - Verify that all static pages and API routes compile with 0 errors.

3. **Switch to Production Branch (`main`)**:
   - Execute:
     ```bash
     git checkout main
     ```

4. **Merge Working Branch**:
   - Fast-forward merge `New-Workshop-MS` into `main`:
     ```bash
     git merge New-Workshop-MS
     ```

5. **Push to Remote (`origin/main`)**:
   - Push to `origin/main` to trigger the automated Vercel / CI-CD production deployment:
     ```bash
     git push origin main
     ```

6. **Switch Back to Working Branch**:
   - Return to `New-Workshop-MS`:
     ```bash
     git checkout New-Workshop-MS
     ```
   - Run `git status` to verify the working tree is clean and up-to-date.
