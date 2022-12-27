# !/usr/bin/python

import os
import re

songs = []


def addSong(path):
    if path.endswith('.mp3'):
        # Special chars weren't working
        # There's a better way to do this but this works for now
        specialChars = [x for x in path if x.isalnum() is not True and x not in ['/', '-', '_', ' ', '[', ']', '(', ')', ',', "'", '.', '&', '!', '$']]
        if specialChars:
          print('Path: {} is not valid.'.format(path))
          print('Contains special chars {}'.format(specialChars))
        else:
          songs.append({
              "name": path.split('.mp3')[0].split('/')[-1],
              "artist": "",
              "album": "",
              "url": path,
              "cover_art_url": ""
          })

for root, folders, files in os.walk("music", topdown=False):
    for name in files:
        addSong(os.path.join(root, name))

# Create the music/player file
javascript = ''

javascript += '''function shuffle(array) {
  let currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

Amplitude.init({
    "bindings": {
      // Not using arrows since they are easy to hit
      221: 'prev', // ]
      220: 'next', // \
      32: 'play_pause'
    },
    "songs": shuffle('''

# Add the songs from music
javascript += "{}".format(songs)
javascript += ''')
  });

  window.onkeydown = function(e) {
      return !(e.keyCode == 32);
  };

  /*
    Handles a click on the song played progress bar.
  */
  document.getElementById('song-played-progress').addEventListener('click', function( e ){
    let offset = this.getBoundingClientRect();
    let x = e.pageX - offset.left;

    Amplitude.setSongPlayedPercentage( ( parseFloat( x ) / parseFloat( this.offsetWidth) ) * 100 );
  });
'''

# Make dir
try:
    os.mkdir('music')
except FileExistsError:
    pass

# Write the javascript to file with the songs
with open("music/player.js", "w") as file:
    file.write(javascript)
