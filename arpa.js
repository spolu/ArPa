// ArPa v.01

/**
 * Global constants.
 */
const ACTION_TAGS = ['a', 'button'];

/**
 * Global variables representing the state of the current page.
 */
let INJECTED = false;
let INJECT = null;
let HREF = null;
let STORAGE = null

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
 * `PathNode` specifies a sepcific child in an `Action` path.
 *
 * A child along the path of an `Action` is specified by a `PathNode` that is:
 * - its `tag`.
 * - its `index` in the siblings for the same parent and tag.
 * - its `class` attribute.
 */
class PathNode {
  constructor(tag, index, cls, hash) {
    this.tag = tag;
    this.index = index;
    this.class = cls || '';

    if (hash) {
      this.hash = hash;
    } else {
      this.hash = `${this.tag}-${this.index}-${hashCode(this.class)}`;
    }
  }

  serialize() {
    return {
      tag: this.tag,
      index: this.index,
      class: this.class,
      hash: this.hash,
    };
  }

  static deserialize(obj) {
    return new PathNode(obj.tag, obj.index, obj.class, obj.hash);
  }

  static classForElement(el) {
    let cls = '';
    if (el.attributes['class']) {
      cls = el.attributes['class'].value.toLowerCase();
    }
    return cls;
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

      path.unshift(
        new PathNode(
          el.nodeName.toLowerCase(),
          sibIndex,
          PathNode.classForElement(el),
        )
      );
      el = el.parentNode;
    }

    let idx = -1;
    for (let i = 0; i < path.length; i++) {
      if (ACTION_TAGS.includes(path[i].tag)) {
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
 * `Domain` represents an ordered set of actions (by usage) for a given domain
 * or more precisely `hostname`.
 *
 * It exposes the capability to record a new `Action` as well as target the
 * element of the current DOM matching the highest ranked action for which it
  * exists.
 */
class Domain {
  constructor(hostname) {
    this.hostname = hostname;

    this.index = {}
    this.actions = []
  }

  serialize() {
    let actions = [];
    for (let a of this.actions) {
      actions.push({ action: a.action.serialize(), count: a.count });
    }
    return {
      hostname: this.hostname,
      actions: actions,
    };
  }

  static deserialize(obj) {
    if (!obj.hostname) {
      return null;
    }
    let actions = [];
    let index = {};
    console.log(obj.actions);
    for (let a of obj.actions) {
      console.log('DESERIALIZING ACTION');
      console.log(a);
      action = Action.deserialize(a.action);
      actions.push({ action: action, count: a.count });
      index[action.hash] = a.count;
      console.log(action);
    }
    let d = new Domain(obj.hostname);
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
    this.index[action.hash].count += 1
    this.actions.sort((a, b) => {
      if(a.count < b.coiunt) return -1;
      if(a.count > b.coiunt) return 1;
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


const onError = (error) => {
  console.log('[ArPa v0.1] ERROR');
  console.log(error);
};

const saveAction = (action) => {
  console.log('[ArPa v0.1] SAVE_ACTION');
  const hostname = window.location.hostname;
  STORAGE.local.get(hostname).then((domain) => {
    console.log('RETRIEVED');
    console.log(domain[hostname]);
    domain = Domain.deserialize(domain[hostname]);
    domain = domain || new Domain(hostname);
    console.log(domain);
    domain.saveAction(action);
    console.log('SAVE ACTION DONE');
    console.log(domain);
    STORAGE.local.set({
      [hostname]: domain.serialize(),
    }).then(() => {
      console.log('[ArPa v0.1] ACTION_SAVED');
    }, onError)
  }, onError);
};


let runLoop = () => {
  console.log('[ArPa v0.1] RUNLOOP ' + HREF);

  if (!INJECTED) {
    let style = document.createElement('style');
    style.innerHTML = '._arpa_action { background-color: red !important; }';
    document.body.appendChild(style);
    INJECTED = true;
  }

  INJECT = null;
  const hostname = window.location.hostname;

  STORAGE.local.get(hostname).then((domain) => {
    domain = Domain.deserialize(domain[hostname]);
    if (domain) {
      console.log('RETRIEVED RUNLOOP')
      console.log(domain)
      let el = domain.target()
      console.log(el)
      if (el != null) {
        INJECT = el;
      }
    }
  }, onError);

  oldInjects = document.getElementsByClassName("_arpa_action");
  for (let el of oldInjects) {
    el.classList.remove('_arpa_action');
  }
  if (INJECT != null) {
    INJECT.classList.add('_arpa_action');
  }
};


window.addEventListener('focus', () => {
  console.log('[ArPa v0.1] FOCUS');
  runLoop();
});

window.onload = () => {
  console.log('[ArPa v0.1] LOAD');
  runLoop();
};

window.document.addEventListener("DOMContentLoaded", (event) => {
  console.log('[ArPa v0.1] DOM_CONTENT_LOADED');
  runLoop();
});

window.addEventListener('mousedown', (event) => {
  let action = Action.fromElement(event.target);
  if (action) {
    saveAction(action);
  }
});

window.document.addEventListener('readystatechange', (event) => {
  console.log('[ArPa v0.1] READY_STATE_CHANGE ' + document.readyState);
  runLoop();
});

window.onkeydown = (event) => {
  // console.log(event);

  if(event.keyCode === 190 && event.metaKey) {
    event.preventDefault();

    console.log('[ArPa v0.1] REQUEST');
    console.log(INJECT);
    if (INJECT) {
      console.log('[ArPa v0.1] EXECUTE');
      let action = Action.fromElement(INJECT);
      if (action) {
        saveAction(action);
      }
      INJECT.click();
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
      runLoop();
    }
  }, 50);

  let observer = new MutationObserver((mutationList, observer) => {
    console.log('[ArPa v0.1] MUTATION');
    runLoop();
  });
  observer.observe(document.body, {
    attributes: false,
    childList: true,
    subtree: true
  });

  if (browser && browser.storage) {
    STORAGE = browser.storage
  }
  if (chrome && chrome.storage) {
    STORAGE = chrome.storage
  }

  STORAGE.local.get(null).then((all) => {
    console.log('RETRIEVE ALL STORAGE');
    console.log(all);
  }, onError)

  runLoop();
})();
