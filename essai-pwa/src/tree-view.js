// Mise en page de l'arborescence (ancêtres en haut, descendants vers le bas) + pan / pinch-zoom.
export const NODE_W = 168, NODE_H = 58, COL = 184, ROW = 132, PAD = 60;

export function layoutTree(persons, relations) {
  const ids = new Set(persons.map((p) => p.id));
  const byId = Object.fromEntries(persons.map((p) => [p.id, p]));
  const parents = {}, children = {}, spouses = {};
  for (const id of ids) { parents[id] = []; children[id] = []; spouses[id] = []; }
  for (const r of relations) {
    if (r.is_hidden || !ids.has(r.person_id) || !ids.has(r.related_id)) continue;
    if (r.kind === 'parent') {
      if (!parents[r.related_id].includes(r.person_id)) { parents[r.related_id].push(r.person_id); children[r.person_id].push(r.related_id); }
    } else if (!spouses[r.person_id].includes(r.related_id)) {
      spouses[r.person_id].push(r.related_id); spouses[r.related_id].push(r.person_id);
    }
  }

  // Génération = profondeur depuis les ancêtres ; un conjoint sans parents rejoint la ligne de son conjoint.
  const gen = Object.fromEntries([...ids].map((id) => [id, 0]));
  for (let pass = 0; pass <= ids.size; pass++) {
    let changed = false;
    for (const id of ids) {
      let g = gen[id];
      for (const p of parents[id]) g = Math.max(g, gen[p] + 1);
      for (const s of spouses[id]) if (!parents[id].length) g = Math.max(g, gen[s]);
      if (g !== gen[id] && g <= ids.size) { gen[id] = g; changed = true; }
    }
    if (!changed) break;
  }

  const rows = [];
  for (const id of ids) (rows[gen[id]] ??= []).push(id);
  const x = {}, y = {};
  const birth = (id) => byId[id].birth_date || '9999';
  const key = (id) => {
    const ps = parents[id].filter((p) => x[p] != null);
    if (ps.length) return ps.reduce((a, p) => a + x[p], 0) / ps.length;
    const sp = spouses[id].find((s) => parents[s].some((p) => x[p] != null));
    return sp ? key(sp) + 0.5 : Infinity;
  };
  let maxW = 0;
  const rowW = [];
  rows.forEach((row, g) => {
    if (!row) return;
    const sorted = row.slice().sort((a, b) => key(a) - key(b) || birth(a).localeCompare(birth(b)));
    const order = []; const placed = new Set();
    for (const id of sorted) {
      if (placed.has(id)) continue;
      order.push(id); placed.add(id);
      for (const s of spouses[id]) if (gen[s] === g && !placed.has(s)) { order.push(s); placed.add(s); }
    }
    order.forEach((id, i) => { x[id] = i * COL; y[id] = PAD + g * ROW; });
    rowW[g] = order.length * COL - (COL - NODE_W);
    maxW = Math.max(maxW, rowW[g]);
  });
  for (const id of ids) x[id] += PAD + (maxW - rowW[gen[id]]) / 2;

  // links = tracés (contrat du paquet) ; cords = les mêmes tracés avec leurs extrémités, pour la lumière des liens.
  const links = [], cords = [];
  const cx = (id) => x[id] + NODE_W / 2, cy = (id) => y[id] + NODE_H / 2;
  const seen = new Set();
  for (const a of ids) for (const b of spouses[a]) {
    const k = [a, b].sort().join(); if (seen.has(k)) continue; seen.add(k);
    const [l, r] = x[a] < x[b] ? [a, b] : [b, a];
    if (gen[a] === gen[b]) {
      const d = `M${x[l] + NODE_W},${cy(l)} L${x[r]},${cy(r)}`;
      links.push(d); cords.push({ d, kind: 'spouse', from: [l], to: r });
    }
  }
  for (const c of ids) {
    const ps = parents[c];
    if (!ps.length) continue;
    const couple = ps.length === 2 && spouses[ps[0]].includes(ps[1]) && gen[ps[0]] === gen[ps[1]];
    const ox = couple ? (cx(ps[0]) + cx(ps[1])) / 2 : cx(ps[0]);
    const oy = couple ? cy(ps[0]) : y[ps[0]] + NODE_H;
    const bus = y[c] - (ROW - NODE_H) / 2;
    const d = `M${ox},${oy} L${ox},${bus} L${cx(c)},${bus} L${cx(c)},${y[c]}`;
    links.push(d); cords.push({ d, kind: 'parent', from: couple ? ps.slice(0, 2) : [ps[0]], to: c });
  }

  const pos = Object.fromEntries([...ids].map((id) => [id, { x: x[id], y: y[id] }]));
  return { pos, links, cords, parents, children, spouses, width: maxW + PAD * 2, height: PAD * 2 + rows.length * ROW };
}

export class PanZoom {
  constructor(viewport, layer, onChange) {
    // rot = 90 quand la vue est pivotée par CSS (repli « Vue Panoramique », app.css body.pano-css).
    Object.assign(this, { vp: viewport, layer, onChange, s: 1, x: 0, y: 0, pts: new Map(), dragged: false, rot: 0 });
    this.bind();
  }
  clamp(s) { return Math.min(2.5, Math.max(0.2, s)); }
  apply() {
    this.layer.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) scale(${this.s})`;
    this.onChange?.(this.s, this.x, this.y);
  }
  zoomAt(ns, cx, cy, dx = 0, dy = 0) {
    ns = this.clamp(ns); const k = ns / this.s;
    this.x = cx - (cx - this.x) * k + dx; this.y = cy - (cy - this.y) * k + dy; this.s = ns;
    this.apply();
  }
  // Tailles de mise en page (clientWidth/Height) : justes même quand la vue est pivotée.
  zoomBy(step) { this.zoomAt(this.s + step, this.vp.clientWidth / 2, this.vp.clientHeight / 2); }
  area(inset) {
    const w = this.vp.clientWidth, h = this.vp.clientHeight;
    return { l: inset.left, t: inset.top, w: w - inset.left - inset.right, h: h - inset.top - inset.bottom };
  }
  fit(w, h, inset) {
    const a = this.area(inset);
    this.s = this.clamp(Math.min((a.w - 24) / w, (a.h - 24) / h, 1.2));
    this.x = a.l + (a.w - w * this.s) / 2; this.y = a.t + (a.h - h * this.s) / 2;
    this.apply();
  }
  centerOn(px, py, s, inset) {
    const a = this.area(inset); this.s = this.clamp(s);
    this.x = a.l + a.w / 2 - px * this.s; this.y = a.t + a.h / 2 - py * this.s;
    this.apply();
  }
  bind() {
    const vp = this.vp; let last = null, start = null;
    // Point du doigt dans le repère de la vue ; vue pivotée de 90° (sens horaire) : x = vers le bas de l'écran,
    // y = vers la gauche de l'écran.
    const pt = (e) => {
      const r = vp.getBoundingClientRect();
      return this.rot === 90 ? { x: e.clientY - r.top, y: r.right - e.clientX } : { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const pinch = () => { const [a, b] = [...this.pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; };
    vp.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      const p = pt(e); this.pts.set(e.pointerId, p);
      if (this.pts.size === 1) { start = p; this.dragged = false; }
      last = this.pts.size === 2 ? pinch() : p;
      vp.classList.add('grabbing');
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.pts.has(e.pointerId)) return;
      const p = pt(e); this.pts.set(e.pointerId, p);
      if (Math.hypot(p.x - start.x, p.y - start.y) > 6) this.dragged = true;
      if (this.pts.size === 2) {
        const q = pinch(); this.dragged = true;
        this.zoomAt(this.s * (q.d / last.d), q.cx, q.cy, q.cx - last.cx, q.cy - last.cy); last = q;
      } else { this.x += p.x - last.x; this.y += p.y - last.y; last = p; this.apply(); }
    });
    const up = (e) => {
      if (!this.pts.delete(e.pointerId)) return;
      if (this.pts.size === 1) last = [...this.pts.values()][0];
      if (!this.pts.size) vp.classList.remove('grabbing');
    };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    vp.addEventListener('wheel', (e) => { e.preventDefault(); const p = pt(e); this.zoomAt(this.s * Math.exp(-e.deltaY * 0.0015), p.x, p.y); }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault()); // Safari iOS : pas de zoom page
  }
}
