/*
 * Main script for the renderer process
 * aka Javascript in the browser
*/

// Getting the ipc and remote
// Allows this file to communicate with main.js and run main processes from this renderer
const { ipcRenderer} = require('electron');

// Open the song picker
document.querySelector('#filepicker').addEventListener('click', (event) => {
  // Change focus to the audio player again
  document.querySelector('#player').focus();
  // Prevent from refreshing the site on a form submit
  event.preventDefault();
  // Sends the file path to the main process
  ipcRenderer.send('pick_file');
});

// IpcRenderer is basically Electron's helper for in-browser Javascript
// Manipulate the DOM easily with it 

// LISTENERS
// Receive the music file chosen and play it
ipcRenderer.on('selected_files', (event, data) => {
  // Receive back an array (or Object sometimes) of files chosen from the main process 
  let file_path = data.file_path[0];
  let file_type = file_path.split('.')[1];
  console.log(file_type + " is the file type.");
  console.log(data[0] + " this is the music file selected.");
  document.querySelector('#player').setAttribute('src', file_path);
  document.querySelector('#player').setAttribute('type', 'audio/' + file_type);
  // Play music
  try {
    document.querySelector('#player').play();
    // Remove directory paths, retain only the song's name
    // Which slashes to remove depends on the platform
    let separtor;
    if (data.platform === 'win32') {
      separator = '\\';
    } else {
      separator = '/';
    }
    document.querySelector('#playing').innerText = file_path.split(separator)[file_path.split(separator).length-1];
    // Send back signal to set current song name
    ipcRenderer.send('set_current_song', file_path.split(separator)[file_path.split(separator).length-1]);
  } catch (err) {
    console.log(err);
    console.log('Failed to play music file. Are you sure the file is a valid music file type?');
    console.log('Please pick another music file.');
  }
});

// Pause the song
ipcRenderer.on('pause_song', (event, data) => {
  console.log('Pause the song');
  document.querySelector('#player').pause();
});
// Continue the song if paused
ipcRenderer.on('continue_song', (event, data) => {
  if (document.querySelector('#player').paused) {
    console.log('Continue the song');
    document.querySelector('#player').play();
  }
});