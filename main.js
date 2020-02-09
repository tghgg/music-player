// INIT
const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, Tray } = require('electron');
const process = require('process');
const fs = require('fs');
const lib_data = require('./lib/data.js');
// Declare app's windows
let mainWindow;

// Declare the app tray
let tray = null;

// JSON file for song history
let playback_history = [];

// Global reference to the playing song
let current_song = 'None Playing';

// Declare app menus
let menu;
let init_menu = [
	// Show play history and allow user to play a past song
	{
		label: 'History',
		id: 'history',
		submenu: [{
			label: 'Delete History',
			click: () => {
				// Delete playback history
				let new_history = menu.getMenuItemById('history').submenu.items;
				new_history.splice(1, new_history.length-1);
				init_menu[0].submenu = new_history;
				playback_history = [];
				// Reset the menu
				menu = Menu.buildFromTemplate(init_menu);
				Menu.setApplicationMenu(menu);
				lib_data.update('.data', 'history', [], (err) => {
					if (err) {
						dialog.showErrorBox('Error', `${err}\nError deleting playback history.`);
					}
				});
			}
		}]
	},
	// About box
	{
		label: 'About',
		click: (menuItem, window, event) => {
			dialog.showMessageBox({
				title: 'About',
				message: 'Minimal music player by Choppa2\nNode.js version: ' + process.versions.node + '; Electron version: ' + process.versions.electron + '.',
				buttons: ['Close']
			});
		}
	}, 
	// Quit
	{
		label: 'Quit',
		click: () => {
			// Quit app completely instead of minimizing to tray
			app.isQuitting = true;
			app.quit();
		}
	}
];

// Reusable file picker function
function pick_file(event, data) {
	dialog.showOpenDialog({
		properties: ['openFile']
	}).then((file_object) => {
		// Add song to history
		// Delete old songs from history if list already has more than 10 items
		if (menu.getMenuItemById('history').submenu.items.length > 11) {
			// Pop the JSON database
			playback_history.pop();
			// Overwrite the old menu completely with a shorter new menu
			// because programming is hard and you can't just do it 
			// in one line
			let new_history = menu.getMenuItemById('history').submenu.items;
			new_history.pop();
			new_history.splice(2, 0, new MenuItem(
				{
					label: file_object.filePaths[0].split('/')[file_object.filePaths[0].split('/').length-1],
					click: (menuItem, window, event) => {
						// Set the global current song 
						current_song = file_object.filePaths[0].split('/')[file_object.filePaths[0].split('/').length-1];
						// Play the song
						mainWindow.webContents.send('selected_files', {file_path: file_object.filePaths, platform: process.platform});		
					}
				}
			));
			init_menu[0].submenu = new_history;
			Menu.setApplicationMenu(Menu.buildFromTemplate(init_menu));
		} else if (menu.getMenuItemById('history').submenu.items.length == 1) {
			// Add separator
			menu.getMenuItemById('history').submenu.append(new MenuItem({
				type: 'separator'
			}));
			// Append song to history list under the separator
			menu.getMenuItemById('history').submenu.append(new MenuItem(
				{
					label: file_object.filePaths[0].split('/')[file_object.filePaths[0].split('/').length-1],
					click: (menuItem, window, event) => {
						// Set the global current song 
						current_song = file_object.filePaths[0].split('/')[file_object.filePaths[0].split('/').length-1];
						// Play the song
						mainWindow.webContents.send('selected_files', {file_path: file_object.filePaths, platform: process.platform});		
					}
				}
			));
		} else {
			// Insert track at the top of the history list
			menu.getMenuItemById('history').submenu.insert(2, new MenuItem(
				{
					label: file_object.filePaths[0].split('/')[file_object.filePaths[0].split('/').length-1],
					click: (menuItem, window, event) => {
						// Set the global current song (
						current_song = file_object.filePaths[0].split('/')[file_object.filePaths[0].split('/').length-1];
						// Play the song
						mainWindow.webContents.send('selected_files', {file_path: file_object.filePaths, platform: process.platform});		
					}
				}
			));
		}

		// Add song to history database
		playback_history.unshift({
			"name": file_object.filePaths[0].split('/')[file_object.filePaths[0].split('/').length-1],
			"filepath": file_object.filePaths
		});

		// Update database
		lib_data.update('.data', 'history', playback_history, (err) => {
			if (err) {
				dialog.showErrorBox('Error', `${err}\nError updating playback history database.`);
			}
		});

		// Send back the selected files to the renderer process
		mainWindow.webContents.send('selected_files', {file_path: file_object.filePaths, platform: process.platform});
		
		// Return the song name
		return file_object.filePaths[0].split('/')[file_object.filePaths[0].split('/').length-1]
	}, (err) => {
		dialog.showMessageBox({
			title: 'Error',
			message: 'Failed to pick file due to ' + err + '.',
			buttons: ['Close']
		});
		console.log("Failed to pick file due to: " + err);
	});
}

// MAIN APP
// Create main window
app.on('ready', () => {
	console.log('badonka boadnuoka');
	// Check for playback history database
	let data = lib_data.readSync('.data', 'history'); 
	if (data != null) {
		// Database already exists
		// now we populate the playback history with the songs in the history,json
		console.log('Reading from existing playback histrory.');
		playback_history = JSON.parse(data);

		// Add the songs to init_menu
		init_menu[0].submenu.push({ type: 'separator' });
		playback_history.forEach((song) => {
			init_menu[0].submenu.push({
				label: song.name,
				click: (menuItem, window, event) => {
					// Play the song
					mainWindow.webContents.send('selected_files', {file_path: song.filepath, platform: process.platform});
				}
			});
		});
	} else {
		// Database doesn't exists
		// Create the playback history database
		lib_data.create('.data', 'history', [], (err) => {
			if (err) {
				dialog.showErrorBox('Error', err);
			} else {
				console.log('Playback history database created successfully.');
			}
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
			show: true,
			webPreferences: {nodeIntegration: true},
			enableRemoteModule: false
		}
	); 
	mainWindow.loadFile(__dirname + '/index.html');
	// Open inspector
	// mainWindow.webContents.openDevTools();
	
	// LISTENERS
	// Minimize/Close app to tray
	mainWindow.on('close', (event) => {
		if (!app.isQuitting) {
			event.preventDefault();
			mainWindow.hide();
			// Declare app tray
			if (tray === null) {
				tray = new Tray('/home/choppa2/Code/music-player/tray_icon.png');
				tray.setToolTip('Music Player');
				// Create tray menu with two buttons
				let tray_menu = Menu.buildFromTemplate([{
					// Show the song being played
					label: current_song,
					id: 'song_playing'
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
// Open a file picker dialog
ipcMain.on('pick_file', pick_file);
// Change the label showing which song is playing when a new song is played
ipcMain.on('set_current_song', (event, data) => {
	console.log('The current song name is: '); console.log(data);
	current_song = data;
	if (tray != null) {
		// Set a new menu with a label showing the currently playing song
		let tray_menu = Menu.buildFromTemplate([{
			// Show the song being played
			label: current_song,
			id: 'song_playing'
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
				app.isQuitting = true;
				tray.destroy();
				tray = null;
				app.quit();
			}
		}]);
		// Set tray menu
		tray.setContextMenu(tray_menu);
		// Set tooltip
		tray.setToolTip('Music Player');
	}
});
