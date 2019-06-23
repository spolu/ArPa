// ArPa v.01
//
// Useful links:
// https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

const ACTIONS = [
  {
    href: '.*github.com/.*/.*',
    path: [
      ["body", 0],
      ["div", 3],
      ["div", 0],
      ["main", 0],
      ["div", 0],
      ["nav", 0 ],
      ["span", 2],
      ["a", 0],
      ["span", 0],
    ]
  }
];

const cssPath = (el) => {
  const path = [];

  while (el.parentNode != null && el.nodeName.toLowerCase() != 'html') {
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
  if (document.getElementsByTagName('html').length != 1) {
    return null;
  }
  let el = document.getElementsByTagName('html');

  while (path.length > 0) {
    let p = path.shift();
  }

  return el;
};

let runLoop = () => {
  actions = document.getElementsByClassName("_arpa_action");
  for (let el of actions) {
    el.remove();
  }

  console.log('[ArPa v0.1] RUNLOOP ' + window.location.href);
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

(() => {
  console.log('[ArPa v0.1] EXEC');

  let currHRef = window.location.href;
  window.setInterval(() => {
    if (window.location.href !== currHRef) {
      currHRef = window.location.href;
      console.log('[ArPa v0.1] HREF ' + currHRef);
      runLoop();
    }
  }, 50);

  runLoop();
})();
