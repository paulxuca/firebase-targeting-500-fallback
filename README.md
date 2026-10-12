# Firebase Targeting 500 Fallback

In Chrome, open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this folder. Reload Firebase Console afterward.

The real POST enumeration request always runs first. Only HTTP 500 responses are substituted with `{ "appSignalEnumerations": [] }`. Successful responses, other error codes, and other endpoints pass through. A yellow notice and a Console warning indicate fallback use. Network still shows the original 500.

This is an experimental UI workaround; the empty-response editor behavior has not yet been verified in Firebase. It does not restore app, audience, or user-property metadata or guarantee publishing works. It does not read credentials, store responses, or publish configuration.

To stop using it, disable or remove the extension and reload Firebase. The extension runs at document start in the page's MAIN world to intercept page XHR/fetch.
