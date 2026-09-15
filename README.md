# Crazy Carousel

A single-page, slightly unhinged 3D product carousel — elastic snap, momentum, side-card blur, and a little tilt when you scrub it. Inspired by the [InterfaceCraft × MoMA](https://x.com/makisasonline/status/2098033912119197857) clip Chris bookmarked.

Eight fake drops, no backend, no keys. Drag, swipe, wheel, arrow buttons, or the keyboard.

## Run locally

```bash
npm i
npm run dev
```

Opens on [http://127.0.0.1:4321](http://127.0.0.1:4321).

## Build

```bash
npm run build
```

Static output lands in `dist/`. Preview that build with `npm run preview`.

Cloudflare Pages can publish the same folder. `wrangler.toml` sets `pages_build_output_dir = "./dist"`. This repo is not deployed from this machine.

## Controls

- Drag or swipe the stage
- Mouse wheel / trackpad
- On-screen arrows
- `←` `→` keys (`Home` / `End` jump the ends)
- Click a side card or a dot

Autoplay pauses the moment you touch it and comes back after a few idle seconds.

## Stack

Vite, vanilla JS, CSS 3D + pointer events. No GSAP, no APIs.
