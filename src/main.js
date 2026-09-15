import { DROPS } from "./drops.js";
import { CrazyCarousel } from "./carousel.js";

const carousel = new CrazyCarousel({
  drops: DROPS,
  elements: {
    stage: document.querySelector("#stage"),
    viewport: document.querySelector("#viewport"),
    track: document.querySelector("#track"),
    measure: document.querySelector("#measure"),
    prev: document.querySelector("#prev"),
    next: document.querySelector("#next"),
    hint: document.querySelector("#hint"),
    copy: document.querySelector(".copy"),
    kicker: document.querySelector("#kicker"),
    title: document.querySelector("#title"),
    caption: document.querySelector("#caption"),
    dots: document.querySelector("#dots"),
    counter: document.querySelector("#counter"),
  },
});

carousel.init();
