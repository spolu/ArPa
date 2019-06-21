// ArPa v.01
//
// Useful links:
// https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

const ACTIONS = [
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

window.addEventListener('focus', () => {
  console.log('[ArPa v0.1] FOCUS');
});

window.onload = () => {
  console.log('[ArPa v0.1] LOAD');
};

window.document.addEventListener("DOMContentLoaded", (event) => {
  console.log('[ArPa v0.1] DOM_CONTENT_LOADED');
});

window.addEventListener('click', (event) => {
  console.log(cssPath(event.target));
});

window.document.addEventListener('readystatechange', (event) => {
  console.log('[ArPa v0.1] READY_STATE_CHANGE ' + document.readyState);
});

(() => {
  console.log('[ArPa v0.1] EXEC');

  let currHRef = window.location.href;
  window.setInterval(() => {
    if (window.location.href !== currHRef) {
      currHRef = window.location.href;
      console.log('[ArPa v0.1] HREF ' + currHRef);
    }
  }, 50);
})();
