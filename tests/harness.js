const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { install } = require('../src/app.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function memoryStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    }
  };
}

/**
 * @param {any[]} previousExercises
 * @param {any[]} currentExercises
 * @param {Record<string, any> | null} [extra]
 */
function session(previousExercises, currentExercises, extra) {
  const previous = {
    startMilliseconds: 1,
    endMilliseconds: 1000,
    exercises: previousExercises
  };
  const current = {
    startMilliseconds: 1_700_000_000_000,
    endMilliseconds: 0,
    exercises: currentExercises
  };
  const params = new URLSearchParams();
  params.set('name', 'Arms');
  params.set('file', 'home_cable_arm.json');
  params.set('circuit', '0');
  params.set('sets', '3');
  params.set('currentExerciseId', '0');
  params.set('currentRound', '0');
  params.set('previousWorkout', JSON.stringify(previous));
  params.set('currentWorkout', JSON.stringify(current));
  params.set('email', 'me@example.com');
  params.set('weightInc', '5');
  params.set('repsInc', '1');
  params.set('timerDefault', '90');
  if (extra) {
    Object.keys(extra).forEach((key) => {
      if (extra[key] == null) params.delete(key);
      else params.set(key, String(extra[key]));
    });
  }
  return params.toString();
}

function fileFetch(url) {
  const pathname = new URL(url, 'http://localhost').pathname;
  const file = path.normalize(path.join(root, pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return Promise.resolve({ ok: false, status: 404, text: async () => '' });
  }
  return Promise.resolve({
    ok: true,
    status: 200,
    text: async () => fs.readFileSync(file, 'utf8')
  });
}

/**
 * Boot the page against an in-memory window.
 * @param {string} [search]
 * @param {any} [options]
 */
function boot(search, options) {
  const opts = options || {};
  const storage = memoryStorage(opts.storage);
  const sessionStore = memoryStorage(opts.session);
  const elMap = {};
  const anchors = [];
  const intervals = [];
  const timeouts = [];
  const documentListeners = [];
  let intervalId = 1;
  let beeps = 0;
  let oscillators = 0;
  let now = opts.now == null ? 1_700_000_000_000 : opts.now;
  const RealDate = Date;

  function makeEl(tag) {
    const el = {
      tag: tag || 'div',
      style: {},
      value: '',
      textContent: '',
      checked: false,
      disabled: false,
      className: '',
      dataset: {},
      placeholder: '',
      inputMode: '',
      type: '',
      hidden: false,
      id: '',
      title: '',
      open: false,
      children: [],
      options: [{}, {}],
      selectedIndex: 0,
      attributes: {},
      playCount: 0,
      clicked: false,
      href: '',
      listeners: [],
      parentElement: null,
      appendChild(child) {
        this.children.push(child);
        child.parentElement = this;
        if (this.id === 'selectWorkout' && child.tag === 'option') this.options.push(child);
        return child;
      },
      addEventListener(type, fn) {
        this.listeners.push({ type, fn });
      },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
        if (name === 'data-testid') this.dataset.testid = String(value);
        if (name === 'data-value') this.dataset.value = String(value);
      },
      getAttribute(name) {
        return this.attributes[name];
      },
      querySelector(sel) {
        return this.children.find((child) => `input.${child.className}` === sel) || null;
      },
      closest(sel) {
        let node = this;
        while (node) {
          if (sel === 'button' && node.tag === 'button') return node;
          if (sel.charAt(0) === '#' && node.id === sel.slice(1)) return node;
          node = node.parentElement;
        }
        return null;
      },
      focus() {
        el.focused = true;
      },
      select() {},
      remove() {},
      pause() {},
      play() {
        this.playCount += 1;
        if (opts.audioFails) return Promise.reject(new Error('audio failed'));
        beeps += 1;
        return Promise.resolve();
      },
      click() {
        this.clicked = true;
        if (typeof this.onclick === 'function') this.onclick();
      }
    };
    let html = '';
    Object.defineProperty(el, 'innerHTML', {
      get() {
        return html;
      },
      set(value) {
        html = String(value);
        el.children = [];
      }
    });
    el.classList = {
      add(name) {
        el.className = `${el.className} ${name}`.trim();
      },
      remove(name) {
        el.className = el.className
          .split(/\s+/)
          .filter((part) => part && part !== name)
          .join(' ');
      }
    };
    return el;
  }

  function getEl(id) {
    if (!elMap[id]) {
      elMap[id] = makeEl(id === 'beepSound' ? 'audio' : 'div');
      if (id === 'workout' || id === 'circuitView' || id === 'editPanel' || id === 'saveDetails') {
        elMap[id].hidden = true;
      }
      if (id === 'selectWorkout') elMap[id].tag = 'select';
    }
    elMap[id].id = id;
    if (id === 'circuitRounds' && !elMap[id].parentElement) {
      elMap[id].parentElement = getEl('circuitView');
    }
    return elMap[id];
  }

  /**
   * @param {number} [value]
   */
  function FakeDate(value) {
    if (!new.target) return value == null ? new RealDate() : new RealDate(value);
    return value == null ? new RealDate(now) : new RealDate(value);
  }
  FakeDate.now = () => now;
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  FakeDate.prototype = RealDate.prototype;

  function AudioContext() {
    return {
      state: 'running',
      currentTime: 0,
      destination: {},
      resume() {},
      createOscillator() {
        oscillators += 1;
        return {
          frequency: { value: 0 },
          connect() {
            return this;
          },
          start() {},
          stop() {}
        };
      },
      createGain() {
        return {
          gain: {
            value: 0,
            setValueAtTime() {},
            exponentialRampToValueAtTime() {}
          },
          connect() {
            return this;
          }
        };
      }
    };
  }

  const href = `http://localhost/?${search || ''}`;
  const sandbox = {
    console,
    URL,
    URLSearchParams,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    parseInt,
    parseFloat,
    isNaN,
    Intl,
    Promise,
    RegExp,
    Error,
    decodeURIComponent,
    encodeURIComponent,
    Date: opts.fakeDate ? FakeDate : RealDate,
    location: { href, search: search ? `?${search}` : '', protocol: 'http:' },
    history: { replaceState() {}, pushState() {} },
    document: {
      title: '',
      body: makeEl('body'),
      getElementById: getEl,
      querySelectorAll(sel) {
        const found = [];
        function walk(node) {
          (node.children || []).forEach((child) => {
            found.push(child);
            walk(child);
          });
        }
        Object.keys(elMap).forEach((id) => walk(elMap[id]));
        if (sel === '.circuit-row') {
          return found.filter((node) => node.className.split(/\s+/).includes('circuit-row'));
        }
        return [];
      },
      createElement(tag) {
        const el = makeEl(tag);
        if (tag === 'a') anchors.push(el);
        return el;
      },
      addEventListener(type, fn, capture) {
        documentListeners.push({ type, fn, capture });
      },
      execCommand() {
        return opts.copyCommand !== false;
      }
    },
    navigator: {
      clipboard:
        opts.clipboard === false
          ? undefined
          : {
              writeText(text) {
                sandbox.copied.push(text);
                return Promise.resolve();
              }
            }
    },
    localStorage: storage,
    sessionStorage: sessionStore,
    fetch: opts.fetch || (() => Promise.resolve({ ok: false, status: 404, text: async () => '' })),
    AudioContext,
    webkitAudioContext: AudioContext,
    AbortController,
    confirm: opts.confirm == null ? () => true : opts.confirm,
    setTimeout(fn) {
      timeouts.push(fn);
      return timeouts.length;
    },
    clearTimeout() {},
    setInterval(fn) {
      const id = intervalId++;
      intervals.push({ id, fn });
      return id;
    },
    clearInterval(id) {
      const index = intervals.findIndex((entry) => entry.id === id);
      if (index >= 0) intervals.splice(index, 1);
    }
  };
  sandbox.copied = [];
  if (opts.modelContext) sandbox.document.modelContext = opts.modelContext;
  install(sandbox);

  return {
    sandbox,
    el: getEl,
    anchors,
    storage,
    session: sessionStore,
    timeouts,
    intervals,
    beeps: () => beeps,
    oscillators: () => oscillators,
    advance(ms) {
      now += ms;
    },
    tick() {
      intervals.slice().forEach((entry) => entry.fn());
    },
    flush() {
      const queued = timeouts.splice(0, timeouts.length);
      queued.forEach((fn) => fn());
    },
    async settle() {
      await new Promise((resolve) => setImmediate(resolve));
    },
    fire(type, target) {
      documentListeners
        .filter((entry) => entry.type === type)
        .forEach((entry) => entry.fn({ target }));
    },
    param(name) {
      return sandbox.url.searchParams.get(name);
    },
    workout() {
      return JSON.parse(sandbox.url.searchParams.get('currentWorkout'));
    }
  };
}

module.exports = { assert, boot, session, fileFetch, memoryStorage, root };
