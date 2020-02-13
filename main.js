'use strict';
// INIT
const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, Tray } = require('electron');
const process = require('process');
const lib_data = require('./lib/data.js');
// Module for creating local JSON data
const Store = require('electron-store');
// Path module
const path = require('path');

// Declare app's windows
let mainWindow;

// Declare the app tray
let tray = null;

// Declare JSON file to store song history using electron-store
let playback_history;

// Global reference to the playing song
let current_song = 'None Playing';

// Global path separator
// between Windows and pretty everyone else
let separator;
if (process.platform === 'win32') {
  separator = '\\';
} else {
  separator = '/';
}

// Declare app menus
let menu;
const init_menu = [
  // Show play history and allow user to play a past song
  {
    label: 'History',
    id: 'history',
    submenu: [{
      label: 'Delete History',
      click: () => {
        // Delete playback history
        console.log('Delete playback history');
        playback_history.set('history', []);
        // Reset the menu
        const new_history = menu.getMenuItemById('history').submenu.items;
        new_history.splice(1, new_history.length - 1);
        init_menu[0].submenu = new_history;
        menu = Menu.buildFromTemplate(init_menu);
        Menu.setApplicationMenu(menu);
      }
    }]
  },
  // About box
  {
    label: 'About',
    click: (menuItem, window, event) => {
      dialog.showMessageBox({
        title: 'About',
        message: 'Music player v2.0.2 by Choppa2\nNode.js version: ' + process.versions.node + '; Electron version: ' + process.versions.electron + '.',
        buttons: ['Close']
      });
    }
  },
  // Quit
  {
    label: 'Quit',
    click: () => {
      // Quit app completely instead of minimizing to tray
      console.log('Quit app');
      app.isQuitting = true;
      app.quit();
    }
  }
];

// Reusable song picker function
function pick_file (event, data) {
  console.log('Open file picker dialog to choose a new song');
  console.time('Measure performance for picking new songs');
  dialog.showOpenDialog({
    filters: [{
      name: 'Music', extensions: ['mp3', 'mp4', 'wav', 'ogg', 'm4a']
    }],
    properties: ['openFile']
  }).then((file_object) => {
    console.table(file_object);
    // Stop if the user canceled the dialog box
    if (file_object.canceled) {
      console.log('Cancel file picker dialog');
      console.timeEnd('Measure performance for picking new songs');
      return;
    }
    // Add song to history
    // Delete old songs from history if list already has more than 10 items
    if (menu.getMenuItemById('history').submenu.items.length > 11) {
      // Pop the JSON database
      const new_history = playback_history.get('history');
      console.log('Remove ' + new_history.pop().name + ' from playback history');
      playback_history.set('history', new_history);
      // Overwrite the old menu completely with a shorter new menu
      // because programming is hard and you can't just do it
      // in one line
      const new_menu = menu.getMenuItemById('history').submenu.items;
      new_menu.pop();
      new_menu.splice(2, 0, new MenuItem(
        {
          label: file_object.filePaths[0].split(separator)[file_object.filePaths[0].split(separator).length - 1],
          click: (menuItem, window, event) => {
            // Set the global current song
            current_song = file_object.filePaths[0].split(separator)[file_object.filePaths[0].split(separator).length - 1];
            // Play the song
            mainWindow.webContents.send('selected_files', { file_path: file_object.filePaths, platform: process.platform });
          }
        }
      ));
      init_menu[0].submenu = new_menu;
      Menu.setApplicationMenu(Menu.buildFromTemplate(init_menu));
    } else if (menu.getMenuItemById('history').submenu.items.length === 1) {
      // Add separator
      menu.getMenuItemById('history').submenu.append(new MenuItem({
        type: 'separator'
      }));
      // Append song to history list under the separator
      menu.getMenuItemById('history').submenu.append(new MenuItem(
        {
          label: file_object.filePaths[0].split(separator)[file_object.filePaths[0].split(separator).length - 1],
          click: (menuItem, window, event) => {
            // Set the global current song
            current_song = file_object.filePaths[0].split(separator)[file_object.filePaths[0].split(separator).length - 1];
            // Play the song
            mainWindow.webContents.send('selected_files', { file_path: file_object.filePaths, platform: process.platform });
          }
        }
      ));
    } else {
      // Insert track at the top of the history list
      menu.getMenuItemById('history').submenu.insert(2, new MenuItem(
        {
          label: file_object.filePaths[0].split(separator)[file_object.filePaths[0].split(separator).length - 1],
          click: (menuItem, window, event) => {
            // Set the global current song (
            current_song = file_object.filePaths[0].split(separator)[file_object.filePaths[0].split(separator).length - 1];
            // Play the song
            mainWindow.webContents.send('selected_files', { file_path: file_object.filePaths, platform: process.platform });
          }
        }
      ));
    }

    // Add song to history database
    const new_history = playback_history.get('history', []);
    new_history.unshift({
      name: file_object.filePaths[0].split(separator)[file_object.filePaths[0].split(separator).length - 1],
      filepath: file_object.filePaths
    });
    playback_history.set('history', new_history);

    // Send back the selected files to the renderer process
    mainWindow.webContents.send('selected_files', { file_path: file_object.filePaths, platform: process.platform });

    console.timeEnd('Measure performance for picking new songs');
    // Return the song name
    return file_object.filePaths[0].split(separator)[file_object.filePaths[0].split(separator).length - 1];
  }, (err) => {
    dialog.showErrorBox('Error', `${err}\nFailed to pick a song file.`);
  });
}

// MAIN APP
// Create main window
app.on('ready', () => {
  if (!app.requestSingleInstanceLock()) {
      console.log('Quit app as there is already an instance running.');
      app.isQuitting = true;
      app.quit();
      return;
  }
  console.log('Create main app window');
  // Check for playback history database
  // TODO: Remove lib_data dependency because this can just be done with fs
  const data = lib_data.readSync(app.getPath('userData'), 'playback_history', true);
  if (data != null) {
    // Database already exists
    // now we populate the playback history with the songs in the playback_history.json
    console.log('Reading from existing playback history.');
    playback_history = new Store({
      name: 'playback_history'
    });
    playback_history.store = JSON.parse(data);
    const history = playback_history.get('history');
    // Add the songs to init_menu
    init_menu[0].submenu.push({ type: 'separator' });
    history.forEach((song) => {
      console.log('Adding ' + song.name + ' to the history list');
      init_menu[0].submenu.push({
        label: song.name,
        click: (menuItem, window, event) => {
          // Play the song
          mainWindow.webContents.send('selected_files', { file_path: song.filepath, platform: process.platform });
        }
      });
    });
  } else {
    // Database doesn't exists
    // Create the playback history database
    console.log('Create new playback history');
    playback_history = new Store({
      defaults: {
        history: []
      },
      name: 'playback_history'
    });
  }

  // Set the menu
  menu = Menu.buildFromTemplate(init_menu);
  Menu.setApplicationMenu(menu);
  // Create the main app window
  mainWindow = new BrowserWindow(
    {
      width: 800,
      height: 400,
      backgroundColor: '#000',
      show: true,
      webPreferences: { nodeIntegration: true },
      enableRemoteModule: false
    }
  );
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // Open inspector
  // mainWindow.webContents.openDevTools();

  // LISTENERS
  // Minimize/Close app to tray
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      console.log('Minimize main app window to tray');
      event.preventDefault();
      mainWindow.hide();
      // Declare app tray
      if (tray === null) {
        tray = new Tray(path.join(__dirname, 'tray_icon.png'));
        tray.setToolTip('Music Player');
        // On Windows, bring up the context menu upon clicking the tray icon
        if (process.platform === 'win32') {
          tray.on('click', (event, bounds, position) => {
            tray.popUpContextMenu();
          });
        }
        // Create tray menu
        const tray_menu = Menu.buildFromTemplate([{
          // Show the song being played
          // Continue the song if paused
          label: current_song,
          id: 'song_playing',
          click: () => {
            mainWindow.webContents.send('continue_song');
          }
        }, {
          type: 'separator'
        }, {
          // Pick a new song to play from the tray
          // and set the tooltip to that song's name
          label: 'Change Song',
          click: () => {
            pick_file();
          }
        }, {
          label: 'Pause Song',
          click: () => {
            console.log('Pause song');
            mainWindow.webContents.send('pause_song');
          },
          toolTip: 'Click the song name to continue playing song if paused'
        }, {
          label: 'Show App',
          click: () => {
            mainWindow.show();
          }
        }, {
          type: 'separator'
        },
        {
          label: 'Quit',
          click: () => {
            // Kill app and destroy tray icon
            console.log('Quit app');
            app.isQuitting = true;
            tray.destroy();
            tray = null;
            app.quit();
          }
        }]);
        // Set tray menu
        tray.setContextMenu(tray_menu);
      }
    }
  });
});

// LISTENERS
// Listen for second app instance
app.on('second-instance', (event, args, workingDirectory) => {
    mainWindow.show();
    console.log('Second instance detected. Closing it...');
});
// Open a file picker dialog
ipcMain.on('pick_file', pick_file);
// Change the label showing which song is playing when a new song is played
ipcMain.on('set_current_song', (event, data) => {
  console.log('The playing song is: '); console.log(data);
  current_song = data;
  if (tray !== null) {
    // Set a new menu with a label showing the currently playing song
    const tray_menu = Menu.buildFromTemplate([{
      // Show the song being played
      // Continue the song if paused
      label: current_song,
      id: 'song_playing',
      click: () => {
        mainWindow.webContents.send('continue_song');
      }
    }, {
      type: 'separator'
    }, {
      // Pick a new song to play from the tray
      // and set the tooltip to that song's name
      label: 'Change Song',
      click: () => {
        pick_file();
      }
    }, {
      label: 'Pause Song',
      click: () => {
        console.log('Pause song');
        mainWindow.webContents.send('pause_song');
      },
      toolTip: 'Click the song name to continue playing song if paused'
    }, {
      label: 'Show App',
      click: () => {
        mainWindow.show();
      }
    }, {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        // Kill app and destroy tray icon
        console.log('Quit app');
        app.isQuitting = true;
        tray.destroy();
        tray = null;
        app.quit();
      }
    }]);
    // Set tray menu
    tray.setContextMenu(tray_menu);
  }
});
