const { describe, it } = require('node:test');
const { assert, boot, session, fileFetch } = require('./harness');

function linearSession(extra) {
  return session(
    [
      { name: 'Curl', reps: '10,8', weights: '20,20', times: '' },
      { name: 'Press', reps: '5', weights: '30', times: '' }
    ],
    [
      { name: 'Curl', reps: '', weights: '', times: '' },
      { name: 'Press', reps: '', weights: '', times: '' }
    ],
    extra
  );
}

function oneExercise(previous, current, extra) {
  return session(
    [Object.assign({ name: 'Curl', reps: '10', weights: '20', times: '' }, previous)],
    [Object.assign({ name: 'Curl', reps: '', weights: '', times: '' }, current)],
    extra
  );
}

describe('linear navigation', () => {
  it('keeps reps and weights across next and prev', () => {
    const app = boot(linearSession());
    app.flush();
    assert(app.el('currentExerciseName').value === 'Curl', 'starts on the first exercise');
    app.el('reps').value = '12';
    app.el('weights').value = '25';
    app.sandbox.nextExercise();
    assert(app.param('currentExerciseId') === '1', 'next moves to exercise 2');
    assert(app.el('currentExerciseName').value === 'Press', 'second exercise name is shown');
    assert(app.el('reps').value === '', 'second exercise reps start empty');
    app.el('reps').value = '6';
    app.sandbox.prevExercise();
    assert(app.param('currentExerciseId') === '0', 'prev returns to exercise 1');
    assert(app.el('reps').value === '12', 'reps survive next then prev');
    assert(app.el('weights').value === '25', 'weights survive next then prev');
    app.sandbox.prevExercise();
    assert(app.param('currentExerciseId') === '0', 'prev on the first exercise stays put');
    app.sandbox.nextExercise();
    assert(app.el('reps').value === '6', 'second exercise reps were kept');
  });

  it('appends a blank exercise past the end', () => {
    const app = boot(oneExercise());
    app.flush();
    app.sandbox.nextExercise();
    const workout = app.workout();
    assert(workout.exercises.length === 2, 'a new slot is appended');
    assert(workout.exercises[1].name === '', 'the new slot has an empty name');
    assert(app.param('currentExerciseId') === '1', 'the new slot is current');
    assert(app.el('exerciseCount').textContent === '2 / 2', 'the counter includes the new slot');
  });

  it('persists typed reps through the input listener', () => {
    const app = boot(oneExercise());
    app.flush();
    app.el('reps').value = '12,10';
    const field = app.el('reps');
    field.listeners.filter((entry) => entry.type === 'input').forEach((entry) => entry.fn());
    assert(app.workout().exercises[0].reps === '12,10', 'typing reps is stored');
    assert(app.storage.getItem('wt_in_progress'), 'typing updates the backup');
  });
});

describe('quick buttons', () => {
  it('appends the previous set and starts the timer once per set', () => {
    const app = boot(
      session(
        [{ name: 'Curl', reps: '10,8', weights: '20,15', times: '' }],
        [{ name: 'Curl', reps: '', weights: '', times: '' }]
      )
    );
    app.flush();
    const button = app
      .el('repsQuick')
      .children.find((child) => child.className.indexOf('quick-current') !== -1);
    assert(button, 'previous-value quick button is rendered');
    assert(
      String(button.textContent) === '10',
      `quick button centers on 10, got ${button.textContent}`
    );
    button.click();
    assert(app.el('reps').value === '10', `quick button appends reps, got ${app.el('reps').value}`);
    assert(
      app.el('timer').textContent === '1m 30s',
      `quick button starts the rest timer, got ${app.el('timer').textContent}`
    );
    const timerId = app.intervals[app.intervals.length - 1].id;
    const weight = app
      .el('weightsQuick')
      .children.find((child) => child.className.indexOf('quick-current') !== -1);
    weight.click();
    assert(app.el('weights').value === '20', 'weight quick button appends the previous weight');
    assert(
      app.intervals[app.intervals.length - 1].id === timerId,
      'the matching weight tap does not restart the timer'
    );
  });

  it('drops non-positive suggestions and highlights what you just did', () => {
    const app = boot(
      session(
        [{ name: 'Curl', reps: '1', weights: '5', times: '' }],
        [{ name: 'Curl', reps: '12', weights: '', times: '' }]
      )
    );
    app.flush();
    app.sandbox.url.searchParams.set('repsInc', '5');
    app.sandbox.applySettings();
    app.sandbox.refreshQuickButtons();
    const values = app.el('repsQuick').children.map((child) => String(child.textContent));
    assert(values.indexOf('1') !== -1, `previous value stays, got ${values.join(',')}`);
    assert(
      values.every((value) => Number(value) > 0),
      `no non-positive buttons, got ${values.join(',')}`
    );
    assert(values.length >= 7, `still offers a full row, got ${values.length}`);
    const recent = app
      .el('repsQuick')
      .children.find((child) => child.className.indexOf('quick-recent') !== -1);
    assert(recent && String(recent.textContent) === '12', 'the value just entered is highlighted');
  });
});

describe('rest timer', () => {
  it('beeps once and stops', () => {
    const app = boot(oneExercise(null, null, { timerDefault: '1' }), {
      fakeDate: true,
      now: 1_700_000_000_000
    });
    app.flush();
    const intervalsBefore = app.intervals.length;
    app.sandbox.resetTimer();
    assert(app.intervals.length === intervalsBefore + 1, 'timer starts an interval');
    assert(
      app.el('timer').textContent === '1s',
      `timer shows 1s, got ${app.el('timer').textContent}`
    );
    app.advance(1000);
    app.tick();
    assert(app.beeps() === 1, `timer beeped ${app.beeps()} times`);
    assert(app.el('timer').textContent === '0s', 'timer stops at 0s');
    assert(app.intervals.length === intervalsBefore, 'timer interval is cleared');
    app.advance(1000);
    app.tick();
    assert(app.beeps() === 1, 'a later tick does not beep again');
  });

  it('uses the exercise timer_duration when set', () => {
    const app = boot(
      session(
        [{ name: 'Plank', reps: '', weights: '', times: '', timer_duration: 30 }],
        [{ name: 'Plank', reps: '', weights: '', times: '', timer_duration: 30 }]
      )
    );
    app.flush();
    app.sandbox.resetTimer();
    assert(
      app.el('timer').textContent === '30s',
      `exercise duration, got ${app.el('timer').textContent}`
    );
  });

  it('falls back to a tone when the embedded beep cannot play', async () => {
    const app = boot(oneExercise(null, null, { timerDefault: '1' }), {
      fakeDate: true,
      now: 1_700_000_000_000,
      audioFails: true
    });
    app.flush();
    app.sandbox.resetTimer();
    app.advance(1000);
    app.tick();
    await app.settle();
    assert(app.beeps() === 0, 'the file beep did not count as played');
    assert(app.oscillators() >= 1, 'a synthesized tone played instead');
    assert(app.el('status').textContent === 'Rest timer finished.', 'finish is announced');
  });

  it('save time appends the elapsed seconds', () => {
    const app = boot(oneExercise(), { fakeDate: true, now: 1_700_000_000_000 });
    app.flush();
    app.sandbox.resetTimer();
    app.advance(12500);
    app.sandbox.saveTime();
    assert(app.el('times').value === '12', `saved seconds, got ${app.el('times').value}`);
    app.advance(3000);
    app.sandbox.saveTime();
    assert(app.el('times').value === '12,15', `second save appends, got ${app.el('times').value}`);
  });
});

describe('circuits', () => {
  function circuitBoot(extra) {
    return boot(
      session(
        [
          { name: 'Cable Squats', reps: '10,10,10', weights: '12,12,12' },
          { name: 'Push-Ups', reps: '12,12,12', weights: '12,12,12' }
        ],
        [
          { name: 'Cable Squats', reps: '', weights: '', times: '' },
          { name: 'Push-Ups', reps: '', weights: '', times: '' }
        ],
        Object.assign({ circuit: '1', sets: '3', currentRound: '0' }, extra)
      )
    );
  }

  function rows(app) {
    return app.el('circuitRounds').children.filter((child) => child.className === 'circuit-row');
  }

  it('keeps round values across next and prev and only times the next round', () => {
    const app = circuitBoot({
      sets: '4',
      weightInc: '2.5',
      repsInc: '2',
      timerDefault: '45',
      currentRound: '1'
    });
    app.flush();
    app.sandbox.saveInProgressState();
    const saved = JSON.parse(app.storage.getItem('wt_in_progress'));
    assert(saved.circuit === '1', 'backup stores circuit');
    assert(saved.sets === '4', 'backup stores sets');
    assert(saved.weightInc === '2.5', 'backup stores weightInc');
    assert(saved.timerDefault === '45', 'backup stores timerDefault');
    assert(saved.currentRound === '1', 'backup stores the round');

    const restored = boot('', { storage: { wt_in_progress: JSON.stringify(saved) } });
    restored.flush();
    assert(restored.param('circuit') === '1', 'restore keeps circuit mode');
    assert(restored.param('sets') === '4', 'restore keeps sets');
    assert(restored.param('weightInc') === '2.5', 'restore keeps weightInc');
    assert(restored.param('timerDefault') === '45', 'restore keeps timerDefault');
    assert(restored.param('currentRound') === '1', 'restore keeps the round');
    assert(restored.el('workout').hidden === false, 'restored session is showing');
    assert(restored.el('circuitView').hidden === false, 'circuit panel is showing');
    assert(restored.el('linearView').hidden === true, 'linear panel is hidden for a circuit');
    restored.sandbox.circuitNextRound();
    assert(restored.param('currentRound') === '2', 'next round advances');
    assert(
      restored.el('timer').textContent === '45s',
      `finishing a round starts the rest timer, got ${restored.el('timer').textContent}`
    );
    const running = restored.intervals.length;
    restored.sandbox.circuitPrevRound();
    assert(restored.param('currentRound') === '1', 'prev round goes back');
    assert(restored.intervals.length < running, 'prev round does not leave the rest timer running');
  });

  it('keeps each round when moving next then back', () => {
    const app = circuitBoot();
    app.flush();
    rows(app)[0].querySelector('input.circuit-reps').value = '15';
    rows(app)[0].querySelector('input.circuit-weights').value = '20';
    rows(app)[1].querySelector('input.circuit-reps').value = '18';
    rows(app)[1].querySelector('input.circuit-weights').value = '22';
    app.sandbox.circuitNextRound();
    rows(app)[0].querySelector('input.circuit-reps').value = '16';
    rows(app)[0].querySelector('input.circuit-weights').value = '21';
    rows(app)[1].querySelector('input.circuit-reps').value = '19';
    rows(app)[1].querySelector('input.circuit-weights').value = '23';
    app.sandbox.circuitNextRound();
    app.sandbox.circuitPrevRound();
    const saved = app.workout();
    assert(saved.exercises[0].reps === '15,16,', `squat reps, got ${saved.exercises[0].reps}`);
    assert(
      saved.exercises[0].weights === '20,21,',
      `squat weights, got ${saved.exercises[0].weights}`
    );
    assert(saved.exercises[1].reps === '18,19,', `push-up reps, got ${saved.exercises[1].reps}`);
    assert(
      saved.exercises[1].weights === '22,23,',
      `push-up weights, got ${saved.exercises[1].weights}`
    );
  });

  it('shows a water break when the rest timer finishes', () => {
    const app = boot(
      session(
        [
          { name: 'Cable Squats', reps: '10', weights: '12' },
          { name: 'Push-Ups', reps: '12', weights: '12' }
        ],
        [
          { name: 'Cable Squats', reps: '', weights: '', times: '' },
          { name: 'Push-Ups', reps: '', weights: '', times: '' }
        ],
        { circuit: '1', sets: '3', timerDefault: '1' }
      ),
      { fakeDate: true, now: 1_700_000_000_000 }
    );
    app.flush();
    app.sandbox.resetTimer();
    app.advance(1000);
    app.tick();
    assert(
      app.el('circuitWaterBanner').className.indexOf('visible') !== -1,
      'water break is shown at zero'
    );
    app.sandbox.dismissWaterBanner();
    assert(
      app.el('circuitWaterBanner').className.indexOf('visible') === -1,
      'dismiss hides the water break'
    );
  });
});

describe('saving', () => {
  it('filters empty exercises, clears the backup, and explains a missing email', () => {
    const withEmail = boot(
      session(
        [{ name: 'Curl', reps: '10', weights: '20', times: '' }],
        [
          { name: 'Curl', reps: '11', weights: '22', times: '' },
          { name: '', reps: '', weights: '', times: '' }
        ]
      )
    );
    withEmail.flush();
    withEmail.storage.setItem('wt_in_progress', '{"name":"Arms"}');
    withEmail.sandbox.saveWorkout();
    withEmail.sandbox.persistCurrentState();
    const savedWorkout = withEmail.workout();
    assert(savedWorkout.exercises.length === 1, 'empty-name exercises are dropped');
    assert(savedWorkout.exercises[0].name === 'Curl', 'named exercise is kept');
    assert(savedWorkout.endMilliseconds > 0, 'save stamps endMilliseconds');
    assert(
      withEmail.storage.getItem('wt_in_progress') == null,
      'save clears the in-progress backup'
    );
    assert(
      withEmail.anchors.length === 1 &&
        withEmail.anchors[0].href.indexOf('mailto:me@example.com') === 0,
      'email draft is addressed'
    );
    assert(withEmail.sandbox.copied.length === 1, 'entry is copied');
    assert(
      withEmail.el('status').textContent.indexOf('Email drafted') !== -1,
      'save status is announced'
    );
    assert(
      withEmail.session.getItem('wt_last_saved').indexOf('Curl') !== -1,
      'the paste block is remembered for a reload'
    );

    const noEmail = boot(
      session(
        [{ name: 'Curl', reps: '10', weights: '20', times: '' }],
        [{ name: 'Curl', reps: '11', weights: '22', times: '' }],
        { email: null }
      )
    );
    noEmail.flush();
    noEmail.sandbox.saveWorkout();
    assert(noEmail.anchors.length === 0, 'missing email does not open a mailto draft');
    assert(
      noEmail.el('status').textContent.indexOf('?email=') !== -1,
      'missing email is explained'
    );
    assert(noEmail.sandbox.copied.length === 1, 'missing email still copies the entry');
    assert(noEmail.storage.getItem('wt_in_progress') == null, 'backup stays cleared after persist');
  });

  it('copies with the textarea fallback when the clipboard API is missing', () => {
    const app = boot(oneExercise(), { clipboard: false });
    app.flush();
    app.el('reps').value = '8';
    app.sandbox.saveWorkout();
    assert(
      app.el('savePayload').textContent.indexOf('"reps":"8"') !== -1,
      'the paste block is shown'
    );
    assert(
      app.el('status').textContent.indexOf('Email drafted') !== -1,
      'save still drafts the email'
    );
  });

  it('does not resume a workout that was already saved', () => {
    const params = new URLSearchParams(oneExercise());
    const current = JSON.parse(params.get('currentWorkout'));
    current.endMilliseconds = 50;
    params.set('currentWorkout', JSON.stringify(current));
    const app = boot(params.toString(), { session: { wt_last_saved: '// remembered' } });
    assert(app.el('workout').hidden === true, 'a finished session returns to the picker');
    assert(
      app.el('topStatus').textContent.indexOf('already saved') !== -1,
      'the saved state is explained'
    );
    assert(
      app.el('savePayload').textContent === '// remembered',
      'the remembered paste block is shown'
    );
    assert(app.storage.getItem('wt_in_progress') == null, 'the backup is not kept');
  });
});

describe('boot and picker', () => {
  it('shows never for an unfinished previous session and the live duration', () => {
    const params = new URLSearchParams(
      oneExercise(
        { name: 'Toe touch', reps: '', weights: '', times: '' },
        { name: 'Toe touch', reps: '', weights: '', times: '' }
      )
    );
    const previousWorkout = JSON.parse(params.get('previousWorkout'));
    previousWorkout.endMilliseconds = 0;
    previousWorkout.startMilliseconds = 0;
    params.set('previousWorkout', JSON.stringify(previousWorkout));
    const currentWorkout = JSON.parse(params.get('currentWorkout'));
    currentWorkout.startMilliseconds = Date.now() - 90 * 60 * 1000;
    params.set('currentWorkout', JSON.stringify(currentWorkout));
    const app = boot(params.toString());
    app.flush();
    assert(
      app.el('workoutLastCompleted').textContent === 'Last Date: never',
      `never-completed date, got ${app.el('workoutLastCompleted').textContent}`
    );
    assert(
      app.el('workoutCurrentDuration').textContent.indexOf('90m') !== -1,
      `current time should include 90m, got ${app.el('workoutCurrentDuration').textContent}`
    );
  });

  it('drops a malformed link and keeps email and settings', () => {
    const app = boot(
      'name=Broken&email=me@example.com&weightInc=2.5&currentWorkout=%7Bbad&previousWorkout=%7Bbad'
    );
    assert(
      app.el('topStatus').textContent.indexOf('Could not read') !== -1,
      `malformed state status, got ${app.el('topStatus').textContent}`
    );
    assert(app.el('workout').hidden === true, 'malformed state returns to the picker');
    assert(app.param('name') == null, 'malformed workout params are dropped');
    assert(app.param('email') === 'me@example.com', 'email is kept after a bad link');
    assert(app.param('weightInc') === '2.5', 'settings are kept after a bad link');
  });

  it('ignores the Choose a workout placeholder', () => {
    const app = boot('');
    app.el('selectWorkout').value = '';
    app.sandbox.selectWorkout();
    assert(app.param('name') == null, 'placeholder does not start a workout');
    assert(app.el('workout').hidden === true, 'picker stays up');
    app.el('selectWorkout').value = 'Choose a workout';
    app.sandbox.selectWorkout();
    assert(app.param('name') == null, 'the placeholder label does not start a workout');
  });

  it('home keeps email and settings and can be cancelled', () => {
    const search = session(
      [{ name: 'Curl', reps: '10', weights: '20', times: '' }],
      [{ name: 'Curl', reps: '', weights: '', times: '' }],
      { weightInc: '2.5', repsInc: '2', timerDefault: '60', circuit: '1' }
    );
    const cancelled = boot(search, { confirm: () => false });
    cancelled.flush();
    cancelled.storage.setItem('wt_in_progress', '{"name":"Arms"}');
    cancelled.sandbox.goHome();
    assert(cancelled.param('name') === 'Arms', 'cancelling Home keeps the workout');
    assert(
      cancelled.storage.getItem('wt_in_progress') === '{"name":"Arms"}',
      'cancelling Home keeps the backup'
    );

    const app = boot(search, { confirm: () => true });
    app.flush();
    app.storage.setItem('wt_in_progress', '{"name":"Arms"}');
    app.sandbox.goHome();
    assert(app.param('name') == null, 'Home drops the routine');
    assert(app.param('circuit') == null, 'Home drops circuit');
    assert(app.param('currentWorkout') == null, 'Home drops the session');
    assert(app.param('email') === 'me@example.com', 'Home keeps email');
    assert(app.param('weightInc') === '2.5', 'Home keeps weightInc');
    assert(app.param('repsInc') === '2', 'Home keeps repsInc');
    assert(app.param('timerDefault') === '60', 'Home keeps timerDefault');
    assert(app.storage.getItem('wt_in_progress') == null, 'Home clears the backup');
    assert(app.el('workout').hidden === true, 'Home shows the picker');
  });

  it('prefers the local backup for the same routine and ignores a different one', () => {
    const stale = oneExercise();
    const backup = JSON.parse(
      JSON.stringify({
        name: 'Arms',
        file: 'home_cable_arm.json',
        circuit: '0',
        sets: '3',
        currentExerciseId: '0',
        currentRound: '0',
        email: 'me@example.com',
        weightInc: '5',
        repsInc: '1',
        timerDefault: '90',
        previousWorkout: new URLSearchParams(stale).get('previousWorkout'),
        currentWorkout: JSON.stringify({
          startMilliseconds: 1,
          endMilliseconds: 0,
          exercises: [{ name: 'Curl', reps: '9', weights: '19', times: '' }]
        })
      })
    );
    const restored = boot(stale, { storage: { wt_in_progress: JSON.stringify(backup) } });
    restored.flush();
    assert(restored.el('reps').value === '9', `backup reps win, got ${restored.el('reps').value}`);

    const other = boot(
      'name=Stretch&file=stretch.json&currentWorkout=' +
        encodeURIComponent(
          JSON.stringify({
            startMilliseconds: 1,
            endMilliseconds: 0,
            exercises: [{ name: 'Toe touch', reps: '1', weights: '', times: '' }]
          })
        ) +
        '&previousWorkout=' +
        encodeURIComponent(
          JSON.stringify({
            startMilliseconds: 1,
            endMilliseconds: 1,
            exercises: [{ name: 'Toe touch', reps: '1', weights: '', times: '' }]
          })
        ),
      { storage: { wt_in_progress: JSON.stringify(backup) } }
    );
    other.flush();
    assert(other.param('file') === 'stretch.json', 'a different routine in the URL is kept');
    assert(other.el('currentExerciseName').value === 'Toe touch', 'the URL routine is shown');
  });

  it('discards a backup that cannot be resumed', () => {
    const app = boot('', {
      storage: { wt_in_progress: '{"name":"Arms","currentWorkout":"{","previousWorkout":"{"}' }
    });
    assert(app.storage.getItem('wt_in_progress') == null, 'a broken backup is removed');
    assert(app.el('workout').hidden === true, 'the picker stays up');
  });
});

describe('routines on disk', () => {
  it('strips comment lines before parsing', () => {
    const app = boot('');
    const data = app.sandbox.parseJsonWithComments('{\n// note\n"name": "Arms"\n}');
    assert(data.name === 'Arms', 'comment lines are ignored');
  });

  it('starts a routine from the picker and uses the cache when offline', async () => {
    const online = boot('', { fetch: fileFetch });
    await online.sandbox.loadWorkoutOptions();
    const select = online.el('selectWorkout');
    const match = select.options.find((option) => option.value === 'home_cable_abs.json');
    assert(match && match.textContent === 'Abs', `picker label, got ${match && match.textContent}`);
    select.value = 'home_cable_abs.json';
    online.sandbox.selectWorkout();
    await online.settle();
    assert(online.param('name') === 'Abs', 'the routine name comes from the file');
    assert(online.param('file') === 'home_cable_abs.json', 'the routine file is recorded');
    assert(online.el('workout').hidden === false, 'the workout view opens');
    assert(online.storage.getItem('wt_cache_routine_home_cable_abs.json'), 'the routine is cached');

    const cache = {
      wt_cache_active: online.storage.getItem('wt_cache_active'),
      'wt_cache_routine_home_cable_abs.json': online.storage.getItem(
        'wt_cache_routine_home_cable_abs.json'
      )
    };
    const offline = boot('', { storage: cache });
    await offline.sandbox.loadWorkoutOptions();
    assert(
      offline.el('topStatus').textContent.indexOf('Offline') !== -1,
      'offline status is shown'
    );
    const again = offline
      .el('selectWorkout')
      .options.find((option) => option.value === 'home_cable_abs.json');
    assert(again && again.textContent === 'Abs', 'the cached list still has labels');
  });
});

describe('settings', () => {
  it('apply writes the URL and done discards edits', () => {
    const app = boot(oneExercise());
    app.flush();
    app.sandbox.toggleEditMode();
    assert(app.param('settings') === '1', 'settings opens');
    assert(app.el('editPanel').hidden === false, 'the settings panel is shown');
    assert(
      app.el('mainContent').hidden === true,
      'the exercise view hides while settings are open'
    );
    app.el('cfgWeightInc').value = '2.5';
    app.el('cfgRepsInc').value = '2';
    app.el('cfgTimerDefault').value = '45';
    app.sandbox.applyEditPanel();
    assert(app.param('settings') == null, 'apply closes settings');
    assert(app.param('weightInc') === '2.5', 'weight increment is stored');
    assert(app.param('repsInc') === '2', 'reps increment is stored');
    assert(app.param('timerDefault') === '45', 'timer default is stored');
    app.sandbox.resetTimer();
    assert(app.el('timer').textContent === '45s', 'the new timer default is used');

    app.sandbox.toggleEditMode();
    app.el('cfgWeightInc').value = '99';
    app.sandbox.toggleEditMode();
    assert(app.param('weightInc') === '2.5', 'done does not apply the edit');
  });
});

describe('WebMCP', () => {
  function context() {
    const registered = [];
    return {
      registered,
      modelContext: {
        registerTool(tool) {
          registered.push({ name: tool.name, annotations: tool.annotations, tool });
          return Promise.resolve();
        }
      }
    };
  }

  it('registers picker and linear tools and validates input', () => {
    const picker = context();
    boot('', { modelContext: picker.modelContext });
    const pickerNames = picker.registered.map((entry) => entry.name);
    assert(pickerNames.indexOf('choose-routine') !== -1, 'picker exposes choose-routine');
    assert(
      pickerNames.indexOf('log-current-exercise') === -1,
      'picker does not expose exercise logging'
    );
    const choose = picker.registered.find((entry) => entry.name === 'choose-routine');
    const missing = choose.tool.execute({ file: 'nope.json' }, { signal: { aborted: false } });
    assert(
      missing && missing.error && missing.error.indexOf('No routine file') !== -1,
      `choose-routine error, got ${JSON.stringify(missing)}`
    );

    const linearCtx = context();
    const linear = boot(oneExercise(), { modelContext: linearCtx.modelContext });
    linear.flush();
    const names = linearCtx.registered.map((entry) => entry.name);
    assert(names.indexOf('read-workout-state') !== -1, 'linear mode exposes read-workout-state');
    assert(names.indexOf('go-to-next-round') === -1, 'linear mode does not expose circuit rounds');
    const readTool = linearCtx.registered
      .filter((entry) => entry.name === 'read-workout-state')
      .pop();
    assert(readTool.annotations.readOnlyHint === true, 'read-workout-state is marked read-only');
    const state = readTool.tool.execute({}, { signal: { aborted: false } });
    assert(state.view === 'linear', `read view, got ${state.view}`);
    const logTool = linearCtx.registered
      .filter((entry) => entry.name === 'log-current-exercise')
      .pop();
    const empty = logTool.tool.execute({}, { signal: { aborted: false } });
    assert(
      empty.error && empty.error.indexOf('Pass name') !== -1,
      `log validation, got ${JSON.stringify(empty)}`
    );
    const wrote = logTool.tool.execute({ reps: '12,10' }, { signal: { aborted: false } });
    assert(
      wrote.exercise && wrote.exercise.reps === '12,10',
      `logged reps, got ${JSON.stringify(wrote)}`
    );
    const badType = logTool.tool.execute({ reps: 12 }, { signal: { aborted: false } });
    assert(badType.error && badType.error.indexOf('string') !== -1, 'reps must be a string');
    const discard = linearCtx.registered.filter((entry) => entry.name === 'discard-workout').pop();
    assert(discard.annotations.consequentialHint === true, 'discard is marked consequential');
    const unconfirmed = discard.tool.execute({ confirmed: false }, { signal: { aborted: false } });
    assert(
      unconfirmed.error && unconfirmed.error.indexOf('confirmed: true') !== -1,
      'discard requires confirmation'
    );
    const cancelled = readTool.tool.execute({}, { signal: { aborted: true } });
    assert(cancelled.error === 'Cancelled.', 'an aborted call is refused');
  });

  it('logs a circuit round and updates settings', () => {
    const ctx = context();
    const app = boot(
      session(
        [
          { name: 'Cable Squats', reps: '10,10,10', weights: '12,12,12' },
          { name: 'Push-Ups', reps: '12,12,12', weights: '12,12,12' }
        ],
        [
          { name: 'Cable Squats', reps: '', weights: '', times: '' },
          { name: 'Push-Ups', reps: '', weights: '', times: '' }
        ],
        { circuit: '1', sets: '3' }
      ),
      { modelContext: ctx.modelContext }
    );
    app.flush();
    const log = ctx.registered.filter((entry) => entry.name === 'log-circuit-round').pop();
    const wrote = log.tool.execute(
      { exerciseIndex: 0, reps: '15', level: '20' },
      { signal: { aborted: false } }
    );
    assert(wrote.round && wrote.round.index === 0, 'still on round 0');
    assert(app.workout().exercises[0].reps.split(',')[0] === '15', 'circuit reps were written');
    const bad = log.tool.execute({ exerciseIndex: 1.5 }, { signal: { aborted: false } });
    assert(bad.error && bad.error.indexOf('integer') !== -1, 'exerciseIndex must be an integer');
    const settings = ctx.registered.filter((entry) => entry.name === 'update-settings').pop();
    const updated = settings.tool.execute({ timerDefault: 30 }, { signal: { aborted: false } });
    assert(updated.settings.timerDefault === 30, 'settings tool writes the timer');
    const rejected = settings.tool.execute({ weightInc: 0 }, { signal: { aborted: false } });
    assert(
      rejected.error && rejected.error.indexOf('weightInc') !== -1,
      'a non-positive increment is rejected'
    );
    const next = ctx.registered.filter((entry) => entry.name === 'go-to-next-round').pop();
    const moved = next.tool.execute({}, { signal: { aborted: false } });
    assert(moved.round.index === 1, 'next round tool advances');
  });
});
