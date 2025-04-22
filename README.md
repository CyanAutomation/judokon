## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

You are free to use, modify, and share this project under the same terms — but any redistributed or modified versions must also be open-source and released under the GPL v3 license.

The visual assets (e.g. card illustrations and logos) are © 2025 Marc Scheimann. They may not be used commercially without permission.

## Table of Contents

1. [Contributing](#contributing)
2. [About JUDOKON!](#about-judokon)
3. [Features](#features)
4. [🎮 How to Play JUDOKON!](#-how-to-play-judokon)
   - [🥋 The Rules](#-the-rules)
5. [Live Demo](#live-demo)
6. [Installation](#installation)
7. [Dependencies](#dependencies)
8. [Project Structure](#project-structure)
9. [Changelog](#changelog)
10. [Future Plans](#future-plans)

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cyanautomation/judokon.git

2. Navigate to the project directory:
cd judokon

3. Serve the project using a local server (e.g., Live Server in VS Code) to ensure the import statements work:
npx serve

4. Open the game in your browser:
http://localhost:5000


## Dependencies

- None (pure HTML, CSS, and JavaScript)
- Modularized JavaScript with `utils.js` for reusable functions

## Project Structure
- index.html: The main HTML file for the game.
- style.css: The stylesheet for the game's design.
- script.js: The main JavaScript file for game logic.
- utils.js: A utility file containing reusable functions like generating flag URLs and card HTML.
- judoka.json: The JSON file containing judoka card data.

## Features

- 99-card deck featuring real-life elite judoka
- One-on-one stat battles
- Designed for kids and judo fans alike
- Playable directly in the browser
- Loading indicator for better user experience
- Modularized JavaScript for better maintainability

## About JUDOKON!

**JUDOKON!** is a fast-paced, web-based card game, featuring real-life elite judoka from the International Judo Federation. Designed for ages 8–12, the game uses simplified stats, vibrant collectible cards, and a player-vs-computer battle format. First to win 10 rounds takes the match!

This project is built with HTML, CSS, and JavaScript, and hosted on GitHub Pages.

🥋 99-card deck  
💥 One-on-one stat battles  
🔥 Built for kids and judo fans alike

Absolutely — here’s a clear, kid-friendly summary of the **JUDOKON!** rules that you can paste into your `README.md`:

---

## 🎮 How to Play JUDOKON!

**JUDOKON!** is a fast-paced, Top Trumps-style card game featuring real-life elite judoka. You play against the computer in a battle of stats — first to 10 wins takes the match!

### 🥋 The Rules:

1. **You vs. Computer**
   - Each match starts with both players receiving **25 random cards** from a 99-card deck.

2. **Start the Battle**
   - In each round, you and the computer each draw your top card.

3. **Choose Your Stat**
   - You select one of the stats on your card (e.g. Power, Speed, Technique, etc.)

4. **Compare Stats**
   - The chosen stat is compared with the computer’s card.
   - **Highest value wins the round**.
   - If both stats are equal, it’s a **draw** — no one scores.

5. **Scoring**
   - Each round win gives you **1 point**.
   - The cards used in that round are **discarded** (not reused).

6. **Winning the Match**
   - First player to reach **10 points** wins!
   - If **neither player reaches 10 points after 25 rounds**, the match ends in a **draw**.

## Live Demo

Play the game here: [JUDOKON!](https://cyanautomation.github.io/judokon/)

The live demo allows you to experience the full gameplay directly in your browser. No installation required!

## Future Plans
- Get feedback on current cards and stat points
- Take submissions/suggestions on new card designs and stats
- Add animations for card flips and stat comparisons
- Implement difficulty levels for the computer opponent
- Expand the card deck with more judoka and stats