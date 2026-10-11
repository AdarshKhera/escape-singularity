# Escape Singularity

A small 2D space game about one decision: turn away from the black hole early enough, or it keeps you.

**Play:** https://adarshkhera.github.io/escape-singularity/
**Case study:** [docs/CASE_STUDY.md](docs/CASE_STUDY.md)
**Made by:** Adarsh Khera, Arehk Games

![Escape Singularity](docs/screens/hole-3-near.jpg)

Status: work in progress. It plays start to finish (12 levels), and it keeps getting better.

## Controls

| | Keyboard | Touch |
|---|---|---|
| Thrust | D or Right arrow | Thrust button |
| Brake | A or Left arrow | Brake button |
| Steer | W / S or Up / Down | Steer pad |
| Boost | Double-tap thrust | Double-tap Thrust |
| Fire a rocket | Space | Fire button |
| Pause | P | Pause button |

On a phone, play in landscape.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173/escape-singularity/
npm test         # unit tests for the physics, camera and level maths
npm run build
```

Built with Vite, React, TypeScript, Zustand and Canvas 2D. Tests use Vitest.

## Credits

Art and fonts come from other people's work. Thank you to all of them.

| What | From | Licence |
|---|---|---|
| Ship, rocket and shield sprites | "Void - Main Ship" by Baldur, distributed by [Foozle](https://www.foozle.io) | CC0 (public domain) |
| Planets, moons and asteroids | "Free Celestial Objects Pixel Art Pack" by norma_2d ([DeviantArt](https://www.deviantart.com/norma2d), [Ko-fi](https://ko-fi.com/norma2d)) | Free to use in projects, credit appreciated. The pack itself may not be redistributed or resold, so only the sprites this game uses are included here, and they are not offered for reuse. Please get the full pack from the author. |
| Display font | [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) | SIL Open Font License |
| Mono font | [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | SIL Open Font License |
| Music and sound effects | Written for this game and synthesised in the browser with the Web Audio API | Original |
| Code, UI, black hole, level design | Adarsh Khera | MIT, see [LICENSE](LICENSE) |

The MIT licence covers the code. The sprites above keep their own licences.

## Privacy

No accounts, no tracking, no network calls except loading the page, its fonts and its assets. Progress and settings stay in your browser's local storage.
