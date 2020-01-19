const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem } = require('electron');

// Declare app's windows
let mainWindow;

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
	menu = Menu.buildFromTemplate(init_menu);
	Menu.setApplicationMenu(menu);
	mainWindow = new BrowserWindow(
		{
			width: 500,
			height: 300,
			show: true,
			webPreferences: {nodeIntegration: true},
			enableRemoteModule: false
		}
	); 
	mainWindow.loadFile(__dirname + '/index.html');
	//mainWindow.webContents.openDevTools();
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
					mainWindow.webContents.send('selected_files', file_object.filePaths);		
				}
			}
		));
		// Send back the selected files to the renderer process
		event.reply('selected_files', file_object.filePaths);
	}, (err) => {
		dialog.showMessageBox({
			title: 'Error',
			message: 'Failed to pick file due to ' + err + '.',
			buttons: ['Close']
		});
		console.log("Failed to pick file due to: " + err);
	});
});
