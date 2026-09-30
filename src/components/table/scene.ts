import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Game, Selection } from '../../game/types';
import { COLORS } from '../../game/constants';
import { schedule } from '../../game/engine';
import { createMatchGuide } from './matchGuide';
import { box, chest, clear, cup, dice, disposeObject, GOLD, label, mesh, octagonLine, PALETTE, piece, playKey, ring, texture } from './models';

export type TableState = { game: Game; me: string; draft: Selection; side: number; locked: string[]; overhead: boolean; revealAt?: number; serverNow?: number; miningMixing?: boolean };
type SeatObjects = { group: THREE.Group; cups: THREE.Group[]; pieces: THREE.Group[]; coasters: THREE.Mesh[]; treasures: THREE.Group; keys: string[] };
export function createTable(canvas: HTMLCanvasElement, anchor: (id: string, x: number, y: number) => void, choose: (side: number) => void, inspect: () => void, playerCount = 4) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.22;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0c1110'); scene.fog = new THREE.Fog('#0c1110', 19, 40);
  const environment = new RoomEnvironment(), generator = new THREE.PMREMGenerator(renderer);
  const envMap = generator.fromScene(environment, .04); scene.environment = envMap.texture; scene.environmentIntensity = .42; environment.dispose(); generator.dispose();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 65);
  scene.add(new THREE.HemisphereLight('#d7e0cf', '#372719', 2));
  const key = new THREE.SpotLight('#ffe0a2', 105, 30, Math.PI / 3.7, .6, 1.3); key.position.set(-3, 9, 4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0004; key.shadow.normalBias = .025; key.target.position.set(0, 0, 0); scene.add(key, key.target);
  const fill = new THREE.PointLight('#a2c9dd', 25, 20, 1.5); fill.position.set(5, 5, -5); scene.add(fill);
  const floor = mesh(new THREE.PlaneGeometry(80, 80), '#10110d'); floor.rotation.x = -Math.PI / 2; floor.position.y = -1; scene.add(floor);
  const TABLE_ANGLE = -Math.PI / 8; // Offsets the octagon so a flat face centers on each seat direction (0°, 90°, 180°, 270°).
  const table = mesh(new THREE.CylinderGeometry(5.2, 5.25, .4, 8, 1, false, TABLE_ANGLE), '#a08560');
  (table.material as THREE.MeshStandardMaterial).map = texture('wood'); table.position.y = -.22; scene.add(table);
  const rim = octagonLine(5.03, .1, .05, GOLD); rim.position.y = .02; scene.add(rim);
  const felt = mesh(new THREE.CylinderGeometry(4.9, 4.9, .025, 8, 1, false, TABLE_ANGLE), '#b1c5b2');
  (felt.material as THREE.MeshStandardMaterial).map = texture('felt'); (felt.material as THREE.MeshStandardMaterial).roughness = .98; felt.position.y = -.003; scene.add(felt);
  const innerLine = octagonLine(4.6, .024, .012, '#7c7547', .3, .5); innerLine.position.y = .019; scene.add(innerLine);
  const centerLine = ring(1.35, .014, '#8f8056'); centerLine.position.y = .02; scene.add(centerLine);
  const emblem = label('P H A N T O M   G E M', '#9b9469', 2.4, .3); emblem.rotation.x = -Math.PI / 2; emblem.position.set(0, .025, 1.6); scene.add(emblem);
  const sub = label('THE PHANTOMS’ TABLE', '#77856a', 2.2, .2); sub.rotation.x = -Math.PI / 2; sub.position.set(0, .027, 1.92); scene.add(sub);
  const treasure = chest(); treasure.group.userData.action = 'chest'; treasure.group.position.z = -.15; scene.add(treasure.group);
  const chestContents = new THREE.Group(); treasure.group.add(chestContents);
  const chestGlow = new THREE.PointLight('#ffc16a', 0, 3); chestGlow.position.set(0, 1.1, 0); scene.add(chestGlow);
  const seats: SeatObjects[] = [];
  const matchGuide = createMatchGuide(); scene.add(matchGuide.group);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (let i = 0; i < playerCount; i++) {
    const group = new THREE.Group(); group.rotation.y = i * Math.PI * 2 / playerCount; scene.add(group);
    const chair = box(1.8, 1.5, .28, '#31241d', .12); chair.position.set(0, .08, 5.63); group.add(chair);
    const chairInset = box(1.48, 1.12, .12, '#483527', .13); chairInset.position.set(0, .14, 5.45); group.add(chairInset);
    const mat = box(2.7, .035, 1.64, '#1c3029', .15); mat.position.set(0, .04, 3.24); group.add(mat);
    for (const x of [-1.25, 1.25]) { const stitch = box(.012, .008, 1.34, '#9b8050', .002); stitch.position.set(x, .064, 3.24); group.add(stitch); }
    const objects: SeatObjects = { group, cups: [], pieces: [], coasters: [], treasures: new THREE.Group(), keys: ['', ''] };
    for (const side of [0, 1]) {
      const x = side === 0 ? -.65 : .65;
      const coaster = mesh(new THREE.CylinderGeometry(.58, .6, .035, 48), '#74593b', .3); coaster.position.set(x, .084, 3.22); group.add(coaster); objects.coasters.push(coaster);
      const edge = ring(.58, .012); edge.position.set(x, .106, 3.22); group.add(edge);
      const item = new THREE.Group(); item.position.set(x, .107, 3.22); group.add(item); objects.pieces.push(item);
      const shell = cup(COLORS[i]); shell.position.set(x, .105, 3.22); shell.userData.action = `cup:${i}:${side}`; group.add(shell); objects.cups.push(shell);
      const lettering = label(side === 0 ? 'L' : 'R', '#c5ab79', .2, .18); lettering.rotation.x = -Math.PI / 2; lettering.position.set(x, .071, 3.96); group.add(lettering);
      // Hands and cuffs rest on each player's edge of the table.
      const handGroup = new THREE.Group(); handGroup.position.set(side === 0 ? -1.6 : 1.6, .1, 4.02); handGroup.rotation.y = side === 0 ? -.24 : .24;
      const cuff = box(.4, .24, .6, i % 2 ? '#252a34' : '#35352f', .08); cuff.position.z = .47; handGroup.add(cuff);
      const palm = box(.31, .16, .38, ['#c39a77', '#a47d61', '#b88765', '#d3aa82'][i], .075); handGroup.add(palm);
      for (let finger = 0; finger < 4; finger++) { const f = mesh(new THREE.CapsuleGeometry(.038, .16 + (finger === 1 ? .04 : 0), 3, 6), ['#c39a77', '#a47d61', '#b88765', '#d3aa82'][i]); f.rotation.x = Math.PI / 2; f.position.set((finger - 1.5) * .073, -.01, -.21); handGroup.add(f); }
      group.add(handGroup);
    }
    group.add(objects.treasures); seats.push(objects);
  }
  let state: TableState | null = null, previousTurn = -1, previousPhase = '', revealStarted = -10000, lastContents = '', lastTreasures = '';
  const flights: { object: THREE.Group; from: THREE.Vector3; to: THREE.Vector3; start: number; duration: number; spin: boolean; dieId: string; touchesChest: boolean }[] = [];
  const eventIds = new Set<string>();
  let currentAngle = 0, disposed = false, paused = false, lastFrame = 0, frame = 0, width = 0, height = 0;
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let pointerStart: [number, number] | null = null;
  function resize() {
    width = canvas.clientWidth; height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  function worldPoint(index: number, x: number, z: number, y = .12) { return new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), index * Math.PI * 2 / playerCount); }
  function update(next: TableState) {
    const old = state; state = next;
    const phase = next.game.phase, reveal = phase === 'inspect' || phase === 'result' || phase === 'poison' || phase === 'over';
    const mySeat = next.game.players.findIndex(p => p.id === next.me);
    const match = schedule(next.game.turn, playerCount).find(pair => pair.includes(mySeat))!;
    matchGuide.update(mySeat * 4 / playerCount, match.find(index => index !== mySeat)! * 4 / playerCount, phase !== 'over');
    if (previousTurn !== next.game.turn) { eventIds.clear(); flights.splice(0).forEach(f => disposeObject(f.object)); }
    if (reveal && (previousTurn !== next.game.turn || !['inspect', 'result', 'poison', 'over'].includes(previousPhase))) {
      // A reload displays the settled board; a live reveal follows the shared server time.
      revealStarted = old ? performance.now() - Math.max(0, (next.serverNow || 0) - (next.revealAt || next.serverNow || 0)) : performance.now() - 10000;
    }
    next.game.players.forEach((player, i) => {
      const local = player.id === next.me;
      seats[i].cups.forEach(shell => {
        const crest = shell.getObjectByName('player-crest') as THREE.Mesh;
        (crest.material as THREE.MeshStandardMaterial).color.set(PALETTE[player.color]);
      });
      const selected = reveal ? next.game.selections[player.id] || [null, null] : local ? (next.game.selections[player.id] || next.draft) : [null, null];
      for (const side of [0, 1]) {
        const play = selected[side], key = playKey(play);
        if (seats[i].keys[side] !== key) {
          const previous = seats[i].keys[side]; clear(seats[i].pieces[side]); seats[i].keys[side] = key;
          if (play) {
            const item = piece(play.kind, play.value); item.rotation.y = -.15; item.userData.dieId = play.id; seats[i].pieces[side].add(item);
            if (!reduceMotion && local && phase === 'select' && previous !== '' && !next.locked.includes(player.id)) {
              item.position.set(side === 0 ? -.5 : .5, .4, 1.05); item.userData.dropAt = performance.now();
            }
          }
        }
        const material = seats[i].coasters[side].material as THREE.MeshStandardMaterial;
        material.emissive.set(local && next.side === side && phase === 'select' && !next.locked.includes(player.id) ? '#aa782a' : '#000000');
        material.emissiveIntensity = .25;
      }
    });
    const miningCount = next.game.miningCount ?? next.game.miningBag.length;
    const contentsKey = String(miningCount);
    if (lastContents !== contentsKey) {
      clear(chestContents); Array.from({ length: Math.min(10, miningCount) }).forEach((_, i) => { const object = dice(COLORS[i % 4], (i % 6) + 1, .23); object.position.set((i % 4 - 1.5) * .3, .68 + Math.floor(i / 4) * .14, (Math.floor(i / 4) - 1) * .22); object.rotation.set(.1 * i, i * .7, .12 * (i % 2)); chestContents.add(object); }); lastContents = contentsKey;
    }
    const jewelsKey = next.game.players.map(p => p.jewels.map(j => j.id).join(',')).join('|');
    if (lastTreasures !== jewelsKey) {
      next.game.players.forEach((player, i) => { clear(seats[i].treasures); player.jewels.forEach((j, n) => { const object = dice(j.kind as typeof COLORS[number], j.value, .25); object.userData.dieId = j.id; object.position.set(-1 + (n % 7) * .32, .075 + Math.floor(n / 7) * .27, 2.13); object.rotation.y = (n % 3 - 1) * .18; seats[i].treasures.add(object); }); }); lastTreasures = jewelsKey;
    }
    if (reveal) (next.game.visualEvents || []).forEach((event, index) => {
      const eventId = `${next.game.turn}:${event.type}:${event.player}:${event.die.id}`;
      if (eventIds.has(eventId)) return; eventIds.add(eventId);
      if (!old || reduceMotion) {
        seats.forEach(seat => seat.pieces.forEach(holder => holder.children.forEach(item => { if (item.userData.dieId === event.die.id && event.type !== 'mining') item.visible = false; })));
        return;
      }
      const seatIndex = next.game.players.findIndex(p => p.id === event.player);
      const sourceIndex = next.game.players.findIndex(p => p.id === event.from);
      const object = dice(event.die.kind as typeof COLORS[number], event.die.value, .37); scene.add(object);
      const central = new THREE.Vector3(0, .95, -.15);
      const sourceSeat = sourceIndex >= 0 ? sourceIndex : seatIndex;
      const sourceSide = next.game.selections[next.game.players[sourceSeat].id]?.findIndex(p => p?.id === event.die.id) ?? -1;
      const ownedIndex = next.game.players[seatIndex].jewels.findIndex(j => j.id === event.die.id);
      const from = event.type === 'mining' ? central : worldPoint(sourceSeat, sourceSide === -1 ? 0 : sourceSide === 0 ? -.65 : .65, event.type === 'poison' ? 2.15 : 3.22, .25);
      const to = event.type === 'collision' || event.type === 'poison' ? central : worldPoint(seatIndex, event.type === 'mining' ? 0 : -1 + Math.max(0, ownedIndex % 7) * .32, event.type === 'mining' ? 4.2 : 2.15, .15);
      object.visible = false;
      flights.push({ object, from, to, start: Math.max(performance.now(), revealStarted + 900) + index * 210, duration: 950, spin: true, dieId: event.die.id, touchesChest: ['mining', 'collision', 'poison'].includes(event.type) });
    });
    previousTurn = next.game.turn; previousPhase = phase;
    const desiredAngle = next.game.players.findIndex(p => p.id === next.me) * Math.PI * 2 / playerCount;
    currentAngle = desiredAngle;
  }
  function pick(event: PointerEvent) {
    if (!state || !pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 12) return;
    const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    for (const hit of raycaster.intersectObjects(scene.children, true)) {
      let object: THREE.Object3D | null = hit.object;
      while (object && !object.userData.action) object = object.parent;
      if (!object) continue;
      const action = String(object.userData.action);
      if (action === 'chest') { inspect(); break; }
      const [, seat, side] = action.split(':');
      if (state.game.players[Number(seat)]?.id === state.me && state.game.phase === 'select' && !state.locked.includes(state.me)) { choose(Number(side)); break; }
    }
  }
  function down(e: PointerEvent) { pointerStart = [e.clientX, e.clientY]; }
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', pick);
  function visibility() { paused = document.hidden; } document.addEventListener('visibilitychange', visibility);
  function animate(now: number) {
    if (disposed) return; frame = requestAnimationFrame(animate);
    if (paused || now - lastFrame < 30 || !width || !height) return; lastFrame = now;
    if (state) {
      matchGuide.animate(now, reduceMotion);
      const portrait = camera.aspect < 1.2;
      const portraitDistance = Math.max(1, .95 / camera.aspect);
      const pos = new THREE.Vector3(0, state.overhead ? 16.5 * (portrait ? portraitDistance : 1) : portrait ? 10.8 * portraitDistance : 7.7, state.overhead ? 1.2 : portrait ? 13 * portraitDistance : 10.3);
      pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentAngle); camera.position.lerp(pos, reduceMotion ? 1 : .13); camera.lookAt(0, 0, 0);
      const revealed = ['inspect', 'result', 'poison', 'over'].includes(state.game.phase);
      const revealProgress = reduceMotion ? 1 : Math.min(1, Math.max(0, (now - revealStarted) / 850));
      seats.forEach((seat, i) => {
        const local = state!.game.players[i].id === state!.me;
        seat.cups.forEach((shell, side) => {
          const editing = local && state!.game.phase === 'select' && !state!.locked.includes(state!.me);
          const open = revealed ? 1 - Math.pow(1 - revealProgress, 3) : editing ? .97 : 0;
          const targetY = .105 + open * 1.16;
          const targetX = (side === 0 ? -1 : 1) * (.65 + open * .65);
          shell.position.x += (targetX - shell.position.x) * (reduceMotion ? 1 : .23);
          shell.position.y += (targetY - shell.position.y) * (reduceMotion ? 1 : .23);
          shell.position.z += (3.22 + open * .72 - shell.position.z) * (reduceMotion ? 1 : .23);
          shell.rotation.z = (side === 0 ? -.11 : .11) * open;
          shell.rotation.x = -.14 * open;
          if (!reduceMotion && state!.game.phase === 'reveal') shell.rotation.z = Math.sin(now * .025) * .012;
          seat.pieces[side].children.forEach(item => {
            if (!item.userData.dropAt) return;
            const t = Math.min(1, (now - item.userData.dropAt) / 430);
            item.position.set((side === 0 ? -.5 : .5) * (1 - t), Math.sin(t * Math.PI) * .55, 1.05 * (1 - t));
            if (t === 1) delete item.userData.dropAt;
          });
        });
        const point = worldPoint(i, 0, 4.3, .15).project(camera); anchor(state!.game.players[i].id, (point.x + 1) * 50, (1 - point.y) * 50);
      });
      let mining = false;
      seats.forEach(seat => seat.treasures.children.forEach(jewel => { jewel.visible = !flights.some(f => f.dieId === jewel.userData.dieId); }));
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i], t = (now - f.start) / f.duration;
        f.object.visible = t >= 0 && t <= 1;
        if (t < 0) continue;
        seats.forEach(seat => seat.pieces.forEach(holder => holder.children.forEach(item => { if (item.userData.dieId === f.dieId) item.visible = false; })));
        if (t > 1) { disposeObject(f.object); flights.splice(i, 1); continue; }
        mining ||= f.touchesChest; f.object.position.lerpVectors(f.from, f.to, t); f.object.position.y += Math.sin(t * Math.PI) * 1.7;
        if (f.spin) f.object.rotation.set(t * Math.PI * 2, t * Math.PI * 3, t * 1.2);
      }
      const shaking = !!state.miningMixing;
      treasure.group.rotation.y = currentAngle;
      treasure.group.rotation.z = shaking && !reduceMotion ? Math.sin(now * .035) * .045 : 0;
      chestContents.rotation.y = shaking && !reduceMotion ? now * .009 : 0;
      const lidTarget = shaking ? -.08 : mining ? -1.25 : -.2; treasure.hinge.rotation.x += (lidTarget - treasure.hinge.rotation.x) * .09;
      chestGlow.intensity += ((shaking ? 2 : mining ? 6 : .5) - chestGlow.intensity) * .1;
      const chestPoint = new THREE.Vector3(0, .05, -.15).project(camera); anchor('chest', (chestPoint.x + 1) * 50, (1 - chestPoint.y) * 50);
    }
    renderer.render(scene, camera);
  }
  camera.position.set(0, 9, 12); frame = requestAnimationFrame(animate);
  return {
    update,
    dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', pick); document.removeEventListener('visibilitychange', visibility); matchGuide.dispose(); disposeObject(scene); envMap.dispose(); renderer.dispose(); },
  };
}
