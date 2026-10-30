# FreelanceFlow client

React/Vite/Tailwind interface for the local FreelanceFlow MVP. See the [project guide](../README.md) for account roles, work requests, project/design collaboration, the private calendar, time tracking and invoice delivery.

From this folder:

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The development proxy expects the loopback API at `http://127.0.0.1:5001`. Keep its port in sync with your backend configuration.

```powershell
npm run lint
npm run test:logic
npm run build
```

Logic checks cover decimal money inputs and timezone/calendar boundaries. Browser checks additionally need a running QA API and synthetic accounts. `npm run build` only creates production assets; it does not deploy them or configure a production backend.
