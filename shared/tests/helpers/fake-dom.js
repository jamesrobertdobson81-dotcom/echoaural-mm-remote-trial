'use strict';

// A minimal, generic, auto-vivifying DOM stub for booting a real Progress
// Mode app script.js inside node:vm well enough to exercise its logic
// (question selection, scoring, the EAProgressEmbed bridge) without a real
// browser or a jsdom dependency. Every element is created on first access
// and cached by id/selector-key, matching a real DOM's identity semantics
// (repeated `getElementById("x")` calls return the SAME node) closely
// enough for these apps' own code, which almost always caches its element
// references once at the top of the file exactly the way real pages do.
//
// Two rendering idioms appear across these apps' script.js files and both
// need to work: building elements via document.createElement()+
// appendChild() (e.g. instrument-identifier), and building them via an
// innerHTML template string followed by querySelectorAll() to attach
// listeners (e.g. texture-trainer). The innerHTML setter below runs a
// small tag-soup parser (not a real HTML parser — deliberately just enough
// for these apps' own templated button/span markup) so that either idiom
// produces real, queryable, clickable fake child elements.
//
// This is intentionally generic (not app-specific) so the same helper
// covers every PM source's script.js as each one is migrated, rather than
// a bespoke stub per app.

const VOID_TAGS = new Set(['br', 'img', 'input', 'hr', 'meta', 'link']);

function createClassList(el) {
  return {
    add: (...names) => names.forEach((name) => el._classes.add(name)),
    remove: (...names) => names.forEach((name) => el._classes.delete(name)),
    toggle: (name, force) => {
      const shouldHave = force === undefined ? !el._classes.has(name) : Boolean(force);
      if (shouldHave) el._classes.add(name); else el._classes.delete(name);
      return shouldHave;
    },
    contains: (name) => el._classes.has(name)
  };
}

function toCamelCase(value) {
  return value.replace(/-([a-z0-9])/g, (_match, letter) => letter.toUpperCase());
}

// Parses a run of attributes out of an opening tag's inside-text, e.g.
// `class="x y" data-answer="Foo" type="button"`.
function parseAttributes(attrText) {
  const attrs = {};
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|[^\s"'=<>`]+))?/g;
  let match;
  while ((match = pattern.exec(attrText))) {
    const name = match[1];
    const value = match[3] !== undefined ? match[3] : (match[4] !== undefined ? match[4] : (match[2] || ''));
    attrs[name] = value;
  }
  return attrs;
}

function applyAttributes(el, attrs) {
  Object.entries(attrs).forEach(([name, value]) => {
    el.attributes[name] = value;
    if (name === 'class') {
      String(value).split(/\s+/).filter(Boolean).forEach((cls) => el._classes.add(cls));
    } else if (name.startsWith('data-')) {
      el.dataset[toCamelCase(name.slice(5))] = value;
    } else if (name === 'id') {
      el.id = value;
    } else if (name === 'disabled') {
      el.disabled = true;
    }
  });
}

// Deliberately simple tag-soup tokenizer — handles nested tags, self-
// closing void tags, and treats anything it doesn't understand (comments,
// malformed markup) as inert text. Sufficient for these apps' own
// templated output; not a general HTML parser.
function parseHtmlIntoChildren(doc, html) {
  const root = { children: [] };
  const stack = [root];
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*?)?)\s*\/?>|([^<]+)/g;
  let match;
  while ((match = tagPattern.exec(String(html || '')))) {
    const [full, tagName, attrText, text] = match;
    if (text !== undefined) {
      const current = stack[stack.length - 1];
      // Deliberately bypasses the `.textContent =` property setter — that
      // setter's real-DOM-accurate "replace all children with a single
      // text node" behaviour is exactly wrong here: a whitespace/text run
      // between <button>...</button> and a later sibling tag would wipe
      // out element children this same parser already attached moments
      // earlier (e.g. a <span> inside the button). Parsing just needs to
      // accumulate raw text; el._text stays a fallback the textContent
      // getter only reads when the element has no element children.
      if (current !== root) current._text = (current._text || '') + text;
      continue;
    }
    const isClosing = full.startsWith('</');
    if (isClosing) {
      // Pop back to (and including) the matching open tag, tolerating
      // mismatched/unclosed tags rather than throwing.
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index]._tag === tagName.toLowerCase()) { stack.length = index; break; }
      }
      continue;
    }
    const el = createFakeElement(doc, tagName.toLowerCase());
    applyAttributes(el, parseAttributes(attrText || ''));
    // getElementById(el.id) must find this element too, not just
    // querySelector/querySelectorAll — otherwise seeding static markup via
    // innerHTML (this parser) and looking it up via getElementById
    // (whatever the app calls next) silently produces two disconnected
    // elements instead of the same one, exactly the kind of divergence
    // this harness exists to avoid.
    if (doc && el.id) doc._elementsById?.set(el.id, el);
    const parent = stack[stack.length - 1];
    parent.children.push(el);
    el.parentElement = parent === root ? null : parent;
    const selfClosing = full.endsWith('/>') || VOID_TAGS.has(tagName.toLowerCase());
    if (!selfClosing) stack.push(el);
  }
  return root.children;
}

function matchesSimpleSelector(el, selector) {
  const clean = selector.trim();
  if (!clean) return false;
  if (clean.startsWith('.')) return el._classes && el._classes.has(clean.slice(1));
  if (clean.startsWith('#')) return el.id === clean.slice(1);
  const attrMatch = /^\[([a-zA-Z0-9_-]+)\]$/.exec(clean);
  if (attrMatch) return Object.prototype.hasOwnProperty.call(el.attributes || {}, attrMatch[1]);
  return (el._tag || '').toLowerCase() === clean.toLowerCase();
}

function matchesSelector(el, selector) {
  return selector.split(',').some((part) => matchesSimpleSelector(el, part));
}

function collectMatches(children, selector, results) {
  children.forEach((child) => {
    if (matchesSelector(child, selector)) results.push(child);
    if (child.children && child.children.length) collectMatches(child.children, selector, results);
  });
  return results;
}

// Real CSSStyleDeclaration supports both plain-property assignment
// (el.style.color = "red") and the setProperty()/getPropertyValue()/
// removeProperty() API (used for custom properties like
// --marking-canvas-width, which aren't valid JS identifiers) — several
// apps use the latter, so this needs to be more than a plain {}.
function createFakeStyle() {
  const style = {};
  Object.defineProperties(style, {
    setProperty: { value: (name, value) => { style[name] = value; }, enumerable: false },
    getPropertyValue: { value: (name) => style[name] || '', enumerable: false },
    removeProperty: { value: (name) => { delete style[name]; }, enumerable: false }
  });
  return style;
}

function createFakeElement(doc, tagHint) {
  const el = {
    _classes: new Set(),
    _listeners: new Map(),
    _tag: (tagHint || 'div').toLowerCase(),
    _rawInnerHTML: '',
    style: createFakeStyle(),
    dataset: {},
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    children: [],
    attributes: {},
    addEventListener(type, handler) {
      if (!this._listeners.has(type)) this._listeners.set(type, []);
      this._listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const list = this._listeners.get(type) || [];
      const index = list.indexOf(handler);
      if (index !== -1) list.splice(index, 1);
    },
    dispatchEvent(event) {
      (this._listeners.get(event && event.type) || []).forEach((handler) => handler(event));
      return true;
    },
    focus() {},
    blur() {},
    remove() {},
    // Harmless on non-media elements (nothing calls them); needed because
    // several apps grab a real <audio>/<video> tag straight out of the
    // static page (document.getElementById("cadenceAudio")) rather than
    // constructing `new Audio()` in script — that element needs to behave
    // like a real media element too, not just objects built via `new Audio`.
    currentTime: 0,
    duration: 0,
    paused: true,
    readyState: 4,
    play() { this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
    load() {},
    appendChild(child) { this.children.push(child); child.parentElement = this; return child; },
    append(...items) { items.forEach((item) => { item.parentElement = this; }); this.children.push(...items); },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index !== -1) this.children.splice(index, 1);
      child.parentElement = null;
    },
    setAttribute(name, value) { applyAttributes(this, { [name]: String(value) }); },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; },
    removeAttribute(name) { delete this.attributes[name]; },
    querySelector(selector) { return collectMatches(this.children, selector, [])[0] || null; },
    querySelectorAll(selector) { return collectMatches(this.children, selector, []); },
    closest(selector) {
      let node = this;
      while (node) {
        if (matchesSelector(node, selector)) return node;
        node = node.parentElement || null;
      }
      return null;
    },
    // Real DOM click() dispatches a bubbling event — several apps rely on
    // event delegation (a listener on a container, reading
    // event.target.closest(".choice-button")) rather than a listener per
    // button, so click() has to actually climb the parentElement chain
    // invoking each ancestor's own 'click' listeners, not just this
    // element's, for those apps' real code to do anything.
    click() {
      let stopped = false;
      const event = {
        type: 'click',
        target: this,
        preventDefault() {},
        stopPropagation() { stopped = true; },
        stopImmediatePropagation() { stopped = true; }
      };
      let node = this;
      while (node && !stopped) {
        (node._listeners.get('click') || []).slice().forEach((handler) => {
          if (stopped) return;
          event.currentTarget = node;
          handler(event);
        });
        node = node.parentElement || null;
      }
    },
    getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }; }
  };
  el.classList = createClassList(el);
  el.parentElement = null;
  Object.defineProperty(el, 'parentNode', { get() { return el.parentElement; } });
  // Real DOM reflects the `id` property onto the `id` attribute (and vice
  // versa) — document.getElementById("x") finds an element the instant
  // `el.id = "x"` runs, not just elements created via getElementById or
  // parsed from an id="..." attribute string. Several apps create a div via
  // document.createElement then assign .id directly (rather than
  // setAttribute), so this needs the same reflection or a later
  // getElementById("x") silently returns a different, disconnected element.
  let idValue = '';
  Object.defineProperty(el, 'id', {
    get() { return idValue; },
    set(value) {
      idValue = String(value || '');
      if (doc && idValue) doc._elementsById?.set(idValue, el);
    }
  });
  // Lets document.querySelector(All) find elements anywhere in the
  // document, the same approximation getElementById already relies on —
  // a flat registry rather than a real tree walk from document.body, which
  // is more than accurate enough for these apps' own document-level
  // queries (dropdown-close-on-outside-click, post-submit "disable every
  // rendered choice button" loops) without needing this stub to model a
  // real DOM tree end to end.
  if (doc && doc._allElements) doc._allElements.push(el);
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._rawInnerHTML; },
    set(html) {
      el._rawInnerHTML = html;
      el.children = parseHtmlIntoChildren(doc, html);
      el.children.forEach((child) => { child.parentElement = el; });
    }
  });
  Object.defineProperty(el, 'textContent', {
    get() {
      if (el.children.length) return el.children.map((child) => child.textContent || '').join('');
      return el._text || '';
    },
    set(value) { el._text = value; el.children = []; el._rawInnerHTML = value; }
  });
  Object.defineProperty(el, 'className', {
    get() { return Array.from(el._classes).join(' '); },
    set(value) { el._classes = new Set(String(value || '').split(/\s+/).filter(Boolean)); }
  });
  return el;
}

function createFakeDocument() {
  const byId = new Map();
  const doc = {
    _elementsById: byId,
    _allElements: [],
    getElementById(id) {
      if (!byId.has(id)) byId.set(id, createFakeElement(doc));
      return byId.get(id);
    },
    createElement(tag) { return createFakeElement(doc, tag); },
    // A bare `#id` selector is exactly what getElementById is for — several
    // apps use `document.querySelector("#x")` instead of
    // `document.getElementById("x")` for the same lookup, so this routes
    // through the same auto-vivifying path rather than only ever finding
    // elements something else already happened to create first.
    querySelector(selector) {
      const idMatch = /^#([a-zA-Z0-9_-]+)$/.exec(String(selector || '').trim());
      if (idMatch) return doc.getElementById(idMatch[1]);
      return doc._allElements.find((el) => matchesSelector(el, selector)) || null;
    },
    querySelectorAll(selector) { return doc._allElements.filter((el) => matchesSelector(el, selector)); },
    addEventListener() {},
    removeEventListener() {}
  };
  doc.documentElement = createFakeElement(doc, 'html');
  doc.body = createFakeElement(doc, 'body');
  doc.head = createFakeElement(doc, 'head');
  return doc;
}

// Registers a set of "live" radio-style values so readSetupOptions()-style
// code (`document.querySelector('input[name="x"]:checked')?.value`) can be
// exercised deterministically instead of always falling back to defaults.
// Most apps' setup readers are written to tolerate a null match already
// (this is exactly the null-safe pattern Progress Mode's own DOM-polling
// drivers depend on), so this is optional — pass none for "use app
// defaults."
function withCheckedInputs(doc, values = {}) {
  const original = doc.querySelector;
  doc.querySelector = function (selector) {
    const match = /^input\[name="([^"]+)"\](?::checked)?$/.exec(String(selector || ''));
    if (match && Object.prototype.hasOwnProperty.call(values, match[1])) {
      return { checked: true, value: String(values[match[1]]) };
    }
    return original.call(doc, selector);
  };
  return doc;
}

function createFakeWindow(overrides = {}) {
  const listeners = new Map();
  const win = {
    location: { search: '', href: 'https://echoaural.test/', origin: 'https://echoaural.test' },
    localStorage: (() => {
      const store = new Map();
      return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key)
      };
    })(),
    setTimeout: (fn) => { fn(); return 0; },
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: (fn) => { fn(); return 0; },
    alert: () => {},
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    removeEventListener() {},
    dispatchEvent(event) {
      (listeners.get(event && event.type) || []).forEach((handler) => handler(event));
    },
    _listeners: listeners,
    URL,
    URLSearchParams,
    Audio: class FakeAudio {
      constructor(src) {
        this.src = src;
        this.currentSrc = src || '';
        this.volume = 1;
        this.currentTime = 0;
        this.duration = 0;
        this.paused = true;
        this._listeners = new Map();
      }
      addEventListener(type, handler) {
        if (!this._listeners.has(type)) this._listeners.set(type, []);
        this._listeners.get(type).push(handler);
      }
      removeEventListener(type, handler) {
        const list = this._listeners.get(type) || [];
        const index = list.indexOf(handler);
        if (index !== -1) list.splice(index, 1);
      }
      dispatchEvent(event) {
        (this._listeners.get(event && event.type) || []).forEach((handler) => handler(event));
        return true;
      }
      play() { this.paused = false; return Promise.resolve(); }
      pause() { this.paused = true; }
      load() {}
    },
    // Minimal Web Audio API stub — enough for apps that synthesise or play
    // sampled notes (chord-identifier, melodic-intervals, meter-master,
    // etc.) to run their real playback code path without throwing, without
    // this test harness needing to actually produce sound. Every node is a
    // no-op that supports the handful of methods these apps' audio-engine
    // files actually call: connect(), gain ramps, buffer sources, start().
    AudioContext: class FakeAudioContext {
      constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
      createGain() {
        return { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
      }
      createOscillator() {
        return { type: 'sine', frequency: { value: 440, setValueAtTime() {} }, connect() {}, start() {}, stop() {}, disconnect() {} };
      }
      createBufferSource() {
        return { buffer: null, connect() {}, start() {}, stop() {}, disconnect() {} };
      }
      decodeAudioData(_data) { return Promise.resolve({ duration: 1, sampleRate: 44100, numberOfChannels: 1 }); }
      resume() { this.state = 'running'; return Promise.resolve(); }
      suspend() { this.state = 'suspended'; return Promise.resolve(); }
      close() { return Promise.resolve(); }
    },
    fetch(_url) {
      return Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
      });
    },
    Math,
    Date,
    ...overrides
  };
  win.webkitAudioContext = win.AudioContext;
  win.window = win;
  win.self = win;
  win.globalThis = win;
  return win;
}

module.exports = { createFakeElement, createFakeDocument, createFakeWindow, withCheckedInputs };
