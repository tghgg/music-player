'use strict';
/*
 * Main script for the renderer process
 * aka Javascript in the browser
*/

// Getting the ipc and remote through nodeIntegration
// Allows this file to communicate with main.js and run main processes from this renderer
const { ipcRenderer } = require('electron');

// Open the song picker
document.querySelector('#filepicker').addEventListener('click', (event) => {
  // Change focus to the audio player again
  document.querySelector('#player').focus();
  // Prevent from refreshing the site on a form submit
  event.preventDefault();
  // Sends the file path to the main process
  ipcRenderer.send('pick_file');
});

// Hide the music player and the choose song button
document.querySelector('#hider').addEventListener('click', (event) => {
  event.preventDefault();

  const main = document.querySelector('.main');
  const nav = document.querySelector('.nav');
  const hider = document.querySelector('#hider');

  // Hide from the audio player down
  // Make it clean like Groove
  !main.classList.contains('hide') ? main.classList.add('hide') : main.classList.remove('hide');
  
  // Center header
  !nav.classList.contains('center') ? nav.classList.add('center') : nav.classList.remove('center');

  hider.innerHTML == '^' ? hider.innerHTML = '^' : hider.innerHTML = 'v';
});

// IpcRenderer is basically Electron's helper for in-browser Javascript
// Manipulate the DOM easily with it

// LISTENERS
// Receive the music file chosen and play it
ipcRenderer.on('selected_files', (event, data) => {
  // Receive back an array (or Object sometimes) of files chosen from the main process
  const file_path = data.file_path[0];
  const file_type = file_path.split('.')[1];
  console.table(data);
  document.querySelector('#player').setAttribute('src', file_path);
  document.querySelector('#player').setAttribute('type', 'audio/' + file_type);
  // Play music
  try {
    document.querySelector('#player').play();
    // Remove directory paths, retain only the song's name
    // Which slashes to remove depends on the platform
    let separator;
    if (data.platform === 'win32') {
      separator = '\\';
    } else {
      separator = '/';
    }
    // Set the current_song to the song name without its extension
    let song_name = file_path.split(separator)[file_path.split(separator).length - 1].split('.');
    song_name.pop();
    song_name = song_name.join('');
    document.querySelector('#playing').innerText = song_name;



    // Send back signal to set current song name
    ipcRenderer.send('set_current_song', song_name);
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
