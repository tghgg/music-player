![preview](preview.png)
# Music Player
My own music player made for learning Electron. 

## Features 
- Play songs and keep track of playback history.
- Control everything from the tray (with a cute Godot icon).

## Installation
### Windows
- Download the executable file [here](https://github.com/tghgg/music-player/releases/tag/v2.0.1) and run it.
### Linux
- Download the AppImage file [here](https://github.com/tghgg/music-player/releases/tag/v2.0.1) and run it.
### MacOS
- TODO: Test the Mac binary myself.
- As I do not use MacOS, I cannot provide the Mac binary on GitHub for now (until I find a way to do so without using MacOS at least). If you want to use this app, you'll have to build it yourself.
- I don't know the exact way to do it, but it goes something like this:
  - [Install Node.js on your machine using Homebrew](https://changelog.com/posts/install-node-js-with-homebrew-on-os-x)
  - Download the source code (using `git clone` or getting the zip file [here](https://github.com/tghgg/music-player/releases/tag/v2.0.1))
  - Navigate into the source code directory and open up a terminal there
  - Install dependencies:
  Run ``` npm install ``` in the terminal
  - Build with electron-builder:
  Run ``` npm run dist ``` in the terminal
  - The binary should be in the new `dist` folder
  
## License
Licensed under the MIT license.
