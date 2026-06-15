/* ============================================================
   ValidationCrew — animated world map (canvas)
   Dot-matrix continents · pulsing city nodes · traveling arcs
   VCMap.create(canvasEl, { dark, dotColor, nodeColor, arcColor, density })
   ============================================================ */
(function () {
  // rough continent silhouettes in [lon, lat] — rasterised to dots
  const CONTINENTS = [
    [[-168,66],[-160,71],[-128,70],[-95,72],[-82,73],[-60,66],[-56,52],[-66,45],[-70,42],[-81,25],[-97,18],[-105,22],[-114,29],[-124,40],[-125,48],[-140,60],[-152,58]],
    [[-81,8],[-70,11],[-60,5],[-50,0],[-35,-6],[-38,-15],[-48,-25],[-58,-34],[-66,-45],[-74,-52],[-72,-40],[-70,-20],[-76,-12],[-81,2]],
    [[-10,36],[-2,43],[3,48],[10,54],[5,58],[10,64],[24,70],[30,66],[28,56],[40,52],[28,44],[20,40],[10,38]],
    [[-17,33],[-5,36],[10,37],[24,33],[34,31],[44,12],[51,12],[42,-2],[40,-16],[32,-28],[20,-35],[16,-30],[12,-16],[8,4],[-8,5],[-17,15]],
    [[28,44],[40,48],[50,52],[60,52],[68,55],[80,55],[95,52],[110,55],[125,52],[140,55],[145,48],[140,40],[122,30],[120,22],[108,12],[95,20],[88,22],[78,8],[72,20],[60,25],[48,30],[40,38]],
    [[114,-22],[122,-18],[132,-12],[142,-12],[148,-20],[153,-28],[146,-38],[138,-35],[129,-32],[120,-34],[114,-28]],
  ];
  const CITIES = [
    { n: "San Francisco", lon: -122, lat: 38 }, { n: "New York", lon: -74, lat: 41 },
    { n: "Toronto", lon: -79, lat: 44 }, { n: "São Paulo", lon: -47, lat: -23 },
    { n: "London", lon: 0, lat: 51 }, { n: "Berlin", lon: 13, lat: 52 },
    { n: "Paris", lon: 2, lat: 49 }, { n: "Lagos", lon: 3, lat: 6 },
    { n: "Nairobi", lon: 37, lat: -1 }, { n: "Dubai", lon: 55, lat: 25 },
    { n: "Mumbai", lon: 73, lat: 19 }, { n: "Bengaluru", lon: 78, lat: 13 },
    { n: "Singapore", lon: 104, lat: 1 }, { n: "Jakarta", lon: 107, lat: -6 },
    { n: "Tokyo", lon: 140, lat: 36 }, { n: "Seoul", lon: 127, lat: 38 },
    { n: "Sydney", lon: 151, lat: -34 },
  ];

  function inPoly(x, y, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  const isLand = (lon, lat) => CONTINENTS.some(p => inPoly(lon, lat, p));

  VCMap = {
    create(canvas, opts) {
      opts = opts || {};
      const dark = !!opts.dark;
      const dotColor = opts.dotColor || (dark ? "rgba(150,160,220,0.5)" : "rgba(120,124,200,0.45)");
      const nodeColor = opts.nodeColor || "#6d5cff";
      const arcColor = opts.arcColor || (dark ? "rgba(141,123,255,0.85)" : "rgba(109,92,255,0.7)");
      const step = opts.density || 3.4;            // degrees between dots
      const ctx = canvas.getContext("2d");
      let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      let mapW, mapH, ox, oy;

      // land points in lon/lat (computed once)
      const dots = [];
      for (let lat = 80; lat >= -56; lat -= step) {
        for (let lon = -170; lon <= 178; lon += step) {
          if (isLand(lon, lat)) dots.push([lon, lat]);
        }
      }
      const proj = (lon, lat) => ({ x: ox + ((lon + 180) / 360) * mapW, y: oy + ((90 - lat) / 180) * mapH });

      // offscreen static dot layer
      const layer = document.createElement("canvas");
      const lctx = layer.getContext("2d");

      const arcs = [];
      function spawnArc() {
        const a = CITIES[(Math.random() * CITIES.length) | 0];
        let b = CITIES[(Math.random() * CITIES.length) | 0], guard = 0;
        while (b === a && guard++ < 5) b = CITIES[(Math.random() * CITIES.length) | 0];
        arcs.push({ a, b, t: 0, speed: 0.006 + Math.random() * 0.006 });
      }

      function resize() {
        const r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) return;
        W = r.width; H = r.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const pad = Math.min(W, H) * 0.05;
        mapW = W - pad * 2;
        mapH = mapW * 0.52;
        if (mapH > H - pad * 2) { mapH = H - pad * 2; mapW = mapH / 0.52; }
        ox = (W - mapW) / 2; oy = (H - mapH) / 2;
        // render static dot layer once
        layer.width = W * dpr; layer.height = H * dpr;
        lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lctx.clearRect(0, 0, W, H);
        lctx.fillStyle = dotColor;
        const s = Math.max(1.4, mapW / 460);
        for (let i = 0; i < dots.length; i++) {
          const p = proj(dots[i][0], dots[i][1]);
          lctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        }
      }

      let frame = 0, raf = null, visible = true;
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      function draw() {
        raf = null;
        if (!W) { schedule(); return; }
        frame++;
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(layer, 0, 0, W, H);

        if (!reduce) {
          if (frame % 46 === 0 && arcs.length < 5) spawnArc();
          ctx.lineCap = "round";
          for (let i = arcs.length - 1; i >= 0; i--) {
            const arc = arcs[i]; arc.t += arc.speed;
            const pa = proj(arc.a.lon, arc.a.lat), pb = proj(arc.b.lon, arc.b.lat);
            const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
            const dist = Math.hypot(pb.x - pa.x, pb.y - pa.y);
            const cx = mx, cy = my - dist * 0.34;
            ctx.strokeStyle = arcColor; ctx.globalAlpha = 0.12; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.quadraticCurveTo(cx, cy, pb.x, pb.y); ctx.stroke();
            const t = Math.min(1, arc.t), tt = Math.max(0, t - 0.18);
            const bz = (u, p0, c, p1) => (1 - u) * (1 - u) * p0 + 2 * (1 - u) * u * c + u * u * p1;
            const hx = bz(t, pa.x, cx, pb.x), hy = bz(t, pa.y, cy, pb.y);
            const sx = bz(tt, pa.x, cx, pb.x), sy = bz(tt, pa.y, cy, pb.y);
            const g = ctx.createLinearGradient(sx, sy, hx, hy);
            g.addColorStop(0, "rgba(109,92,255,0)"); g.addColorStop(1, arcColor);
            ctx.globalAlpha = 0.9; ctx.lineWidth = 1.6; ctx.strokeStyle = g;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, hx, hy); ctx.stroke();
            ctx.globalAlpha = 1; ctx.fillStyle = "#8b7bff";
            ctx.beginPath(); ctx.arc(hx, hy, 2.3, 0, 7); ctx.fill();
            if (arc.t >= 1.06) arcs.splice(i, 1);
          }
          ctx.globalAlpha = 1;
        }

        // city nodes
        for (let i = 0; i < CITIES.length; i++) {
          const p = proj(CITIES[i].lon, CITIES[i].lat);
          const pulse = reduce ? 0.4 : (Math.sin(frame * 0.045 + i) * 0.5 + 0.5);
          ctx.strokeStyle = nodeColor; ctx.globalAlpha = 0.5 * (1 - pulse); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3 + pulse * 7, 0, 7); ctx.stroke();
          ctx.globalAlpha = 1; ctx.fillStyle = nodeColor;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.9;
          ctx.beginPath(); ctx.arc(p.x, p.y, 0.9, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (visible && !reduce) schedule();
      }
      function schedule() { if (raf == null) raf = requestAnimationFrame(draw); }

      resize();
      const ro = new ResizeObserver(() => { resize(); draw(); });
      ro.observe(canvas);
      // pause when offscreen
      const vio = new IntersectionObserver((es) => {
        es.forEach(e => { visible = e.isIntersecting; if (visible) schedule(); });
      }, { threshold: 0.01 });
      vio.observe(canvas);
      spawnArc(); spawnArc();
      draw();
      return { destroy() { if (raf) cancelAnimationFrame(raf); ro.disconnect(); vio.disconnect(); } };
    },
  };
  window.VCMap = VCMap;
})();
