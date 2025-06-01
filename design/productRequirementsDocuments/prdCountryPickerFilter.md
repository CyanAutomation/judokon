PRD: Country Flag Picker Filter

⸻

Problem Statement

Each judoka and judoka card is affiliated with a country (e.g., a judoka might be part of the Spanish team). Currently, there is no way for players to browse judoka by country, which frustrates players when searching for their favorite country’s athletes.

The lack of an intuitive country filter diminishes user experience, leading to inefficient browsing and potential drop-off. By including a country picker, we aim to increase session duration and card interaction rates — both critical, as longer, more engaged sessions correlate directly with higher player retention and in-game activity.

⸻

Goals
	•	Performance Goal: Enable country filtering in under 1 second for 95% of users.
	•	Reliability Goal: Achieve zero crashes related to the country selector over 10,000 sessions.
	•	Coverage Goal: Ensure >90% of available countries are selectable via the flag interface.
	•	UX Goal (New): Achieve a >95% success rate where users select the intended country without mis-taps, measured via interaction telemetry post-launch.

⸻

How It Works

On in-scope screens (e.g., the Browse Judoka screen), there should be an option to toggle an overlay or slide-in panel that presents all available countries.

Key Details:
	•	Only countries present in the judoka.json file will be displayed.
	•	Instead of a list, the selector will use flag icons to represent each country.
	•	When a user clicks on a flag:
	•	The card carousel refreshes, filtering to display only judoka from the selected country (e.g., clicking Jamaica will filter to only Jamaican judoka).
	•	The user can select only one country at a time, with an option to clear the selection to revert to displaying all judoka.

⸻

Functional Requirements
	•	P1: Country selector toggle — filter cards based on selected country.
	•	P1: Filtering and responsive time — filter must be applied within 1 second for the majority of users.
	•	P2: Support for three display modes:
	•	Hidden (collapsed).
	•	Narrow vertical slide-in with vertical scrolling.
	•	Full-screen grid view.
	•	P3: Performance optimizations for large datasets (supporting >50 countries efficiently with virtual scrolling or paging).

⸻

Acceptance Criteria
	•	On screens where multiple cards are shown, users are presented with the country selector toggle.
	•	Clicking a country selector:
	•	Filters the card carousel to only show cards from that country.
	•	The filtering operation completes within 1 second.
	•	The selector appears in under 1 second when toggled open.
	•	Users can only select one country at a time or clear the selection.
	•	Clear selection resets the card carousel to show all cards.
	•	Countries are displayed in alphabetical order.
	•	Country selector must:
	•	Support at least 100 countries without exceeding 200ms additional load time.
	•	Be accessible, providing alt-text for all country flags.
	•	Visually highlight the selected country flag.
	•	Provide clear feedback if no judoka exist for a selected country (empty state messaging).
	•	Handle missing flag assets gracefully with a fallback icon.

⸻

Edge Cases and Failure States
	•	If no judoka exist for a selected country, show an empty state message (“No judoka available for this country”).
	•	If a flag asset fails to load, display a generic fallback flag icon.
	•	For collections larger than 50 countries, implement virtual scrolling or paging to prevent UI overload.
	•	On slow networks, implement graceful degradation with progressive flag loading to prioritize interactivity.

⸻

Design and UX Considerations
	•	Background of the country selector should use a dark color to help flags and text stand out.
	•	Each country is represented by:
	•	Flag icon.
	•	Country name label beneath the flag.
	•	Three display modes:
	•	Hidden: No UI visible until toggled.
	•	Slide-in Panel: Narrow vertical panel with scroll.
	•	Full-Screen Grid: Grid layout showing all countries.
	•	Mobile Optimization:
	•	Minimum tap target size of 48x48dp for flags to ensure touch accessibility.
	•	Color contrast ratios must meet WCAG 2.1 AA standards for readability.
	•	Selected country should be visually highlighted (e.g., border or shading).
	•	Selector should respond well to different screen sizes (responsive design).

