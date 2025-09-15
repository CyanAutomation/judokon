Lowest-value Playwright specs
rank	file	total (0–10)	segment	intent	relevance	assertion	robustness	cost	duration (ms)	retries	quick_fix
1	battle-cli.spec.js	3	REMOVE/MERGE	1	1	1	0	0	60151	0	Drop waitForTimeout(500), switch CSS locators to getByRole/getByTestId, and break the flow into smaller tests to trim the 60 s runtime.
2	debug-settings-click.spec.js	4	REMOVE/MERGE	2	1	0	0	1	0	0	Add semantic expect checks for the Restore Defaults button and replace waitForTimeout with auto‑waiting locators.
3	debug-stat-loading.spec.js	4	REMOVE/MERGE	2	1	0	0	1	0	0	Introduce assertions verifying stat list population and drop the 3 s waitForTimeout in favor of expect‑based waits.
4	orchestrator-debug.spec.js	4	REMOVE/MERGE	1	1	1	0	1	5430	0	Replace the placeholder expect(true).toBe(true) with real checks and remove the 5 s timeout.
5	battle-classic/replay.spec.js	5	REFACTOR	1	1	1	0	2	1475	0	Swap waitForTimeout/waitForSelector for expect‑based waits and prefer role/test‑id selectors over #id queries.
6	win-target-sync.spec.js	5	REFACTOR	2	1	1	0	1	0	0	Eliminate repeated waitForTimeout(500) calls, rely on auto‑wait, and ensure the spec runs in CI with stable locators.
7	static-pages.spec.js	6	REFACTOR	1	1	0	2	2	1371	0	Add expect assertions (e.g., toHaveURL, toContainText) so the test validates page content instead of just navigating.
8	battle-classic/timer-clearing.spec.js	6	REFACTOR	2	1	1	0	2	2585	0	Replace timeouts/selectors with expect‑based waits and convert CSS queries to getByRole/getByTestId.
9	battle-classic/stat-selection.spec.js	6	REFACTOR	2	1	1	0	2	2571	0	Remove waitForTimeout/waitForSelector and assert selection via accessible locators.
10	battle-classic/cooldown.spec.js	6	REFACTOR	2	1	1	0	2	2389	0	Use auto‑waiting expectations for cooldown transitions and replace ad‑hoc CSS selectors with semantic ones.
Summary & repo‑wide guidance
Common issues
Heavy reliance on page.waitForTimeout and waitForSelector instead of Playwright’s auto‑waiting expectations.
Many specs lack meaningful assertions or use placeholder checks.
Predominant use of brittle CSS selectors rather than accessible locators.
Some tests never ran (duration 0), offering no coverage.
No traceability comments (Spec-ID, issue links) to justify test intent.
Recommended fixes
Ban waitForTimeout and prefer expect(locator).toBeVisible() / toHaveText() for synchronization.
Adopt getByRole/getByTestId to make locators stable and user‑centric.
Ensure every test contains at least one semantic assertion covering a real user outcome.
Annotate specs with Spec-ID or linked issue to document intent and prevent orphaned tests.
Review slow or unused specs; split lengthy flows and remove debug‑only scripts so the suite stays fast and relevant.