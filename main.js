const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, Tray } = require('electron');
const process = require('process');
const fs = require('fs');
const lib_data = require('./lib/data.js');
// Declare app's windows
let mainWindow;

// JSON file for song history
let playback_history = [];

// Declare app menus
let menu;
let init_menu = [
	// Show play history and allow user to play a past song
	{
		label: 'History',
		id: 'history',
		submenu: []
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
		role: 'quit'
	}
];

// Create main window
app.on('ready', () => {
	// Create the main app window
	// and set the menu for it
	menu = Menu.buildFromTemplate(init_menu);
	Menu.setApplicationMenu(menu);
	mainWindow = new BrowserWindow(
		{
			width: 800,
			height: 600,
			show: true,
			webPreferences: {nodeIntegration: true},
			enableRemoteModule: false
		}
	); 
	mainWindow.loadFile(__dirname + '/index.html');
	//mainWindow.webContents.openDevTools();
	
	// Check for playback history database
	lib_data.read('.data', 'history', (err, data) => {
		if (!err && data) {
			// Database already exists
			// now we fetch it into the history menu list
			console.log('Reading from existing playback histrory.');
			playback_history = JSON.parse(data);
			console.log(playback_history); 			
		} else {
			// Database doesn't exists
			// Create the playback history database
			lib_data.create('.data', 'history', [{}], (err) => {
			if (err) {
				dialog.showErrorBox('Error', err);
			} else {
				console.log('Playback history database created successfully.');
			}
			});
		}
	});

	// LISTENERS
	// Minimize/Close app to tray
	mainWindow.on('close', (event) => {
		if (!app.isQuitting) {
			event.preventDefault();
			mainWindow.hide();
			// Declare app tray
			let tray = new Tray('/home/choppa2/Code/music-player/tray_icon.png');
			// Create tray menu with two buttons
			let tray_menu = Menu.buildFromTemplate([{
				label: 'Show App',
				click: () => {
					mainWindow.show();
					// Kill tray icon
					tray.destroy();
				}
			}, {
				label: 'Quit',
				click: () => {
					// Kill app and destroy tray icon
					app.isQuitting = true;
					tray.destroy();
					app.quit();
				}
			}]);
			// Set tray menu
			tray.setContextMenu(tray_menu);
		}
	});
});

// Open a file picker dialog
ipcMain.on('pick_file', (event, data) => {
	dialog.showOpenDialog({
		properties: ['openFile']
	}).then((file_object) => {
		// Add song to history
		menu.getMenuItemById('history').submenu.append(new MenuItem(
			{
				label: file_object.filePaths[0].split('/')[file_object.filePaths[0].split('/').length-1],
				click: (menuItem, window, event) => {
					// Play the song
					mainWindow.webContents.send('selected_files', {file_path: file_object.filePaths, platform: process.platform});		
				}
			}
		));

		// Add song to history database (JSON, SQLite, etc.)
		playback_history.push({
			"name": file_object.filePaths[0].split('/')[file_object.filePaths[0].split('/').length-1],
			"filepath": file_object.filePaths[0]
		});
		console.log('New playback history:');
		console.log(playback_history);
		// Update database
		lib_data.update('.data', 'history', playback_history, (err) => {
			if (err) {
				dialog.showErrorBox('Error', `${err}\nError updating playback history database.`);
			}
		});

		// Send back the selected files to the renderer process
		event.reply('selected_files', {file_path: file_object.filePaths, platform: process.platform});
	}, (err) => {
		dialog.showMessageBox({
			title: 'Error',
			message: 'Failed to pick file due to ' + err + '.',
			buttons: ['Close']
		});
		console.log("Failed to pick file due to: " + err);
	});
});
