// ArPa v.01

/**
 * ACTION_TAGS and ACTION_REGEXS are used to identify an element as an action.
 */
const ACTION_TAGS = ['a', 'button'];
const ACTION_REGEXS = [/button/, /btn/, /link/];


/**
 * To segment actions for a given context in a domain we use the following
 * signals:
 * - length of the URL path
 * - length of the URL hash
 * - value of URL path element at index defined in PATH_SENSORS
 * - value of URL hash element at index defined in HASH_SENSORS
 */
const CONTEXT_PATH_SENSORS = {
  'github.com': [2],
  'console.cloud.google.com': [1, 2],
  'us-east-2.console.aws.amazon.com': [1, 2, 4],
  'mail.protonmail.com': [1],
};

const CONTEXT_HASH_SENSORS = {
};


/**
 * Lists on which we're not running because mouse interactions are not working
 * as expected (and will probably need future fixing).
 */
const BLACKLIST_DOMAINS = [
  'www.notion.so'
];


/**
 * Global variables representing the state of the current page.
 */
let INJECTED = false;
let INJECT = null;
let HREF = null;
let STORAGE = null;


/**
 * `hashCode` efficiently hashes string to integer.
 */
let hashCode = (str) => {
  let hash = 0, i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash);
};


/**
 * `Storage` is a compatibility wrapper around storage primitives.
 */
class Storage {
  constructor() {
    if (!!window.chrome) {
      this.storage = chrome.storage
    } else {
      this.storage = browser.storage
    }
  }

  get(key) {
    const storage = this.storage;
    if (!!window.chrome) {
      return new Promise(function(resolve, reject) {
        storage.local.get(key, function(data) {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(data);
          }
        })
      });
    } else {
      return storage.local.get(key);
    }
  }

  set(data) {
    const storage = this.storage;
    if (!!window.chrome) {
      return new Promise(function(resolve, reject) {
        storage.local.set(data, function() {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        })
      });
    } else {
      return storage.local.set(data);
    }
  }
}


/**
 * `PathNode` specifies a sepcific child in an `Action` path.
 *
 * A child along the path of an `Action` is specified by a `PathNode` that is:
 * - its `tag`.
 * - its `index` in the siblings for the same parent and tag.
 * - its `class` attribute.
 */
class PathNode {
  constructor(tag, index, id, cls, role, hash) {
    this.tag = tag;
    this.index = index;
    this.id = id || '';
    this.class = cls || '';
    this.role = role || '';

    if (hash) {
      this.hash = hash;
    } else {
      this.hash = `${this.tag}-${this.index}`;
    }
  }

  isAction() {
    if (ACTION_TAGS.includes(this.tag)) {
      return true;
    }
    for (let r of ACTION_REGEXS) {
      if (r.test(this.id) || r.test(this.class) || r.test(this.role)) {
        return true;
      }
    }
    return false;
  }

  serialize() {
    return {
      tag: this.tag,
      index: this.index,
      id: this.id,
      class: this.class,
      role: this.role,
      hash: this.hash,
    };
  }

  static deserialize(obj) {
    return new PathNode(
      obj.tag,
      obj.index,
      obj.id,
      obj.class,
      obj.role,
      obj.hash,
    );
  }

  static attrForElement(el, attr) {
    let val = '';
    if (el.attributes[attr]) {
      val = el.attributes[attr].value.toLowerCase();
    }
    return val;
  }

  static fromElementAndIndex(el, index) {
    return new PathNode(
      el.nodeName.toLowerCase(),
      index,
      PathNode.attrForElement(el, 'id'),
      PathNode.attrForElement(el, 'class'),
      PathNode.attrForElement(el, 'role'),
    );
  }
}


/**
 * `Action` represents a user action by its path of `PathNode`.
 *
 * It exposes the ability to `target` an element in the current DOM (or returns
 * null if the `Action` path does not match any element) as well as a static
 * method to create a new `Action` from a given DOM element.
 *
 * Pathes are very strict (and therefore brittle). They don't resist to minor
 * page changes.
 */
class Action {
  constructor(path, hash) {
    this.path = path;

    let h = 0;
    for (let p of path) {
      h += hashCode(p.hash);
    }
    if (hash) {
      this.hash = hash;
    } else {
      this.hash = `action-${h}`
    }
  }

  serialize() {
    let obj = {
      path: [],
      hash: this.hash,
    }
    for (let p of this.path) {
      obj.path.push(p.serialize())
    }
    return obj;
  }

  static deserialize(obj) {
    let path = [];
    for (let p of obj.path) {
      path.push(PathNode.deserialize(p));
    }
    return new Action(path, obj.hash);
  }

  target() {
    let el = document.body;

    for (let i = 0; i < this.path.length; i ++) {
      const p = this.path[i];

      let next = null;
      let index = 0;
      for (let i = 0; i < el.childNodes.length; i++) {
        const chld = el.childNodes[i];
        if (chld.nodeName.toLowerCase() == p.tag) {
          if (index === p.index) {
            next = chld;
            break;
          }
          index++;
        }
      }
      if (next == null) {
        return null;
      } else {
        el = next;
      }
    }

    return el;
  }

  static fromElement(el) {
    const path = [];

    while (el.parentNode != null && el !== document.body) {
      let sibCount = 0;
      let sibIndex = 0;

      for (let i = 0; i < el.parentNode.childNodes.length; i++) {
        const sib = el.parentNode.childNodes[i];
        if (sib.nodeName == el.nodeName) {
          if (sib === el) {
            sibIndex = sibCount;
          }
          sibCount++;
        }
      }

      path.unshift(PathNode.fromElementAndIndex(el, sibIndex));
      el = el.parentNode;
    }

    let idx = -1;
    for (let i = 0; i < path.length; i++) {
      if (path[i].isAction()) {
        idx = i
      }
    }
    if (idx < 0) {
      return null;
    } else {
      return new Action(path.slice(0, idx+1));
    }
  }
}


/**
 * `Context` represents an ordered set of actions (by usage) for a given
 * domain's context.
 *
 * It exposes the capability to record a new `Action` as well as target the
 * element of the current DOM matching the highest ranked action for which it
 * exists.
 */
class Context {
  constructor() {
    this.index = {}
    this.actions = []
  }

  serialize() {
    let actions = [];
    for (let a of this.actions) {
      actions.push({ action: a.action.serialize(), count: a.count });
    }
    return {
      actions: actions,
    };
  }

  static deserialize(obj) {
    let actions = [];
    let index = {};

    for (let a of obj.actions) {
      let v = {
        action: Action.deserialize(a.action),
        count: a.count,
      };
      actions.push(v);
      index[v.action.hash] = v;
    }

    actions.sort((a, b) => {
      if(a.count < b.count) return 1;
      if(a.count > b.count) return -1;
      return 0;
    })

    let d = new Context();
    d.actions = actions;
    d.index = index;

    return d;
  }

  saveAction(action) {
    if (!(action.hash in this.index)) {
      this.index[action.hash] = {
        action: action,
        count: 0,
      };
      this.actions.push(this.index[action.hash])
    }
    this.index[action.hash].count += 1;

    this.actions.sort((a, b) => {
      if(a.count < b.count) return 1;
      if(a.count > b.count) return -1;
      return 0;
    })
  }

  target() {
    for (let a of this.actions) {
      let el = a.action.target();
      if (el) {
        return el;
      }
    }
    return null;
  }
}


/**
 * `Domain` represents a set of context for a given domain (hostname).
 *
 *  Contexts are computed as described in the top-level comment for
 *  CONTEXT_PATH_SENSORS and CONTEXT_HASH_SENSORS.
 */
class Domain {
  constructor(hostname) {
    this.hostname = hostname;
    this.contexts = {}
  }

  serialize() {
    let obj = {
      hostname: this.hostname,
      contexts: {},
    };

    for (let c of Object.keys(this.contexts)) {
      obj.contexts[c] = this.contexts[c].serialize();
    }

    return obj
  }

  static deserialize(obj) {
    if (!obj.hostname) {
      return null;
    }

    let contexts = {}
    for (let c of Object.keys(obj.contexts)) {
      contexts[c] = Context.deserialize(obj.contexts[c]);
    }

    let d = new Domain(obj.hostname);
    d.contexts = contexts;

    return d;
  }

  context(create) {
    const path = window.location.pathname.split("/");
    const hash = window.location.hash.split("/");
    const hostname = window.location.hostname;

    let h = 0;

    for (let idx of (CONTEXT_PATH_SENSORS[hostname] || [])) {
      if (idx < path.length) {
        h += hashCode(path[idx]);
      }
    }
    for (let idx of (CONTEXT_HASH_SENSORS[hostname] || [])) {
      if (idx < hash.length) {
        h += hashCode(hash[idx]);
      }
    }

    const c = `${path.length}-${hash.length}-${h}`;

    if (create && !(c in this.contexts)) {
      this.contexts[c] = new Context()
    }

    console.log('CONTEXT', c)
    if (c in this.contexts) {
      return this.contexts[c];
    }
    return null;
  }

  saveAction(action) {
    return this.context(true).saveAction(action);
  }

  target() {
    let c = this.context(false);

    if (c) {
      return c.target();
    }
    return null;
  }
}


const onError = (error) => {
  console.log('[ArPa v0.1] ERROR');
  console.log(error);
};


const saveAction = (action) => {
  const hostname = window.location.hostname;
  STORAGE.get(hostname).then((data) => {
    let domain = null;
    if (data[hostname]) {
      domain = Domain.deserialize(data[hostname]);
    } else {
      domain = new Domain(hostname);
    }
    domain.saveAction(action);

    STORAGE.set({
      [hostname]: domain.serialize(),
    }).then(() => {
      console.log('[ArPa v0.1] ACTION_SAVED');
    }, onError)
  }, onError);
};


let runLoop = () => {
  // console.log('[ArPa v0.1] RUNLOOP ' + HREF);

  if (!INJECTED) {
    let style = document.createElement('style');
    style.innerHTML = '._arpa_action { background-color: red !important; }';
    document.body.appendChild(style);
    INJECTED = true;
  }

  const hostname = window.location.hostname;

  STORAGE.get(hostname).then((data) => {
    let domain = null;
    if (data[hostname]) {
      domain = Domain.deserialize(data[hostname]);
    }
    if (domain) {
      let target = domain.target()
      INJECT = target;

      oldInjects = document.getElementsByClassName("_arpa_action");
      for (let el of oldInjects) {
        el.classList.remove('_arpa_action');
      }

      if (target != null) {
        target.classList.add('_arpa_action');
      }
    }
  }, onError);

};


window.addEventListener('focus', () => {
  console.log('[ArPa v0.1] FOCUS');
  setTimeout(runLoop);
});

window.onload = () => {
  console.log('[ArPa v0.1] LOAD');
  setTimeout(runLoop);
};

window.document.addEventListener("DOMContentLoaded", (event) => {
  console.log('[ArPa v0.1] DOM_CONTENT_LOADED');
  setTimeout(runLoop);
});

window.addEventListener('mousedown', (event) => {
  let action = Action.fromElement(event.target);
  if (action) {
    saveAction(action);
  }
});

window.document.addEventListener('readystatechange', (event) => {
  console.log('[ArPa v0.1] READY_STATE_CHANGE ' + document.readyState);
  setTimeout(runLoop);
});


let triggerMouseEvent = (target, eventType) => {
  var clickEvent = document.createEvent('MouseEvents');
  clickEvent.initEvent(eventType, true, true);
  target.dispatchEvent(clickEvent);
  // console.log('[ArPa v0.1] TRIGGER', eventType);
}

window.onkeydown = (event) => {
  // console.log(event);

  if(event.keyCode === 190 && event.metaKey) {
    event.preventDefault();

    console.log('[ArPa v0.1] REQUEST');
    console.log(INJECT);
    if (INJECT) {
      let action = Action.fromElement(INJECT);
      if (action) {
        saveAction(action);
      }

      triggerMouseEvent(INJECT, "mouseover");
      triggerMouseEvent(INJECT, "mousedown");
      triggerMouseEvent(INJECT, "mouseup");
      triggerMouseEvent(INJECT, "click");

      console.log('[ArPa v0.1] EXECUTE');
    }

    return false;
  }
};


(() => {
  console.log('[ArPa v0.1] INITIAL LOAD');

  HREF = window.location.href;
  window.setInterval(() => {
    if (window.location.href !== HREF) {
      HREF = window.location.href;
      console.log('[ArPa v0.1] HREF ' + HREF);
      setTimeout(runLoop)
    }
  }, 50);

  // let observer = new MutationObserver((mutationList, observer) => {
  //   console.log('[ArPa v0.1] MUTATION');
  //   runLoop();
  // });
  // observer.observe(document.body, {
  //   attributes: false,
  //   childList: true,
  //   subtree: true
  // });

  STORAGE = new Storage()

  STORAGE.get(null).then((all) => {
    console.log('RETRIEVE ALL STORAGE');
    console.log(all);
  }, onError)

  setInterval(runLoop, 250);
  setTimeout(runLoop)
})();
