# Stable DCloud compiler update

Update the seven exact DCloud compiler packages together to
`3.0.0-5030420261029002`. Keep the Stable H5 and mp-weixin targets and the
existing validated Vue, Vite and Pinia pins.

- Given a generated app with a Feature, install from the revised lockfile on
  Ubuntu and Windows, run full validation and verify H5 retry in Chromium.
- For identical generated inputs on macOS, the initial app uses 83,608 bytes
  with the original compiler, 85,589 bytes with the compiler update alone,
  and 126,574 bytes including the portable URL constructor (123.6 KiB versus
  a 1,800 KiB main-package budget).
- Import the compiled Mini Program into WeChat DevTools. The production
  build of `upgrade-demo` rendered `pages/home/index` on Stable
  `2.02.2608060` with a local test AppID. The sample API domain was outside
  the test AppID's allowlist, so the app displayed its recoverable error
  message and the Try again button.
- Keep URL validation available on Mini Program hosts without a global URL
  constructor. A unit test removes that constructor before loading runtime
  configuration. The IDE trial reproduced the blank homepage without the
  portable constructor and verified that the repaired build rendered.

[DCloud CLI template snapshot](https://github.com/dcloudio/uni-preset-vue/blob/f747e3b11c51b3bff6c05e2b54f9a3173a590044/package.json#L38-L68)
