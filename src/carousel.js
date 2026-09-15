const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const wrap = (value, count) => {
  return ((value % count) + count) % count;
};

const wrappedDelta = (from, to, count) => {
  let delta = wrap(to, count) - wrap(from, count);
  if (delta > count / 2) delta -= count;
  if (delta < -count / 2) delta += count;
  return delta;
};

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export class CrazyCarousel {
  constructor({ drops, elements }) {
    this.drops = drops;
    this.count = drops.length;
    this.els = elements;

    this.pos = 0;
    this.vel = 0;
    this.target = 0;
    this.dragging = false;
    this.pointerId = null;
    this.dragOriginX = 0;
    this.dragOriginY = 0;
    this.dragOriginPos = 0;
    this.lastX = 0;
    this.lastT = 0;
    this.moved = false;
    this.tiltX = 0;
    this.tiltY = 0;
    this.tiltTX = 0;
    this.tiltTY = 0;
    this.active = 0;
    this.raf = 0;
    this.lastFrame = 0;
    this.wheelAcc = 0;
    this.wheelTimer = 0;
    this.autoplayTimer = 0;
    this.idleTimer = 0;
    this.paused = false;
    this.hintHidden = false;

    this.stiffness = prefersReducedMotion() ? 320 : 168;
    this.damping = prefersReducedMotion() ? 28 : 14.5;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onKey = this.onKey.bind(this);
    this.onResize = this.onResize.bind(this);
    this.tick = this.tick.bind(this);
  }

  init() {
    this.renderCards();
    this.renderDots();
    this.bind();
    this.syncCopy(true);
    this.scheduleAutoplay();
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.wheelTimer);
    clearTimeout(this.autoplayTimer);
    clearTimeout(this.idleTimer);
    this.unbind();
  }

  renderCards() {
    this.els.track.innerHTML = this.drops
      .map((drop, index) => {
        const n = String(index + 1).padStart(2, "0");
        return `
          <article class="card theme-${drop.theme}" data-index="${index}" style="--glow: inherit">
            <div class="card-face">
              <div class="art" aria-hidden="true">
                <div class="art-layer a"></div>
                <div class="art-layer b"></div>
                <div class="art-layer c"></div>
                <span class="art-num">${n}</span>
              </div>
              <div class="card-meta">
                <span class="card-tag">${drop.tag}</span>
                <strong class="card-name">${drop.title}</strong>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    this.cards = [...this.els.track.querySelectorAll(".card")];
    this.cards.forEach((card) => {
      card.addEventListener("click", () => {
        if (this.moved) return;
        this.goTo(Number(card.dataset.index), true);
      });
    });
  }

  renderDots() {
    this.els.dots.innerHTML = this.drops
      .map(
        (drop, index) =>
          `<button class="dot" type="button" role="tab" data-index="${index}" aria-label="${drop.title}"></button>`
      )
      .join("");

    this.dotButtons = [...this.els.dots.querySelectorAll(".dot")];
    this.dotButtons.forEach((dot) => {
      dot.addEventListener("click", () => this.goTo(Number(dot.dataset.index), true));
    });
  }

  bind() {
    const stage = this.els.stage;
    stage.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    stage.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("resize", this.onResize);
    this.els.prev.addEventListener("click", () => this.step(-1));
    this.els.next.addEventListener("click", () => this.step(1));
  }

  unbind() {
    const stage = this.els.stage;
    stage.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    stage.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("resize", this.onResize);
  }

  spacing() {
    return this.els.measure.getBoundingClientRect().width * 0.78;
  }

  noteInteraction() {
    this.hideHint();
    this.pauseAutoplay();
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.resumeAutoplay(), 4200);
  }

  hideHint() {
    if (this.hintHidden) return;
    this.hintHidden = true;
    this.els.hint.classList.add("is-gone");
  }

  pauseAutoplay() {
    this.paused = true;
    clearTimeout(this.autoplayTimer);
  }

  resumeAutoplay() {
    this.paused = false;
    this.scheduleAutoplay();
  }

  scheduleAutoplay() {
    clearTimeout(this.autoplayTimer);
    if (this.paused || prefersReducedMotion()) return;
    this.autoplayTimer = setTimeout(() => {
      this.target += 1;
      this.scheduleAutoplay();
    }, 3200);
  }

  step(dir) {
    this.noteInteraction();
    this.target += dir;
  }

  goTo(index, fromUser = false) {
    if (fromUser) this.noteInteraction();
    this.target += wrappedDelta(this.target, index, this.count);
  }

  onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest("button")) return;
    this.dragging = true;
    this.pointerId = event.pointerId;
    this.dragOriginX = event.clientX;
    this.dragOriginY = event.clientY;
    this.dragOriginPos = this.pos;
    this.lastX = event.clientX;
    this.lastT = performance.now();
    this.moved = false;
    this.vel = 0;
    document.body.classList.add("is-dragging");
    this.els.stage.setPointerCapture?.(event.pointerId);
    this.noteInteraction();
  }

  onPointerMove(event) {
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    const dx = event.clientX - this.dragOriginX;
    const dy = event.clientY - this.dragOriginY;
    if (Math.hypot(dx, dy) > 7) this.moved = true;

    const now = performance.now();
    const dt = Math.max(now - this.lastT, 8);
    const frameDx = event.clientX - this.lastX;
    this.vel = -frameDx / dt / this.spacing() * 1000;
    this.lastX = event.clientX;
    this.lastT = now;

    this.pos = this.dragOriginPos - dx / this.spacing();
    this.target = this.pos;

    const maxTilt = 10;
    this.tiltTX = clamp((-dy / 28) + this.vel * 0.35, -maxTilt, maxTilt);
    this.tiltTY = clamp(this.vel * 1.15, -14, 14);
  }

  onPointerUp(event) {
    if (!this.dragging || (event.pointerId && event.pointerId !== this.pointerId)) return;
    this.dragging = false;
    document.body.classList.remove("is-dragging");

    const projected = clamp(this.vel * 0.22, -2.6, 2.6);
    this.target = Math.round(this.pos + projected);
    this.tiltTX = 0;
    this.tiltTY = 0;
  }

  onWheel(event) {
    event.preventDefault();
    this.noteInteraction();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    this.wheelAcc += delta;
    this.pos += delta / this.spacing() / 1.35;
    this.target = this.pos;
    this.tiltTY = clamp(delta * 0.04, -10, 10);

    clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => {
      const dir = Math.sign(this.wheelAcc);
      const extra = Math.abs(this.wheelAcc) > 90 ? dir : 0;
      this.target = Math.round(this.pos + extra * 0.15);
      this.wheelAcc = 0;
      this.tiltTY = 0;
    }, 90);
  }

  onKey(event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.step(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      this.step(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      this.goTo(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      this.goTo(this.count - 1, true);
    }
  }

  onResize() {
    this.paint();
  }

  tick(now) {
    const dt = clamp((now - this.lastFrame) / 1000, 0, 1 / 30);
    this.lastFrame = now;

    if (!this.dragging) {
      const err = this.target - this.pos;
      this.vel += err * this.stiffness * dt;
      this.vel *= Math.exp(-this.damping * dt);
      this.pos += this.vel * dt;
    }

    this.tiltX += (this.tiltTX - this.tiltX) * (1 - Math.exp(-14 * dt));
    this.tiltY += (this.tiltTY - this.tiltY) * (1 - Math.exp(-12 * dt));

    this.paint();
    this.raf = requestAnimationFrame(this.tick);
  }

  paint() {
    const spacing = this.spacing();
    const rounded = wrap(Math.round(this.pos), this.count);
    if (rounded !== this.active) {
      this.active = rounded;
      this.syncCopy();
    }

    this.cards.forEach((card, index) => {
      let offset = index - this.pos;
      offset -= Math.round(offset / this.count) * this.count;
      if (offset > this.count / 2) offset -= this.count;
      if (offset < -this.count / 2) offset += this.count;

      const abs = Math.abs(offset);
      const x = offset * spacing;
      const rotY = clamp(offset * -38, -62, 62) + this.tiltY * (1 - Math.min(abs, 1) * 0.35);
      const rotX = this.tiltX * (1 - Math.min(abs, 1) * 0.4);
      const scale = 1 - Math.min(abs * 0.145, 0.42);
      const z = -abs * 140;
      const blur = Math.max(0, abs - 0.42) * 5.5;
      const opacity = 1 - Math.min(abs * 0.16, 0.52);
      const active = abs < 0.5;

      card.classList.toggle("is-active", active);
      card.style.zIndex = String(Math.round(40 - abs * 10));
      card.style.opacity = String(opacity);
      card.style.filter = blur > 0.2 ? `blur(${blur}px)` : "none";
      card.style.transform = `translate3d(${x}px, 0, ${z}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
    });
  }

  syncCopy(immediate = false) {
    const drop = this.drops[this.active];
    const n = String(this.active + 1).padStart(2, "0");
    const apply = () => {
      this.els.kicker.textContent = `${n} — ${drop.tag}`;
      this.els.title.textContent = drop.title;
      this.els.caption.textContent = drop.caption;
      this.els.counter.textContent = `${n} / ${String(this.count).padStart(2, "0")}`;
      this.dotButtons.forEach((dot, index) => {
        const on = index === this.active;
        dot.classList.toggle("is-active", on);
        dot.setAttribute("aria-selected", String(on));
      });
    };

    if (immediate || prefersReducedMotion()) {
      apply();
      return;
    }

    this.els.copy.classList.add("is-swapping");
    window.setTimeout(() => {
      apply();
      this.els.copy.classList.remove("is-swapping");
    }, 160);
  }
}
