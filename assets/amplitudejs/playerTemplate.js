function shuffle(array) {
  let currentIndex = array.length; let temporaryValue; let randomIndex;

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
  // If you want to skip songs just drag to 0 seconds left
  'bindings': {
    // Left Arrow
    // 37: 'prev',

    // Right Arrow
    // 39: 'next',
    32: 'play_pause',
  },
  // Put generateMusic.py songs below..
  'songs': shuffle(),
});

window.onkeydown = function(e) {
  return !(e.keyCode == 32);
};

/*
    Handles a click on the song played progress bar.
  */
document.getElementById('song-played-progress').addEventListener('click', function( e ) {
  const offset = this.getBoundingClientRect();
  const x = e.pageX - offset.left;

  Amplitude.setSongPlayedPercentage( ( parseFloat( x ) / parseFloat( this.offsetWidth) ) * 100 );
});
