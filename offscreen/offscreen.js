// offscreen/offscreen.js

// This script is running in the context of the hidden offscreen document.
// It has access to DOM APIs like `new Audio()`.

chrome.runtime.onMessage.addListener((message) => {
  if (message.target === 'offscreen-document' && message.type === 'play-sound') {
    playSound(message.soundFile);
  }
});

function playSound(soundFile) {
  // We can safely use the Audio constructor here.
  const audio = new Audio(chrome.runtime.getURL(soundFile));
  audio.play();
}