import { useEffect, useRef, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { THREE, M, rgbTex } from '../modelos3d/base.js';
import { escritorio, marcar, monitor, pcGamer, silla, tecladoMouse } from '../modelos3d/equipos.js';
import { crearRenderer } from '../modelos3d/escenario.js';
import { INTERIOR, NOMBRES } from '../lib/piezas.js';

const COLORES = [
  { c: '#36e39a', n: 'menta' }, { c: '#22d3ee', n: 'cian' }, { c: '#e879f9', n: 'magenta' }, { c: '#fbbf24', n: 'ámbar' },
  { c: 'arcoiris', n: 'arcoíris', bg: 'conic-gradient(#f43f5e,#fbbf24,#36e39a,#22d3ee,#a78bfa,#f43f5e)' },
];

/** Quita la rotación de presentación que traen los modelos para acomodarlos en la escena */
const enEscena = (m, x, y, z, ry = 0) => { m.g.rotation.set(0, ry, 0); m.g.position.set(x, y, z); return m; };

/**
 * Showroom: escritorio con la PC Fénix y sus refacciones reales (las mismas piezas 3D del catálogo).
 * Cada pieza se puede tocar (onSeleccion) y la torre se desarma para ver el interior.
 * Si una pieza tiene modelo .glb en `piezas`, reemplaza a la pieza hecha con código.
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
  const [color, setColor] = useState('arcoiris');
  const [sinWebGL, setSinWebGL] = useState(false);

  // Crea la escena una sola vez
  useEffect(() => {
    const fig = figRef.current, lab = labelsRef.current;
    // El lienzo se crea aquí (y se desecha al salir) para poder liberar su contexto de WebGL sin afectar al siguiente
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-label', 'Escena 3D de un escritorio con la PC Fénix y sus refacciones');
    fig.prepend(cv);
    let R;
    try { R = crearRenderer({ canvas: cv }); } catch { cv.remove(); setSinWebGL(true); return undefined; }

    const S = new THREE.Scene(), C = new THREE.PerspectiveCamera(36, 1, 0.05, 60);
    const pm = new THREE.PMREMGenerator(R);
    S.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    S.add(new THREE.HemisphereLight(0xbfefff, 0x061018, 0.35));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(2.2, 4, 2.6); sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0004;
    Object.assign(sol.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: 0.5, far: 10 });
    S.add(sol);
    const contra = new THREE.DirectionalLight(0x36e39a, 0.7); contra.position.set(-3, 2.5, -2.5); S.add(contra);

    // Piso con aro de luz
    const piso = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.MeshStandardMaterial({ color: 0x0b1c23, roughness: 0.95 }));
    piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; S.add(piso);
    const ringM = new THREE.MeshBasicMaterial({ color: 0x36e39a, transparent: true, opacity: 0.45 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.13, 96), ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.003; S.add(ring);

    // Mundo en centímetros (los modelos están a escala real) dentro de una escena en metros
    const mundo = new THREE.Group(); mundo.scale.setScalar(0.01); S.add(mundo);
    const cubierta = 74 + 1.25;
    const desk = enEscena(escritorio(), 0, 0, 0);
    const mon = enEscena(monitor(), -26, cubierta, -18, 0.08);
    const kb = enEscena(tecladoMouse(), -24, cubierta, 14);
    const pc = enEscena(pcGamer(), 42, cubierta + 1.2, -6, Math.PI / 2); // vidrio hacia el frente
    const chair = enEscena(silla(), -12, 0, 78, Math.PI + 0.25);
    [desk, mon, kb, chair].forEach((m) => { mundo.add(m.g); });
    mundo.add(pc.g);
    // la luz interior del modelo está pensada en centímetros; aquí se usa una propia
    const luces = []; pc.g.traverse((o) => { if (o.isLight) luces.push(o); }); luces.forEach((l) => l.removeFromParent());
    marcar(desk.g, 'desk'); marcar(mon.g, 'monitor'); marcar(kb.g, 'kb'); marcar(chair.g, 'silla');

    // Materiales: plásticos con reflejos suaves, metales con reflejos completos
    const mallas = [];
    mundo.traverse((o) => {
      if (o.userData.gira) o.userData.rotor = true;
      if (!o.isMesh) return;
      mallas.push(o);
      [].concat(o.material).forEach((m) => { if (!m.userData.ajustado) { m.userData.ajustado = true; m.envMapIntensity = m.emissiveMap ? 1 : m.metalness >= 0.5 ? 1 : 0.32; } });
    });
    const rotores = []; mundo.traverse((o) => { if (o.userData.gira) rotores.push(o); });

    // Objetos que representan cada pieza (para el recuadro de selección y las etiquetas)
    const objetivos = { ...pc.piezas, desk: [desk.g], monitor: [mon.g], kb: [kb.g], silla: [chair.g] };
    const cajaDe = (k) => { const b = new THREE.Box3(); (objetivos[k] || []).forEach((o) => { if (o.visible !== false) b.expandByObject(o); }); return b; };
    pc.partes.forEach((p) => { p.base = p.obj.position.clone(); p.off = new THREE.Vector3(...p.off); });

    // Etiquetas HTML que siguen a las piezas
    const LBL = [...INTERIOR, 'monitor', 'kb', 'silla'];
    const spans = {}; LBL.forEach((k) => { const s = document.createElement('span'); s.textContent = NOMBRES[k]; lab.append(s); spans[k] = s; });

    // Estado que cambia desde React
    const st = { ex: 0, exGoal: 0, auto: !reducir, arcoiris: true, sel: null, drag: null, theta: 0.42, phi: 1.12, dist: 3.4, goalDist: 3.4, thGoal: null };
    const distBase = () => (st.exGoal ? 1.6 : 3.4) * (C.aspect < 1 ? 1.5 : 1);
    const tCasa = new THREE.Vector3(0.1, 0.92, 0.1), tDentro = new THREE.Vector3(0.42, 0.98, -0.06), tgt = tCasa.clone();
    let marco = null;

    // Color de la iluminación RGB: un color fijo o el degradado arcoíris animado
    const luzInterior = new THREE.PointLight(0x36e39a, 0.9, 1.2, 2); luzInterior.position.set(0.42, 1.05, 0.06); S.add(luzInterior);
    const pintar = (c) => {
      if (c === 'arcoiris') {
        Object.assign(M.rgb, { map: rgbTex, emissiveMap: rgbTex }); M.rgb.color.set(0xffffff); M.rgb.emissive.set(0xffffff);
        ringM.color.set(0x36e39a); luzInterior.color.set(0xbfe9ff);
      } else {
        Object.assign(M.rgb, { map: null, emissiveMap: null }); M.rgb.color.set(c); M.rgb.emissive.set(c);
        ringM.color.set(c); luzInterior.color.set(c);
      }
      M.rgb.needsUpdate = true;
    };
    pintar('arcoiris');

    const cargados = new Set();
    const loader = new GLTFLoader();

    escena.current = {
      seleccionar(k) {
        st.sel = k;
        if (marco) { S.remove(marco); marco = null; }
        if (objetivos[k]) { marco = new THREE.Box3Helper(cajaDe(k), 0x36e39a); S.add(marco); }
      },
      desarmar(v) {
        st.exGoal = v ? 1 : 0; st.goalDist = distBase();
        if (v) { const tau = Math.PI * 2; st.thGoal = st.theta + ((((-0.15 - st.theta) % tau) + tau * 1.5) % tau - Math.PI); st.phi = Math.min(st.phi, 1.25); }
      },
      girar(v) { st.auto = v; },
      color(c) { st.arcoiris = c === 'arcoiris'; pintar(c); },
      // Reemplaza la pieza hecha con código por el modelo .glb que se subió desde el panel
      modelos(datos) {
        Object.entries(datos || {}).forEach(([k, p]) => {
          if (!p.modelo_url || !objetivos[k] || cargados.has(k)) return;
          cargados.add(k);
          loader.load(p.modelo_url, (gltf) => {
            const propias = mallas.filter((o) => o.userData.pieza === k);
            const caja = new THREE.Box3(); propias.forEach((o) => caja.expandByObject(o));
            const tam = caja.getSize(new THREE.Vector3()), centro = caja.getCenter(new THREE.Vector3());
            propias.forEach((o) => { o.visible = false; });
            const modelo = gltf.scene, ms = new THREE.Box3().setFromObject(modelo).getSize(new THREE.Vector3());
            modelo.scale.setScalar(Math.min(tam.x / (ms.x || 1), tam.y / (ms.y || 1), tam.z / (ms.z || 1)));
            const mc = new THREE.Box3().setFromObject(modelo).getCenter(new THREE.Vector3());
            const envoltura = new THREE.Group(); envoltura.add(modelo); modelo.position.sub(mc);
            envoltura.position.copy(centro);
            modelo.traverse((o) => { if (o.isMesh) { o.userData.pieza = k; mallas.push(o); } });
            S.add(envoltura);
          }, undefined, () => console.warn('No se pudo cargar el modelo 3D de', k));
        });
      },
    };

    // Ratón y dedo: arrastrar gira, tocar selecciona
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const tocar = (e) => {
      const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(ndc, C);
      const h = ray.intersectObjects(mallas, false).find((x) => x.object.visible && x.object.userData.pieza && !(x.object.material.transparent && x.object.material.opacity < 0.3));
      return h?.object.userData.pieza;
    };
    const down = (e) => { st.drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; cv.setPointerCapture(e.pointerId); };
    const move = (e) => {
      if (st.drag) { st.theta -= (e.clientX - st.drag.x) * 0.008; st.phi = Math.min(1.45, Math.max(0.4, st.phi - (e.clientY - st.drag.y) * 0.006)); st.drag.x = e.clientX; st.drag.y = e.clientY; st.thGoal = null; }
      else cv.style.cursor = tocar(e) ? 'pointer' : 'grab';
    };
    const up = (e) => { if (st.drag && Math.hypot(e.clientX - st.drag.sx, e.clientY - st.drag.sy) < 6) { const k = tocar(e); if (k) onSelRef.current?.(k); } st.drag = null; };
    const cancel = () => { st.drag = null; };
    const wheel = (e) => { e.preventDefault(); st.goalDist = Math.min(7, Math.max(0.8, st.goalDist * (1 + Math.sign(e.deltaY) * 0.1))); };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', cancel); cv.addEventListener('wheel', wheel, { passive: false });

    const ro = new ResizeObserver(() => { const w = fig.clientWidth, h = fig.clientHeight; R.setSize(w, h, false); C.aspect = w / h; C.updateProjectionMatrix(); st.goalDist = distBase(); });
    ro.observe(fig);

    const v3 = new THREE.Vector3();
    let last = performance.now(), raf = 0;
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now; const k = 1 - Math.pow(0.02, dt);
      if (st.thGoal !== null) { st.theta += (st.thGoal - st.theta) * k; if (Math.abs(st.thGoal - st.theta) < 0.002) st.thGoal = null; }
      else if (st.auto && !st.drag) st.theta += dt * 0.16;
      rotores.forEach((r) => { r.rotation.z -= dt * (reducir ? 1.5 : 7); });
      if (st.arcoiris && !reducir) rgbTex.offset.x = (rgbTex.offset.x + dt * 0.15) % 1;
      st.ex += (st.exGoal - st.ex) * k;
      pc.partes.forEach((p) => p.obj.position.copy(p.base).addScaledVector(p.off, st.ex));
      tgt.lerpVectors(tCasa, tDentro, st.ex); st.dist += (st.goalDist - st.dist) * k;
      C.position.set(tgt.x + st.dist * Math.sin(st.phi) * Math.sin(st.theta), tgt.y + st.dist * Math.cos(st.phi), tgt.z + st.dist * Math.sin(st.phi) * Math.cos(st.theta)); C.lookAt(tgt);
      if (marco) marco.box.copy(cajaDe(st.sel));
      const w = fig.clientWidth, h = fig.clientHeight;
      const visibles = [];
      LBL.forEach((key) => {
        const s = spans[key], ver = (st.ex > 0.6 && INTERIOR.includes(key)) || key === st.sel;
        s.classList.toggle('on', ver); s.classList.toggle('sel', key === st.sel);
        if (!ver) return;
        const bb = cajaDe(key); bb.getCenter(v3); if (!INTERIOR.includes(key)) v3.y = bb.max.y; v3.project(C);
        visibles.push({ s, x: (v3.x * 0.5 + 0.5) * w, y: (-v3.y * 0.5 + 0.5) * h - 18, ancho: s.offsetWidth + 6 });
      });
      // Acomoda las etiquetas de arriba hacia abajo para que no se encimen
      visibles.sort((p, q) => p.y - q.y);
      visibles.forEach((e, i) => {
        for (let j = 0; j < i; j++) {
          const o = visibles[j];
          if (Math.abs(e.x - o.x) < (e.ancho + o.ancho) / 2 && Math.abs(e.y - o.y) < 30) e.y = o.y + 30;
        }
        e.s.style.transform = `translate(${e.x}px,${e.y}px) translate(-50%,-50%)`;
      });
      R.render(S, C);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', cancel); cv.removeEventListener('wheel', wheel);
      pintar('arcoiris'); // el material RGB es compartido con el resto de la tienda
      S.traverse((o) => { o.geometry?.dispose(); });
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
