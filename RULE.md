# SECURITY & ENVIRONMENT VARIABLE RULES

1. **Strict Prohibition on Secret Reading:**
   - NEVER read, view, print, grep, inspect, or cat the contents of any `.env` or `.env.*` files (e.g., `.env`, `.env.local`, `.env.production`).
   - NEVER execute commands like `cat .env`, `type .env`, `Get-Content .env`, `grep` on env files, or run scripts designed to dump environment variables.
   - Do NOT run inline Node.js/Python scripts to inspect or print `process.env` keys or AWS credentials.

2. **Template & Placeholder Handling:**
   - Only reference, modify, or create templates using `.env.example`.
   - When generating or suggesting configuration, always use mock placeholders (e.g., `AWS_SECRET_ACCESS_KEY=PASTE_YOUR_SECRET_KEY_HERE`).
   - If an `.env` file needs to be updated or created, provide the structure with placeholders and instruct the user to insert sensitive keys manually.

3. **Logging & Console Output Protection:**
   - NEVER add code or log statements that print raw API keys, tokens, or secret credentials to the console/terminal.
   - Only log masked or boolean states (e.g., `process.env.KEY ? "Set" : "Not Set"`).

4. **Git & Version Control Guard:**
   - Ensure `.env*` files (except `.env.example`) are always present in `.gitignore`.
   - NEVER stage, commit, or push any file containing actual secret values.