# Stable DCloud compiler update

Update the seven exact DCloud compiler packages together to
`3.0.0-5030420261029002`. Keep the Stable H5 and mp-weixin targets and the
existing validated Vue, Vite and Pinia pins.

- Given a generated app with a Feature, install from the revised lockfile on
  Ubuntu and Windows, run full validation and verify H5 retry in Chromium.
- Compare the compiled main-package bytes for identical generated inputs. On
  macOS, the initial app grew from 83,608 to 85,589 bytes. The generated
  example with an additional Feature measured 84.3 KiB after the update.
- Import the compiled Mini Program into WeChat DevTools and verify its home
  page renders. Record the IDE version and evidence before integration.

[DCloud CLI template snapshot](https://github.com/dcloudio/uni-preset-vue/blob/f747e3b11c51b3bff6c05e2b54f9a3173a590044/package.json#L38-L68)
