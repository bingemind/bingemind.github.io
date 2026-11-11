/* Bingemind hero parts (from design sample H).
   BMSphere: a 3D dot sphere on a plain 2D canvas that ripples like a voice.
   It stops moving under prefers-reduced-motion. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cssVar = (name, el) => getComputedStyle(el || document.documentElement).getPropertyValue(name).trim();

  /* opts:
     ink / accent: CSS variable names for dot colours
     mode: 'voice' (always talking), 'call' (calm, swells when pulse() is called), 'band' (flattened to a wave band)
     radius: sphere radius as a fraction of the canvas width
     count: number of dots; speed: turn speed; accentEvery: every n-th dot uses the accent
     size: dot size; tilt: pointer tilt strength; glow: true to draw a soft halo */
  function BMSphere(canvas, opts) {
    const o = Object.assign({ink:'--ink', accent:'--acc', mode:'voice', radius:.38, count:1100, speed:.0025, accentEvery:23, size:1.4, tilt:1, glow:false, alpha:.85}, opts || {});
    // phones: fewer dots and 30 fps; everyone: no work while off screen or in a hidden tab
    const phone = innerWidth < 700;
    if (phone) o.count = Math.round(o.count * .4);
    const minGap = phone ? 33 : 0;
    let visible = true, last = 0, running = false;
    const ctx = canvas.getContext('2d');
    const pts = [];
    for (let i = 0; i < o.count; i++) {
      const y = 1 - (i / (o.count - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    let W = 0, H = 0, rotY = 0, rotX = -.25, tX = -.25, tY = 0, energy = o.mode === 'call' ? .15 : 1, target = energy, t0 = performance.now();
    const size = () => {
      const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, phone ? 1.5 : 2);
      W = r.width; H = r.height; canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    size(); addEventListener('resize', size);
    if (o.tilt) addEventListener('pointermove', e => { tY = (e.clientX / innerWidth - .5) * .8 * o.tilt; tX = -.25 + (e.clientY / innerHeight - .5) * .5 * o.tilt; });
    const frame = now => {
      if (!visible || document.hidden) { running = false; return; }
      if (!reduce) requestAnimationFrame(frame);
      if (minGap && now - last < minGap) return;
      if (document.documentElement.classList.contains('still')) return;   // the page's pause button
      last = now;
      const t = (now - t0) / 1000;
      energy += (target - energy) * .05;
      if (o.mode === 'call' && target > .2) target *= .985;      // a pulse fades back to calm
      const speech = (.5 + .5 * Math.sin(t * 1.7)) * (.5 + .5 * Math.sin(t * 4.3));
      const amp = reduce ? 0 : speech * .1 * energy;
      if (!reduce) rotY += o.speed;
      rotX += (tX - rotX) * .04;
      const ry = rotY + tY, ink = cssVar(o.ink, canvas), acc = cssVar(o.accent, canvas);
      ctx.clearRect(0, 0, W, H);
      const R = (o.mode === 'band' ? W / 1.6 : Math.min(W, H)) * o.radius, cx0 = W / 2, cy0 = H / 2;
      if (o.glow) {
        const g = ctx.createRadialGradient(cx0, cy0, R * .2, cx0, cy0, R * 1.5);
        g.addColorStop(0, acc); g.addColorStop(1, 'transparent');
        ctx.globalAlpha = .12 + .12 * energy * speech; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rotX), sx = Math.sin(rotX);
      for (let i = 0; i < o.count; i++) {
        let [x, y, z] = pts[i];
        if (o.mode === 'band') { y *= .22; }
        const k = 1 + amp * Math.sin(y * 9 - t * 6) + (o.mode === 'band' ? amp * 2.2 * Math.sin(x * 7 + t * 5) : 0);
        x *= k; y *= (o.mode === 'band' ? 1 + amp * 6 * Math.sin(x * 6 - t * 7) : k); z *= k;
        const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
        const y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
        const p = 1.9 / (2.6 - z2), a = (z2 + 1.1) / 2.1;
        const isAcc = o.accentEvery && i % o.accentEvery === 0;
        ctx.globalAlpha = Math.max(.05, a * o.alpha);
        ctx.fillStyle = isAcc ? acc : ink;
        ctx.beginPath();
        ctx.arc(cx0 + x1 * R * p * (o.mode === 'band' ? 1.6 : 1), cy0 + y1 * R * p, (isAcc ? o.size * 1.7 : o.size) * p, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    const start = () => { if (running && !reduce) return; running = true; requestAnimationFrame(frame); };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    // wait for the first paint and the load event before any drawing work
    const boot = () => setTimeout(start, 120);
    if (document.readyState === 'complete') boot(); else addEventListener('load', boot, {once:true});
    return { pulse(v) { target = v || 1; energy = Math.max(energy, .4); }, calm() { target = .15; } };
  }

  window.BMSphere = BMSphere;
  window.BMReduce = reduce;
})();
