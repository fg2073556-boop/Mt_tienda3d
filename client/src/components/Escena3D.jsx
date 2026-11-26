import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { INTERIOR, NOMBRES } from '../lib/piezas.js';
const COLORES = [
  { c: '#36e39a', n: 'menta' }, { c: '#22d3ee', n: 'cian' }, { c: '#e879f9', n: 'magenta' }, { c: '#fbbf24', n: 'ámbar' },
  { c: 'arcoiris', n: 'arcoíris', bg: 'conic-gradient(#f43f5e,#fbbf24,#36e39a,#22d3ee,#a78bfa,#f43f5e)' },
];

/**
 * Escritorio con PC gamer en 3D. Cada pieza se puede tocar (onSeleccion) y la torre se desarma.
 * Si una pieza tiene modelo .glb en `piezas`, reemplaza a la pieza dibujada.
 */
export default function Escena3D({ piezas, seleccion, onSeleccion }) {
  const figRef = useRef(null);
  const labelsRef = useRef(null);
  const escena = useRef(null);
  const onSelRef = useRef(onSeleccion);
  onSelRef.current = onSeleccion;

  const reducir = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [desarmada, setDesarmada] = useState(false);
  const [giro, setGiro] = useState(!reducir);
  const [color, setColor] = useState('#36e39a');
  const [sinWebGL, setSinWebGL] = useState(false);

  // Crea la escena una sola vez
  useEffect(() => {
    const fig = figRef.current, lab = labelsRef.current;
    // El lienzo se crea aquí (y se desecha al salir) para poder liberar su contexto de WebGL sin afectar al siguiente
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-label', 'Escena 3D de un escritorio con PC gamer');
    fig.prepend(cv);
    let R;
    try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch { cv.remove(); setSinWebGL(true); return undefined; }
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    R.outputColorSpace = THREE.SRGBColorSpace;

    const S = new THREE.Scene(), C = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    S.add(new THREE.HemisphereLight(0xbfefff, 0x061018, 0.8));
    const kl = new THREE.DirectionalLight(0xffffff, 0.9); kl.position.set(3, 5, 4); S.add(kl);
    const rl = new THREE.DirectionalLight(0x36e39a, 0.5); rl.position.set(-4, 3, -3); S.add(rl);
    const M = (c, o) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.25, ...o });
    const rgb = new THREE.MeshStandardMaterial({ color: 0x36e39a, emissive: 0x36e39a, emissiveIntensity: 1.5, roughness: 0.3 });
    let pick = []; const aspas = [];
    const box = (w, h, d, m, x, y, z, par, k) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); par.add(o); if (k) { o.userData.part = k; pick.push(o); } return o; };

    const piso = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), M(0x0b1c23, { roughness: 0.95, metalness: 0 })); piso.rotation.x = -Math.PI / 2; S.add(piso);
    const ringM = new THREE.MeshBasicMaterial({ color: 0x36e39a, transparent: true, opacity: 0.45 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.13, 96), ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.003; S.add(ring);
    const madera = M(0x2c3c42, { roughness: 0.7, metalness: 0.1 }), acero = M(0x8a979c, { metalness: 0.8, roughness: 0.35 }), oscuro = M(0x111a1e, { roughness: 0.4, metalness: 0.5 });

    // Escritorio
    const desk = new THREE.Group(); S.add(desk);
    box(2.4, 0.05, 1.05, madera, 0, 0.75, 0, desk, 'desk');
    [[-1.12, -0.46], [1.12, -0.46], [-1.12, 0.46], [1.12, 0.46]].forEach(([x, z]) => box(0.05, 0.73, 0.05, acero, x, 0.365, z, desk, 'desk'));

    // Monitor con pantalla de la marca
    const mon = new THREE.Group(); mon.position.set(-0.45, 0.775, -0.22); S.add(mon);
    box(0.34, 0.02, 0.2, oscuro, 0, 0.01, 0, mon, 'monitor'); box(0.05, 0.36, 0.04, oscuro, 0, 0.19, -0.03, mon, 'monitor'); box(1.12, 0.66, 0.035, oscuro, 0, 0.62, 0, mon, 'monitor');
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 300; const g = sc.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 512, 300); gr.addColorStop(0, '#05261c'); gr.addColorStop(1, '#0a3d4d'); g.fillStyle = gr; g.fillRect(0, 0, 512, 300);
    g.textAlign = 'center'; g.fillStyle = '#36e39a'; g.font = 'bold 96px sans-serif'; g.fillText('M&T', 256, 140); g.fillStyle = '#bfefff'; g.font = '26px sans-serif'; g.fillText('Soluciones integrales de PC', 256, 188);
    for (let i = 0; i < 12; i++) { const h = 10 + i * 5; g.fillStyle = `rgba(54,227,154,${0.25 + i * 0.05})`; g.fillRect(48 + i * 36, 286 - h, 22, h); }
    const tex = new THREE.CanvasTexture(sc); tex.colorSpace = THREE.SRGBColorSpace;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.6), new THREE.MeshBasicMaterial({ map: tex })); scr.position.set(0, 0.62, 0.019); scr.userData.part = 'monitor'; pick.push(scr); mon.add(scr);

    // Teclado y mouse
    const kb = new THREE.Group(); kb.position.set(-0.45, 0.775, 0.26); S.add(kb);
    box(0.72, 0.025, 0.22, oscuro, 0, 0.0125, 0, kb, 'kb'); box(0.7, 0.004, 0.2, rgb, 0, 0.001, 0, kb, null); box(0.06, 0.03, 0.1, oscuro, 0.5, 0.015, 0, kb, 'kb');

    // Torre: cada pieza guarda su posición normal y cuánto se mueve al desarmar
    const pc = new THREE.Group(); pc.position.set(0.72, 0.775, -0.1); S.add(pc);
    const L = 0.86, H = 0.92, W = 0.42, parts = {};
    const part = (k, x, y, z, off) => { const gp = new THREE.Group(); gp.position.set(x, y, z); pc.add(gp); parts[k] = { g: gp, home: gp.position.clone(), off: new THREE.Vector3(...off) }; return gp; };
    const fan = (par, x, y, z, ax, r, k) => {
      const f = new THREE.Group(); f.position.set(x, y, z);
      const rg = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.09, 10, 48), rgb); f.add(rg);
      const bl = new THREE.Group();
      for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(r * 0.8, r * 0.3, 0.006), M(0x2a3a40, { transparent: true, opacity: 0.9 })); b.position.x = r * 0.45; b.rotation.x = 0.5; const pv = new THREE.Group(); pv.rotation.z = i * Math.PI * 2 / 7; pv.add(b); bl.add(pv); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.25, r * 0.25, 0.02, 24), M(0x111a1e)); hub.rotation.x = Math.PI / 2; bl.add(hub); f.add(bl); aspas.push(bl);
      rg.userData.part = k; hub.userData.part = k; pick.push(rg, hub);
      if (ax === 'x') f.rotation.y = Math.PI / 2; if (ax === 'y') f.rotation.x = Math.PI / 2;
      par.add(f); return f;
    };
    const carcasa = M(0x151e22, { metalness: 0.6, roughness: 0.4 });
    const gab = part('gab', 0, 0, 0, [0, 0, 0]);
    box(L, 0.02, W, carcasa, 0, 0.01, 0, gab, 'gab'); box(L, 0.02, W, carcasa, 0, H - 0.01, 0, gab, 'gab'); box(L, H, 0.02, carcasa, 0, H / 2, -W / 2 + 0.01, gab, 'gab');
    box(0.02, H, W, carcasa, L / 2 - 0.01, H / 2, 0, gab, 'gab'); box(0.02, H, W, M(0x0e1518, { metalness: 0.3, roughness: 0.6 }), -L / 2 + 0.01, H / 2, 0, gab, 'gab');
    box(0.62, 0.64, 0.012, M(0x0d2a22, { roughness: 0.8 }), 0.08, 0.56, -W / 2 + 0.028, gab, 'gab');
    const vidrioG = part('glass', 0, 0, 0, [0, 0.05, 0.95]);
    const vidrioM = new THREE.MeshStandardMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.1 });
    const vidrio = new THREE.Mesh(new THREE.BoxGeometry(L - 0.02, H - 0.02, 0.01), vidrioM); vidrio.position.set(0, H / 2, W / 2 - 0.005); vidrioG.add(vidrio);
    const cpu = part('cpu', 0.05, 0.68, -W / 2 + 0.042, [0, 0.12, 0.5]); box(0.09, 0.09, 0.012, M(0xb9c2c6, { metalness: 0.9, roughness: 0.25 }), 0, 0, 0, cpu, 'cpu');
    const cool = part('cooler', 0.05, 0.68, -W / 2 + 0.08, [0, 0.18, 0.78]);
    const bomba = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 40), M(0x1b2428, { metalness: 0.7 })); bomba.rotation.x = Math.PI / 2; bomba.userData.part = 'cooler'; pick.push(bomba); cool.add(bomba);
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.006, 10, 48), rgb); anillo.position.z = 0.027; cool.add(anillo);
    box(0.52, 0.04, 0.28, M(0x20292d, { metalness: 0.5 }), -0.06, 0.18, 0.13, cool, 'cooler'); fan(cool, -0.19, 0.14, 0.13, 'y', 0.1, 'cooler'); fan(cool, 0.07, 0.14, 0.13, 'y', 0.1, 'cooler');
    const ram = part('ram', 0.2, 0.68, -W / 2 + 0.06, [0.2, 0.1, 0.62]);
    for (let i = 0; i < 2; i++) { box(0.014, 0.2, 0.05, M(0x1a2226), i * 0.035, 0, 0, ram, 'ram'); box(0.015, 0.02, 0.05, rgb, i * 0.035, 0.11, 0, ram, 'ram'); }
    const gpu = part('gpu', 0.02, 0.42, -W / 2 + 0.15, [-0.05, -0.06, 0.9]);
    box(0.56, 0.07, 0.24, M(0x1d262a, { metalness: 0.6 }), 0, 0, 0, gpu, 'gpu'); box(0.56, 0.012, 0.006, rgb, 0, 0, 0.122, gpu, null); fan(gpu, -0.13, -0.045, 0, 'y', 0.085, 'gpu'); fan(gpu, 0.14, -0.045, 0, 'y', 0.085, 'gpu');
    const ssd = part('ssd', -0.04, 0.53, -W / 2 + 0.04, [-0.2, -0.02, 0.55]); box(0.14, 0.03, 0.008, M(0x0f3b52), 0, 0, 0, ssd, 'ssd');
    const psu = part('psu', 0.2, 0.1, 0, [0.18, -0.12, 0.72]); box(0.36, 0.16, 0.34, M(0x0c1214, { metalness: 0.5 }), 0, 0, 0, psu, 'psu'); box(0.3, 0.012, 0.004, rgb, 0, 0.04, 0.172, psu, null);
    const fans = part('fans', -L / 2 + 0.06, 0, 0, [-0.5, 0, 0.25]); for (let i = 0; i < 3; i++) fan(fans, 0, 0.2 + 0.26 * i, 0, 'x', 0.1, 'fans');
    const luz = new THREE.PointLight(0x36e39a, 1.4, 1.7); luz.position.set(0, 0.5, 0); pc.add(luz);

    const objetivos = { gab: pc, monitor: mon, kb, desk }; INTERIOR.forEach((k) => { objetivos[k] = parts[k].g; });

    // Etiquetas HTML que siguen a las piezas
    const LBL = ['cpu', 'cooler', 'ram', 'gpu', 'ssd', 'psu', 'fans', 'monitor', 'kb'];
    const spans = {}; LBL.forEach((k) => { const s = document.createElement('span'); s.textContent = NOMBRES[k]; lab.append(s); spans[k] = s; });

    // Estado que cambia desde React
    const st = { ex: false, auto: !reducir, arcoiris: false, hue: 0.42, sel: null, drag: null, theta: 0.42, phi: 1.13, dist: 3.7, goalDist: 3.7, thGoal: null };
    const distBase = () => (st.ex ? 3.1 : 3.7) * (C.aspect < 1 ? 1.5 : 1);
    const tCasa = new THREE.Vector3(0.2, 1.0, 0), tDentro = new THREE.Vector3(0.72, 1.22, 0.15), tgt = tCasa.clone();
    let marco = null;

    const pintar = (c) => { rgb.color.copy(c); rgb.emissive.copy(c); luz.color.copy(c); ringM.color.copy(c); };
    const cargados = new Set();
    const loader = new GLTFLoader();

    escena.current = {
      seleccionar(k) {
        st.sel = k;
        if (marco) { S.remove(marco); marco.dispose(); marco = null; }
        if (objetivos[k]) { marco = new THREE.BoxHelper(objetivos[k], 0x36e39a); S.add(marco); }
      },
      desarmar(v) {
        st.ex = v; st.goalDist = distBase();
        if (v) { const tau = Math.PI * 2; st.thGoal = st.theta + ((((0.3 - st.theta) % tau) + tau * 1.5) % tau - Math.PI); st.phi = Math.min(st.phi, 1.2); }
      },
      girar(v) { st.auto = v; },
      color(c) { st.arcoiris = c === 'arcoiris'; if (!st.arcoiris) pintar(new THREE.Color(c)); },
      // Reemplaza la pieza dibujada por el modelo .glb que se subió desde el panel
      modelos(datos) {
        Object.entries(datos || {}).forEach(([k, p]) => {
          if (!p.modelo_url || !objetivos[k] || cargados.has(k)) return;
          cargados.add(k);
          loader.load(p.modelo_url, (gltf) => {
            const holder = k === 'gab' ? gab : objetivos[k];
            const antes = new THREE.Box3().setFromObject(holder), tam = antes.getSize(new THREE.Vector3()), centro = antes.getCenter(new THREE.Vector3());
            const modelo = gltf.scene, ms = new THREE.Box3().setFromObject(modelo).getSize(new THREE.Vector3());
            const escala = Math.min(tam.x / (ms.x || 1), tam.y / (ms.y || 1), tam.z / (ms.z || 1));
            holder.children.forEach((c) => { c.visible = false; c.traverse((o) => { pick = pick.filter((x) => x !== o); }); });
            modelo.scale.setScalar(escala);
            const mc = new THREE.Box3().setFromObject(modelo).getCenter(new THREE.Vector3());
            const envoltura = new THREE.Group(); envoltura.add(modelo); modelo.position.sub(mc);
            envoltura.position.copy(holder.worldToLocal(centro.clone()));
            modelo.traverse((o) => { if (o.isMesh) { o.userData.part = k; pick.push(o); } });
            holder.add(envoltura);
          }, undefined, () => console.warn('No se pudo cargar el modelo 3D de', k));
        });
      },
    };

    // Ratón y dedo: arrastrar gira, tocar selecciona
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const tocar = (e) => { const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, C); const h = ray.intersectObjects(pick, false)[0]; return h && h.object.userData.part; };
    const down = (e) => { st.drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; cv.setPointerCapture(e.pointerId); };
    const move = (e) => {
      if (st.drag) { st.theta -= (e.clientX - st.drag.x) * 0.008; st.phi = Math.min(1.45, Math.max(0.4, st.phi - (e.clientY - st.drag.y) * 0.006)); st.drag.x = e.clientX; st.drag.y = e.clientY; st.thGoal = null; }
      else cv.style.cursor = tocar(e) ? 'pointer' : 'grab';
    };
    const up = (e) => { if (st.drag && Math.hypot(e.clientX - st.drag.sx, e.clientY - st.drag.sy) < 6) { const k = tocar(e); if (k) onSelRef.current?.(k); } st.drag = null; };
    const cancel = () => { st.drag = null; };
    const wheel = (e) => { e.preventDefault(); st.goalDist = Math.min(7, Math.max(1.8, st.goalDist * (1 + Math.sign(e.deltaY) * 0.1))); };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', cancel); cv.addEventListener('wheel', wheel, { passive: false });

    const ro = new ResizeObserver(() => { const w = fig.clientWidth, h = fig.clientHeight; R.setSize(w, h, false); C.aspect = w / h; C.updateProjectionMatrix(); st.goalDist = distBase(); });
    ro.observe(fig);

    const v3 = new THREE.Vector3();
    let last = performance.now(), raf = 0;
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now; const k = 1 - Math.pow(0.02, dt);
      if (st.thGoal !== null) { st.theta += (st.thGoal - st.theta) * k; if (Math.abs(st.thGoal - st.theta) < 0.002) st.thGoal = null; }
      else if (st.auto && !st.drag) st.theta += dt * 0.16;
      aspas.forEach((b) => { b.rotation.z += dt * (reducir ? 1.5 : 9); });
      if (st.arcoiris) { st.hue = (st.hue + dt * 0.07) % 1; pintar(new THREE.Color().setHSL(st.hue, 0.85, 0.55)); }
      Object.values(parts).forEach((p) => { const meta = p.home.clone(); if (st.ex) meta.add(p.off); p.g.position.lerp(meta, k); });
      vidrioM.opacity += ((st.ex ? 0.05 : 0.14) - vidrioM.opacity) * k;
      tgt.lerp(st.ex ? tDentro : tCasa, k); st.dist += (st.goalDist - st.dist) * k;
      C.position.set(tgt.x + st.dist * Math.sin(st.phi) * Math.sin(st.theta), tgt.y + st.dist * Math.cos(st.phi), tgt.z + st.dist * Math.sin(st.phi) * Math.cos(st.theta)); C.lookAt(tgt);
      if (marco) marco.update();
      const w = fig.clientWidth, h = fig.clientHeight;
      LBL.forEach((key) => {
        const s = spans[key], ver = (st.ex && INTERIOR.includes(key)) || key === st.sel;
        s.classList.toggle('on', ver); s.classList.toggle('sel', key === st.sel);
        if (!ver) return;
        const bb = new THREE.Box3().setFromObject(objetivos[key]); bb.getCenter(v3); v3.y = bb.max.y; v3.project(C);
        s.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px,${(-v3.y * 0.5 + 0.5) * h}px) translate(-50%,-135%)`;
      });
      R.render(S, C);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', cancel); cv.removeEventListener('wheel', wheel);
      S.traverse((o) => { o.geometry?.dispose(); [].concat(o.material || []).forEach((m) => { m.map?.dispose(); m.dispose(); }); });
      R.dispose(); R.forceContextLoss(); cv.remove(); lab.replaceChildren(); escena.current = null;
    };
  }, [reducir]);

  // Sincroniza React → escena
  useEffect(() => { escena.current?.desarmar(desarmada); }, [desarmada]);
  useEffect(() => { escena.current?.girar(giro); }, [giro]);
  useEffect(() => { escena.current?.color(color); }, [color]);
  useEffect(() => { escena.current?.modelos(piezas); }, [piezas]);
  useEffect(() => {
    escena.current?.seleccionar(seleccion);
    if (INTERIOR.includes(seleccion)) { setDesarmada(true); setGiro(false); }
  }, [seleccion]);
  useEffect(() => { if (desarmada) setGiro(false); }, [desarmada]);

  return (
    <div>
      <div className={`escena${sinWebGL ? ' sin-webgl' : ''}`} ref={figRef}>
        <div className="etiquetas" ref={labelsRef} />
        <div className="pista">Arrastra para girar · rueda para acercar · toca una pieza</div>
      </div>
      <div className="d-flex flex-wrap gap-2 mt-3 align-items-center">
        <button type="button" className="btn btn-escena" aria-pressed={desarmada} onClick={() => setDesarmada(!desarmada)}>
          {desarmada ? 'Armar de nuevo' : 'Ver por dentro'}
        </button>
        <button type="button" className="btn btn-escena" aria-pressed={giro} onClick={() => setGiro(!giro)}>Giro automático</button>
        <span className="flex-grow-1" />
        {COLORES.map(({ c, n, bg }) => (
          <button key={c} type="button" className="muestra" style={{ background: bg || c }} aria-label={`Luz ${n}`} aria-pressed={color === c} onClick={() => setColor(c)} />
        ))}
      </div>
    </div>
  );
}
