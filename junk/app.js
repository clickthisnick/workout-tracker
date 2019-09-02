// EDITING STARTS HERE (you dont need to edit anything above this line)

var db = new PouchDB('workout');
var remoteCouch = false;


function startWorkout(text) {
    const workout = {
      _id: new Date().toISOString(),
      title: text,
      completed: false
    };

    db.put(workout, function callback(err, result) {
      if (!err) {
        console.log('Successfully created a new workout!');
      }
    });
  }
