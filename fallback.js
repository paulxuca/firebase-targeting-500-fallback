(() => {
  'use strict';
  const endpoint = 'https://firebasetargeting-pa.clients6.google.com/v1/targeting/enumeration';
  const body = JSON.stringify({ appSignalEnumerations: [] });
  const matches = (method, input) => {
    try {
      const url = new URL(input, location.href);
      return String(method).toUpperCase() === 'POST' && url.origin + url.pathname === endpoint;
    } catch { return false; }
  };
  let count = 0;
  function notify() {
    count++;
    console.warn('[Firebase targeting fallback] HTTP 500 replaced with empty metadata.', { count });
    const show = () => {
      let banner = document.getElementById('firebase-targeting-fallback-notice');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'firebase-targeting-fallback-notice';
        banner.setAttribute('role', 'status');
        banner.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:2147483647;max-width:460px;padding:12px 16px;background:#fff3cd;color:#332701;border:1px solid #997404;border-radius:8px;font:14px/1.4 system-ui;box-shadow:0 2px 8px #0004';
        document.body.appendChild(banner);
      }
      banner.textContent = `Firebase targeting fallback used (${count}): metadata is empty. App, audience, and user-property options may be unavailable. Reload to retry.`;
    };
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show, { once: true });
  }

  const states = new WeakMap();
  const proto = XMLHttpRequest.prototype;
  const originalOpen = proto.open;
  const originalSend = proto.send;
  const properties = ['status', 'statusText', 'response', 'responseText'];
  const getters = Object.fromEntries(properties.map(key => [key, Object.getOwnPropertyDescriptor(proto, key).get]));
  proto.open = function(method, url) {
    const previous = states.get(this);
    if (previous) {
      this.removeEventListener('readystatechange', previous.listener, true);
      for (const key of properties) delete this[key];
      states.delete(this);
    }
    const result = originalOpen.apply(this, arguments);
    if (matches(method, url)) {
      const state = { fallback: false, listener: null };
      state.listener = () => {
        if (this.readyState === 4 && !state.fallback && getters.status.call(this) === 500) {
          state.fallback = true;
          notify();
        }
      };
      states.set(this, state);
      this.addEventListener('readystatechange', state.listener, true);
    }
    return result;
  };
  proto.send = function() {
    const state = states.get(this);
    if (state) {
      const substitutes = {
        status: () => 200,
        statusText: () => 'OK',
        responseText: () => {
          if (this.responseType !== '' && this.responseType !== 'text') return getters.responseText.call(this);
          return body;
        },
        response: () => {
          if (this.responseType === 'json') return JSON.parse(body);
          if (this.responseType === 'blob') return new Blob([body], { type: 'application/json' });
          if (this.responseType === 'arraybuffer') return new TextEncoder().encode(body).buffer;
          return body;
        }
      };
      for (const key of properties) {
        Object.defineProperty(this, key, {
          configurable: true,
          get: () => state.fallback ? substitutes[key]() : getters[key].call(this)
        });
      }
    }
    return originalSend.apply(this, arguments);
  };

  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const response = await originalFetch.apply(this, arguments);
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    const url = input instanceof Request ? input.url : input;
    if (!matches(method, url) || response.status !== 500) return response;
    notify();
    return new Response(body, { status: 200, statusText: 'OK', headers: { 'Content-Type': 'application/json' } });
  };
})();
