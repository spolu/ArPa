// ArPa v.01
//
// Useful links:
// https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

console.log('[ArPa v0.1] INITIAL LOAD');

const _ARPA_ACTIONS = [
  {
    href: '.*github.com/.*/.*',
    path: [
      ["div", 3],
      ["div", 0],
      ["main", 0],
      ["div", 0],
      ["nav", 0],
      ["span", 2],
      ["a", 0],
    ]
  }, {
    href: '.*google.com/search?.*',
    path: [
      ["div", 6],
      ["div", 2],
      ["div", 9],
      ["div", 0],
      ["div", 1],
      ["div", 0],
      ["div", 1],
      ["div", 1],
      ["div", 0],
      ["div", 0],
      ["div", 0],
      ["div", 0],
      ["div", 0],
      ["div", 0],
      ["div", 0],
      ["div", 0],
      ["div", 0],
      ["a", 0]
    ]
  }, {
    href: '.*duckduckgo.com/?',
    path: [
      ["div", 1],
      ["div", 4],
      ["div", 2],
      ["div", 0],
      ["div", 0],
      ["div", 4],
      ["div", 0],
      ["div", 0],
      ["h2", 0],
      ["a", 0]
    ]
  }, {
    href: '.*syn.eu.ngrok.io.*',
    path: [
      ["tf-tensorboard", 0],
      ["paper-header-panel", 0],
      ["paper-toolbar", 0],
      ["div", 0],
      ["div", 0],
      ["div", 1],
      ["paper-icon-button", 0],
      ["iron-icon", 0]
    ]
  }, {
    href: '.*mail.protonmail.com.*',
    path: [
      ["div", 1],
      ["form", 0],
      ["div", 0],
      ["footer", 0],
      ["div", 0 ],
      ["button", 2]
    ]
  }, {
    href: '.*mail.protonmail.com.*',
    path: [
      ["div", 1],
      ["div", 0],
      ["section", 0],
      ["ul", 0],
      ["li", 0 ],
      ["a", 0]
    ]
  }, {
    href: '.*mail.protonmail.com.*',
    path: [
      ["div", 0],
      ["form", 0],
      ["div", 1],
      ["button", 1]
    ]
  }
];

let _ARPA_INJECTED = false;
let _ARPA_INJECT = null;
let _ARPA_HREF = null;

const cssPath = (el) => {
  const path = [];

  while (el.parentNode != null && el !== document.body) {
    let sibCount = 0;
    let sibIndex = 0;

    for (var i = 0; i < el.parentNode.childNodes.length; i++) {
      const sib = el.parentNode.childNodes[i];
      if (sib.nodeName == el.nodeName) {
        if (sib === el) {
          sibIndex = sibCount;
        }
        sibCount++;
      }
    }
    path.unshift([el.nodeName.toLowerCase(), sibIndex]);
    el = el.parentNode;
  }

  return path;
};

const getPath = (path) => {
  let el = document.body

  while (path.length > 0) {
    let p = path.shift();

    let next = null;
    let chldIndex = 0;
    for (var i = 0; i < el.childNodes.length; i++) {
      const chld = el.childNodes[i];
      if (chld.nodeName.toLowerCase() == p[0]) {
        if (chldIndex === p[1]) {
          next = chld;
          break;
        }
        chldIndex++;
      }
    }
    if (next == null) {
      return null;
    } else {
      el = next;
    }
  }

  return el;
};

let runLoop = () => {
  console.log('[ArPa v0.1] RUNLOOP ' + _ARPA_HREF);

  if (!_ARPA_INJECTED) {
    let style = document.createElement('style');
    style.innerHTML = '._arpa_action { background-color: red !important; }';
    document.body.appendChild(style);
    _ARPA_INJECTED = true;
  }

  _ARPA_INJECT = null;
  _ARPA_ACTIONS.forEach((action) => {
    let el = getPath(action.path.slice());
    if (el != null) {
      _ARPA_INJECT = el;
    }
  });

  oldInjects = document.getElementsByClassName("_arpa_action");
  for (let el of oldInjects) {
    el.classList.remove('_arpa_action');
  }
  if (_ARPA_INJECT != null) {
    _ARPA_INJECT.classList.add('_arpa_action');
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

window.addEventListener('click', (event) => {
  console.log(cssPath(event.target));
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
    console.log(_ARPA_INJECT);
    if (_ARPA_INJECT) {
      console.log('[ArPa v0.1] EXECUTE');
      _ARPA_INJECT.click();
    }

    return false;
  }
};

(() => {
  console.log('[ArPa v0.1] EXEC');

  _ARPA_HREF = window.location.href;
  window.setInterval(() => {
    if (window.location.href !== _ARPA_HREF) {
      _ARPA_HREF = window.location.href;
      console.log('[ArPa v0.1] HREF ' + _ARPA_HREF);
      runLoop();
    }
  }, 50);

  var observer = new MutationObserver((mutationList, observer) => {
    console.log('[ArPa v0.1] MUTATION');
    runLoop();
  });
  observer.observe(document.body, {
    attributes: false,
    childList: true,
    subtree: true
  });

  runLoop();
})();
