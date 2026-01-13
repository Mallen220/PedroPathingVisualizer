2026-01-13 - [Headless Verification with Electron]
Learning: Verifying Electron applications in a headless environment (like this sandbox) using Playwright is challenging because `npm run dev` often launches the Electron binary, which fails without an X server.
Action: For future features, rely on `npm run build` for verification if headless frontend testing is not feasible, or configure a web-only dev script (e.g. `vite`) that bypasses Electron completely if visual verification is strictly required. In this case, `npm run build` was sufficient to prove code integrity.
