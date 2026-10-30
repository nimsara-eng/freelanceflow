# FreelanceFlow backend

Requires a supported Node.js version, npm, and a running MongoDB instance.

1. Run `npm install` inside `server`.
2. Copy `.env.example` to `.env` and set the MongoDB connection URI and frontend origin.
3. Set `SESSION_SECRET` to a private, cryptographically random value of at least 64 characters. For a fresh `.env` copied from the example, this command fills the blank value without displaying the secret:

```powershell
node --input-type=module -e "import fs from 'node:fs'; import { randomBytes } from 'node:crypto'; const file='.env'; const text=fs.readFileSync(file,'utf8'); if (!/^SESSION_SECRET=$/m.test(text.replaceAll('\r',''))) throw new Error('Expected a blank SESSION_SECRET'); fs.writeFileSync(file,text.replace(/^SESSION_SECRET=\r?$/m,'SESSION_SECRET='+randomBytes(48).toString('hex')));"
```

4. Run `npm run dev`. The API listens only on `127.0.0.1`, with port 5001 in the example configuration. Start the frontend separately from `client` with `npm run dev` and open `http://127.0.0.1:5173`.

Check `http://127.0.0.1:5001/api/health`. Run `npm run test:auth` and `npm run test:media` for the backend checks, and `npm run lint` / `npm run build` inside `client` for frontend checks.

Sessions use HttpOnly cookies, MongoDB storage and CSRF tokens. Signup derives Client/Freelancer roles on the server. Files are held in private, bounded MongoDB Asset records; supported photo formats are JPEG/PNG/WebP, and resumes must be PDF. Resume download sharing is off initially and resets on replacement.

Email verification and OTP recovery delivery are deferred for the local MVP. Freelancer profiles are private until explicitly published; publishing currently does not require email verification. The app never marks an unverified email as verified. Projects, collaboration, design reviews, work requests, clients, time records and invoices use persisted data. See the [local MVP guide](../README.md) for the full journeys and current limits. Run `npm run test:all` for all backend unit checks.

Keep `.env` and real credentials private. The development proxy is not a production host; production requires HTTPS and same-origin API routing. QR links use the configured frontend origin; localhost links work only on that computer.
