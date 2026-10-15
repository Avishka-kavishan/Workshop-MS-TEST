---
name: deploy
description: Deploy the Workshop Management System to production by validating the build, merging New-Workshop-MS into main, and pushing to origin/main.
---

# Deploy Workshop Management System

Follow this step-by-step procedure whenever the user asks to deploy, update deployment, or release changes:

1. **Check Status**:
   - Verify active branch is `New-Workshop-MS` and working tree is clean:
     ```bash
     git status
     ```

2. **Test Production Build**:
   - Run production build test:
     ```bash
     npm run build
     ```
   - Confirm exit code 0 and successful page generation.

3. **Checkout Main**:
   - Switch to production branch:
     ```bash
     git checkout main
     ```

4. **Merge Latest Changes**:
   - Merge `New-Workshop-MS` into `main`:
     ```bash
     git merge New-Workshop-MS
     ```

5. **Deploy by Pushing to Remote**:
   - Push to `origin/main` (triggers Vercel / CI-CD pipeline):
     ```bash
     git push origin main
     ```

6. **Restore Development Branch**:
   - Switch back to `New-Workshop-MS`:
     ```bash
     git checkout New-Workshop-MS
     git status
     ```
