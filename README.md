# Tower Conquest Game

Welcome to **Tower Conquest**, a strategic tower capture game where you aim to conquer all towers on the map by connecting and commanding your own towers. Play against an AI or challenge a friend in multiplayer mode!

**Play the game here:** [Tower Conquest Game](https://digantadey.github.io/Tower-Conquest-Game/)

## Table of Contents

- [How to Play](#how-to-play)
- [Game Features](#game-features)
- [Game Modes](#game-modes)
- [Tower Types](#tower-types)
- [Obstacles](#obstacles)
- [Controls](#controls)
- [Scoring and Winning](#scoring-and-winning)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Contributing](#contributing)
- [License](#license)

## How to Play

In **Tower Conquest**, your goal is to capture all enemy and neutral towers on the map. You achieve this by connecting your towers to others to send units for attack or support.

- **Attack Enemy Towers**: Connect your tower to an enemy tower to send attacking units.
- **Support Your Towers**: Connect your tower to another of your own to send supportive units, increasing its strength.

## Game Features

- **Singleplayer Mode**: Battle against an AI opponent with adjustable difficulty levels.
- **Multiplayer Mode**: Play against a friend on the same device.
- **Dynamic Obstacles**: Randomly placed obstacles affect your strategy by blocking connections.
- **Tower Types**: Different tower types with unique abilities (to be expanded in future updates).
- **Game Legend and Information Tooltip**: Understand game elements easily with on-screen guides.
- **Responsive Design**: Play on any device with an adaptable game interface.

## Game Modes

### Singleplayer (Play vs AI)

- Choose from **Easy**, **Medium**, or **Hard** difficulty levels.
- The AI opponent adapts its strategy based on the selected difficulty.

### Multiplayer (Play vs Player)

- Take turns with a friend to capture towers.
- The game indicates whose turn it is at the top of the screen.

## Tower Types

- **Player 1 Tower**: Your towers are marked in **blue**.
- **Player 2 Tower**: Opponent's towers are marked in **green**.
- **AI Tower**: AI-controlled towers are marked in **red**.
- **Neutral Tower**: Unclaimed towers are marked with a neutral icon.
- **Obstacle**: Blocks connections between towers; cannot be moved or captured.

## Obstacles

- Obstacles are randomly placed on the map at the start of each game.
- They prevent direct connections between towers if they are in the path.
- Plan your strategy to navigate around them.

## Controls

- **Select a Tower**: Click or tap on one of your towers.
- **Connect to Another Tower**: Click or tap on a target tower to create a connection.
  - **Attack**: Connect to an enemy or neutral tower to attack.
  - **Support**: Connect to your own tower to send reinforcements.
- **Cancel Selection**: Click or tap anywhere else on the screen.
- **Toggle Game Legend**: Use the "Hide Legend" or "Show Legend" button to toggle the game legend visibility.
- **Pause/Resume**: Use the "Pause" and "Resume" buttons to control the game flow.
- **Restart Game**: Click the "Restart" button to reset and start a new game.

## Scoring and Winning

- **Points**: Earn 10 points each time you capture a tower.
- **Winning the Game**:
  - **Singleplayer**: Defeat the AI by capturing all its towers.
  - **Multiplayer**: Be the first to capture all of your opponent's towers.
- The game ends when one player has no towers left.

## Technologies Used

- **HTML5 Canvas**: For rendering game graphics.
- **JavaScript (ES6)**: Core game logic and interactivity.
- **CSS3**: Styling and responsive design.

## Installation

To run the game locally:

1. **Clone the repository**:

   ```bash
   git clone https://github.com/digantadey/Tower-Conquest-Game.git
2. **Navigate to the project directory**:
   ```bash
   cd Tower-Conquest-Game
3. **Open `index.html` in your web browser**.
   - You can double-click the index.html file, or
   - Serve the directory using a local web server like Live Server in VSCode.

## Contributing
Contributions are welcome! If you have ideas for improvements or new features:
1. **Fork the repository**.
2. **Create a new branch**:
   ```bash
   git checkout -b feature-name
3. **Commit your changes**:
   ```bash
   git commit -am 'Add new feature'
4. **Push to the branch**:
   ```bash
   git push origin feature-name
5. **Create a Pull Request on GitHub**.
## License
This project is licensed under the MIT License.
