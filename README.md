# FreelanceFlow — local MVP

A private local MERN workspace for freelancers and their clients. The UI uses React, Vite and Tailwind; the API uses Express and MongoDB. Sign-up creates a client account, or both client and freelancer workspaces when Freelancer is selected.

## Run locally

Use two PowerShell terminals. Install Node.js with npm and MongoDB first.

```powershell
cd D:\Projects\SmartFreelanceManagement\server
npm ci
# First setup only: copy .env.example to .env if .env does not already exist.
# Configure MONGODB_URI, CLIENT_URL and a private random SESSION_SECRET.
npm run dev
```

Follow [server setup](server/README.md) to generate a secret without printing it. Preserve an existing `.env`; do not overwrite it. The example API port is **5001**. Check `http://127.0.0.1:5001/api/health`. If that port is occupied, stop only your earlier FreelanceFlow server or configure a free port and update the frontend proxy to match.

```powershell
cd D:\Projects\SmartFreelanceManagement\client
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Use this hostname consistently. Both listeners bind to loopback. MongoDB must be running; a successful health response alone does not test every account journey.

## Main journeys

1. **Connect:** freelancer completes Settings → Freelancer profile and explicitly publishes it. Client searches the shared ID/link, then sends a work request. Freelancer accepts or declines it under Work requests. Acceptance creates a shared project atomically. Alternatively, the freelancer creates a project and shares an invitation for the client to accept. Neither a private client label nor knowing an ID grants project access.
2. **Collaborate:** freelancer manages projects and tasks. Client can view progress and review shared designs. Freelancer uploads an image from Projects → Upload designs, then shares that version. View mode shows a clean image; Comment mode shows pins and discussions. Each person can edit/delete only their own feedback.
   **Approve and deliver:** freelancer requests approval for a shared version. The connected client approves it or requests changes with a reason. Each request records the version, client, submitter, timestamps and response. New versions require their own approval. Freelancer submits an approved version as final delivery; client accepts it or requests changes. After acceptance and task completion, the freelancer marks the project completed. Client sign-off never changes task progress. Approval and delivery records remain in history when an unprotected image is removed; pending requests and final-delivery images are protected from removal. Revoking/replacing client access invalidates earlier sign-off for the current workflow, including when the same client reconnects.
3. **Plan and track:** freelancer opens Time Tracking. Plan work reserves quarter-hours; overlapping reservations are rejected even when submitted at once. Adjacent sessions are allowed. Start/stop the saved timer or add/edit completed work. Planned time and actual time are separate. Calendar deadline markers and reminders underneath show unfinished projects overdue or due within seven days. Clients cannot access these APIs or screens.
4. **Invoice:** freelancer chooses a project with an accepted client and saves a private draft. Fill billing names/details, line items, quantities, rates, discount, tax, dates and notes. **USD is default; LKR is selectable.** Open the draft to edit/preview, then Send to client. The delivery account is fixed from the accepted project membership, independently of the editable bill-to text. Clients receive a read-only invoice and notification. Print / Save as PDF opens a separate authorized print page and uses the browser’s print dialog.
5. **Record payment:** after receiving payment outside the app, freelancer can mark a sent invoice paid. A sent invoice can instead be voided. Issued documents remain in history; correct a sent invoice by voiding it and creating a new draft. This app does not collect or verify payments.
6. **Notifications:** the bell shows account-specific updates for work requests, accepted/declined invitations, shared designs, new review comments/replies and invoices. Mark one or all read. Updates refresh about once a minute while the page is visible, on focus, or with Refresh.

## Checks

```powershell
cd D:\Projects\SmartFreelanceManagement\server
npm run test:all
npm run test:mvp-api
npm run test:approvals
npm audit --omit=dev
```

```powershell
cd D:\Projects\SmartFreelanceManagement\client
npm run lint
npm run test:logic
npm run build
npm audit
```

The unit checks need no database. `test:mvp-api` requires the local MongoDB service; it starts a loopback API on an available port with an empty working folder, random session secret and fresh `freelanceflow_mvp_qa_…` database. It exercises synthetic account journeys, permissions, concurrency, notifications and invoice delivery, then stops only its own API and drops only that named QA database. It does not read your `.env` or change the normal database. For manual testing, also use synthetic accounts in a separate QA database. Check mobile layout and the browser’s print/PDF dialog as well as the API checks.

## Local limits and recovery

- Calendar uses the Settings timezone: Asia/Colombo or UTC. Schedules use 15-minute steps, max 12 hours each; manual completed entries max 24 hours. A forgotten timer is not silently capped: stop it and correct its record.
- One API process is supported for time-entry overlap checks. Calendar overlap and one running timer are also protected by database indexes. Multiple API workers require a distributed lock or transactions for all time-entry mutations.
- Calendar displays up to 300 plans/entries/deadlines in its six-week range and 50 urgent reminders, with a display-limit notice. Use Projects to review all deadlines. Project dropdowns list all projects in the current account.
- Invoice amounts use server-computed integer cents, at most 30 items, two decimal places for quantities/rates, and a positive total. No currency conversion occurs. Sender/client billing text is shared only when entered deliberately; private account addresses are never copied automatically.
- Existing image-review limits remain: five bounded image versions per project, 20 threads per version and 10 replies per thread. Removed project records, plans, time entries and private invoice drafts have no in-app restore. Issued invoices cannot be deleted.
- Approval history supports up to 100 requests and 20 final deliveries per project. Only one approval request per version and one final delivery can await a response within the current client connection. Submitted responses cannot be edited; submit a further request/version instead. Completed projects can be reopened by the freelancer through project status editing.
- If a save/send loses its response, refresh the relevant list before retrying. Mutations are never automatically replayed. Repeated or stale changes return a conflict instead of silently overwriting newer work.
- Back up the local MongoDB database and private configuration before upgrades. Keep backups outside Git with access restricted to you. A restore should first be checked in a separate local database. Changing the session secret signs existing sessions out; it is not an account-password recovery method.

## Deferred before a public release

Per the current local-MVP scope, **email verification, email OTP/password recovery delivery and hosting are deferred**. Publishing currently does not require email verification and never claims the email is verified. Reintroduce verified-email enforcement when mail delivery is implemented and tested. There is no deployed service, payment integration, production backup automation, or public-release approval in this change. Local QR/profile links work only on the computer hosting the app.

Keep `.env`, credentials and database backups out of Git. Public deployment needs its own HTTPS, same-origin routing, database/network permissions, email/recovery and operational validation.
