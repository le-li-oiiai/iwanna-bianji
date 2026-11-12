/*
 * templates/game-template.js —— 「测试游玩」和「导出 HTML」用的独立游戏页面模板
 *
 * 这就是那份可以直接双击打开的单文件游戏：一个 960x540 的 canvas + 整套引擎。
 * 模板里有一行关卡数据占位符，导出时会被替换成当前关卡的数据。
 *
 * 想改导出游戏的画面/玩法，改这个字符串里的代码即可（改完记得用「测试游玩」验证）。
 */
window.IW_TEMPLATES = window.IW_TEMPLATES || {};
window.IW_TEMPLATES.gameTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>I Wanna Shoot</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{height:100%;width:100%;background:#05050c;display:flex;align-items:center;
    justify-content:center;overflow:hidden;font-family:'Courier New',monospace;}
  #wrap{position:relative;width:min(100vw,177.78vh);aspect-ratio:960/540;
    box-shadow:0 0 80px rgba(90,130,255,.25),0 0 0 1px rgba(120,150,255,.15);
    border-radius:8px;overflow:hidden;}
  canvas{display:block;width:100%;height:100%;cursor:crosshair;}
</style>
</head>
<body>
<div id="wrap"><canvas id="game"></canvas></div>
<script>
(function(){
"use strict";
var cvs = document.getElementById('game');
var ctx = cvs.getContext('2d');
var W = 960, H = 540;
cvs.width = W; cvs.height = H;
ctx.imageSmoothingEnabled = false;
var clamp = function(v,a,b){ return v<a?a:v>b?b:v; };
var rnd = function(a,b){ return a + Math.random()*(b-a); };
var rectHit = function(a,b){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; };

/*__LEVEL_DATA__*/

var solids = staticSolids.concat(movers);
solids.forEach(function(e){
    e.ow = e.w; e.oh = e.h; e.ox = e.x; e.oy = e.y;
    if(e.hitboxes) e.hitboxes.forEach(function(h){ h._hits = 0; h._curCollide = false; });
});
adv_spikes.forEach(function(e){
    e.ow = e.w; e.oh = e.h; e.ox = e.x; e.oy = e.y;
    if(e.hitboxes) e.hitboxes.forEach(function(h){ h._hits = 0; h._curCollide = false; });
});
enemies.forEach(function(e){
    if(e.hitboxes) e.hitboxes.forEach(function(h){ h._hits = 0; h._curCollide = false; });
    if(e.hp === undefined) e.hp = 1;
    if(e.maxHp === undefined) e.maxHp = e.hp;
    if(e.damage === undefined) e.damage = 1;
});

function getHitboxRect(ent, h, t) {
    if (!h.isRelative) {
        return { x: h.x, y: h.y, w: h.w, h: h.h };
    }
    var morph = ent.morph || 'none';
    if (ent.morphDemo === false) morph = 'none';
    var ow = ent.ow !== undefined ? ent.ow : ent.w;
    var oh = ent.oh !== undefined ? ent.oh : ent.h;
    var ox = ent.ox !== undefined ? ent.ox : ent.x;
    var oy = ent.oy !== undefined ? ent.oy : ent.y;
    var cw = ow, ch = oh;
    if (morph === 'pulse') {
        var scale = 1 + Math.sin(t * 0.1) * 0.2;
        cw = ow * scale; ch = oh * scale;
    } else if (morph === 'stretch') {
        var p = (Math.sin(t * 0.05) + 1) / 2;
        cw = ow + ((ent.targetW || ow) - ow) * p;
        ch = oh + ((ent.targetH || oh) - oh) * p;
    }
    var sx = cw / ow, sy = ch / oh;
    var ecx = ent.x + ent.w / 2, ecy = ent.y + ent.h / 2;
    var ocx = ox + ow / 2, ocy = oy + oh / 2;
    var ohcx = ox + h.x + h.w / 2, ohcy = oy + h.y + h.h / 2;
    var offsetX = ohcx - ocx, offsetY = ohcy - ocy;
    var new_hcx = ecx + offsetX * sx, new_hcy = ecy + offsetY * sy;
    var new_hw = h.w * sx, new_hh = h.h * sy;
    return { x: new_hcx - new_hw / 2, y: new_hcy - new_hh / 2, w: new_hw, h: new_hh };
}

var audioCtx = null;
function initAudio(){ if(!audioCtx){ try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } }
function beep(freq, dur, type, vol){
  if(!audioCtx) return;
  try{
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    g.gain.setValueAtTime(vol || 0.02, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  }catch(e){}
}

var keys = {};
var mouse = { x: W*0.8, y: H/2, down: false };
window.addEventListener('keydown', function(e){
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
  if(!keys[e.code]){
    if(e.code==='Space' || e.code==='KeyW' || e.code==='ArrowUp') player.jumpBuffer = 8;
    if(e.code === 'KeyR' && state.mode === 'play') killPlayer();
  }
  keys[e.code] = true;
  initAudio();
});
window.addEventListener('keyup', function(e){ keys[e.code] = false; });
window.addEventListener('blur', function(){ for(var k in keys) keys[k] = false; mouse.down = false; });
cvs.addEventListener('mousemove', function(e){
  var r = cvs.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (W / r.width);
  mouse.y = (e.clientY - r.top) * (H / r.height);
});
cvs.addEventListener('mousedown', function(e){ mouse.down = true; initAudio(); e.preventDefault(); });
window.addEventListener('mouseup', function(){ mouse.down = false; });
cvs.addEventListener('contextmenu', function(e){ e.preventDefault(); });

var state = { mode: 'play', deaths: 0, camX: 0, shake: 0, deadTimer: 0, winTimer: 0, t: 0, spawn: { x: SPAWN.x, y: SPAWN.y } };
var player = { x: SPAWN.x, y: SPAWN.y, w: 14, h: 22, vx: 0, vy: 0, onGround: false, ground: null, jumpsLeft: 1, coyote: 0, jumpBuffer: 0, facing: 1, shootCd: 0, aimAngle: 0, maxHp: MAX_HP, hp: MAX_HP, invTimer: 0, slowTimer: 0, fastTimer: 0, bounceCd: 0, weapons: [], weaponIndex: 0, qHold: -1, qDropped: false };
var bullets = [], enemyBullets = [], particles = [];

/* ---------- 武器定义（和游戏本体 js/weapons.js 保持一致） ---------- */
var WEAPONS = {
  rifle:   { short:'突击', cd:9,  speed:14, life:80, pellets:1, spread:0,    pierce:false, recoil:0.6, shake:2.2, color:'#fde047', damage:1 },
  shotgun: { short:'霰弹', cd:34, speed:12, life:26, pellets:5, spread:0.17, pierce:false, recoil:2.4, shake:3.4, color:'#fb923c', damage:1 },
  sniper:  { short:'狙击', cd:52, speed:24, life:90, pellets:1, spread:0,    pierce:true,  recoil:1.8, shake:3,   color:'#a78bfa', damage:3 }
};
var MAX_SLOTS = 2, DROP_HOLD = 42, DROP_DIST = 74;
function weaponDef(t){ return WEAPONS[t] || WEAPONS.rifle; }

/* 初始武器 */
(playerWeapons || []).forEach(function(w){ player.weapons.push({ type: w.type, damage: w.damage || weaponDef(w.type).damage }); });

/* 地上的武器：记出生点，死亡时复原 */
weapons.forEach(function(w){
  w.alive = true; w._fromLevel = true; w._spawnX = w.x; w._spawnY = w.y; w._dropLock = 0; w._toss = null;
  w.damage = w.damage || weaponDef(w.type).damage;
});

/* 血包：初始化运行状态（关卡文件里只存位置/回复量，没有 active） */
healthpacks.forEach(function(h){
  h.active = true;
  h.heal = h.heal || 1;
});

function updatePath(e) {
  if (!e.path || e.path.length < 2) return;
  var totalLen = 0, lens = [];
  for(var i=0; i<e.path.length-1; i++){
      var dx = e.path[i+1].x - e.path[i].x;
      var dy = e.path[i+1].y - e.path[i].y;
      var l = Math.hypot(dx, dy); lens.push(l); totalLen += l;
  }
  if(totalLen === 0) return;
  if (e.pathDist === undefined) e.pathDist = 0;
  if (e.pathDir === undefined) e.pathDir = 1;
  e.pathDist += (e.pathSpeed || 2) * e.pathDir;
  if (e.pathDist > totalLen) { e.pathDist = totalLen; e.pathDir = -1; }
  if (e.pathDist < 0) { e.pathDist = 0; e.pathDir = 1; }
  var d = e.pathDist;
  for(var i=0; i<lens.length; i++){
      if(d <= lens[i] || i === lens.length - 1){
          var t = d / lens[i]; if(t > 1) t = 1;
          var pcx = e.path[i].x + (e.path[i+1].x - e.path[i].x) * t;
          var pcy = e.path[i].y + (e.path[i+1].y - e.path[i].y) * t;
          e.x = pcx - e.w / 2;
          e.y = pcy - e.h / 2;
          break;
      }
      d -= lens[i];
  }
}

function updateMorphs() {
    var all = solids.concat(adv_spikes);
    for(var i=0; i<all.length; i++){
        var e = all[i];
        var active = true;
        if (e.hitboxes && e.hitboxes.length) {
            var hasMorphTrigger = false;
            for (var j=0; j<e.hitboxes.length; j++) {
                if (e.hitboxes[j].triggerMorph) { hasMorphTrigger = true; break; }
            }
            if (hasMorphTrigger) active = !!e._morphActivated;
        }
        var newW = e.ow, newH = e.oh;
        var offX = 0, offY = 0;
        if (active && e.morph === 'pulse') {
            var scale = 1 + Math.sin(state.t * 0.1) * 0.2;
            newW = e.ow * scale; newH = e.oh * scale;
        } else if (active && e.morph === 'stretch') {
            var p;
            if (e.morphLoop === false) {
                if (e._morphStartT === undefined) e._morphStartT = state.t;
                p = clamp((state.t - e._morphStartT) / 60, 0, 1);
            } else {
                p = (Math.sin(state.t * 0.05) + 1) / 2;
            }
            newW = e.ow + ((e.targetW || e.ow) - e.ow) * p;
            newH = e.oh + ((e.targetH || e.oh) - e.oh) * p;
            offX = (e.targetOffX || 0) * p;
            offY = (e.targetOffY || 0) * p;
        }
        var prevOffX = e._morphOffX || 0, prevOffY = e._morphOffY || 0;
        if (newW !== e.w || newH !== e.h || offX !== prevOffX || offY !== prevOffY) {
            var cx = e.x + e.w / 2, cy = e.y + e.h / 2;
            var ddx = offX - prevOffX, ddy = offY - prevOffY;
            e.w = newW; e.h = newH;
            e.x = cx + ddx - e.w / 2;
            e.y = cy + ddy - e.h / 2;
            e._morphOffX = offX; e._morphOffY = offY;
        }
    }
}

function addParticles(x, y, n, color, spd, life){
  life = life || 30;
  for(var i=0;i<n;i++){
    var a = Math.random()*Math.PI*2, s = rnd(spd*0.3, spd);
    particles.push({ x: x, y: y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 1, life: rnd(life*0.5, life), maxLife: life, color: color, size: rnd(1.5, 3.5) });
  }
}
function updateParticles(){
  for(var i=particles.length-1;i>=0;i--){
    var p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.97; p.life--;
    if(p.life <= 0) particles.splice(i,1);
  }
}
function moveEntity(e, list){
  e.x += e.vx;
  for(var i=0;i<list.length;i++){
    var s = list[i]; if(s._hidden) continue;
    if(rectHit(e, s)){ if(e.vx > 0) e.x = s.x - e.w; else if(e.vx < 0) e.x = s.x + s.w; e.vx = 0; }
  }
  e.y += e.vy; e.onGround = false; e.ground = null;
  for(var j=0;j<list.length;j++){
    var t = list[j]; if(t._hidden) continue;
    if(rectHit(e, t)){
      if(e.vy >= 0){ e.y = t.y - e.h; e.vy = 0; e.onGround = true; e.ground = t; }
      else { e.y = t.y + t.h; e.vy = 0; }
    }
  }
}

/*
 * 触发时机语义（triggerCount）：
 *   0  → 需要玩家持续接触碰撞箱（离开即停止触发）
 *   1  → 玩家碰一次即永久触发（直到玩家死亡重置）
 *   N  → 累计触碰 N 次后触发（2 = 第二次触碰，3 = 第三次触碰，依此类推）
 *
 * 判定逻辑：
 *   tc === 0 时：canTrig = isCol（当前帧接触）
 *   tc >= 1 时：canTrig = _hits >= tc（累计次数）
 *
 * 对于「持续型效果」（触发运动 / 显形），tc>=1 时触发后保持，不再要求当前接触；
 * 对于「瞬时型效果」（减速 / 加速 / 弹射），仍需当前帧接触才会生效。
 */
function updateMovers(){
  for(var i=0;i<movers.length;i++){
    var m = movers[i], px = m.x, py = m.y;
    var triggerMove = false, hasMoveTrigger = false;
    if (m.hitboxes) {
      for(var j=0; j<m.hitboxes.length; j++){
        var h = m.hitboxes[j];
        if (h.triggerMove) {
          hasMoveTrigger = true;
          var hmTc = h.triggerCount || 0;
          if (hmTc === 0) {
            if (rectHit(player, getHitboxRect(m, h, state.t))) triggerMove = true;
          } else if (h._hits >= hmTc) {
            triggerMove = true;
          }
        }
      }
    }
    m._activeMove = hasMoveTrigger ? triggerMove : true;
    if (m._activeMove) {
      if (m.path && m.path.length >= 2) updatePath(m);
      else { m.phase += m.spd; m.x = m.ox + Math.sin(m.phase) * m.ax; m.y = m.oy + Math.sin(m.phase) * m.ay; }
    }
    m.dx = m.x - px; m.dy = m.y - py;
    if(player.onGround && player.ground === m && state.mode === 'play'){ player.x += m.dx; player.y += m.dy; }
  }
}
function updatePlayer(){
  var p = player;
  if (p.slowTimer > 0) p.slowTimer--;
  if (p.fastTimer > 0) p.fastTimer--;
  if (p.bounceCd > 0) p.bounceCd--;
  var spdMod = 1;
  if (p.slowTimer > 0) spdMod = 0.5;
  else if (p.fastTimer > 0) spdMod = 1.8;
  var ax = 0;
  if(keys['ArrowLeft'] || keys['KeyA']) ax--;
  if(keys['ArrowRight']|| keys['KeyD']) ax++;
  if(ax !== 0){ p.vx += ax * 1.25 * spdMod; p.facing = ax; }
  else { p.vx *= 0.78; if(Math.abs(p.vx) < 0.15) p.vx = 0; }
  p.vx = clamp(p.vx, -4.6 * spdMod, 4.6 * spdMod);
  p.vy += 0.62; if(p.vy > 15) p.vy = 15;
  moveEntity(p, solids);
  if(p.onGround){ p.jumpsLeft = 1; p.coyote = 8; } else if(p.coyote > 0) p.coyote--;
  if(p.jumpBuffer > 0) p.jumpBuffer--;
  if(p.jumpBuffer > 0){
    if(p.onGround || p.coyote > 0){
      p.vy = -11.6; p.jumpsLeft = 1; p.coyote = 0; p.onGround = false; p.jumpBuffer = 0;
      addParticles(p.x + p.w/2, p.y + p.h, 6, '#5eead4', 2.5, 18); beep(430, 0.07, 'square', 0.018);
    } else if(p.jumpsLeft > 0){
      p.vy = -10.2; p.jumpsLeft = 0; p.jumpBuffer = 0;
      addParticles(p.x + p.w/2, p.y + p.h, 12, '#a78bfa', 4, 22); beep(680, 0.08, 'square', 0.018);
    }
  }
  if(p.invTimer > 0) p.invTimer--;
  var wmx = mouse.x + state.camX;
  p.aimAngle = Math.atan2(mouse.y - (p.y + p.h/2), wmx - (p.x + p.w/2));
  if(p.shootCd > 0) p.shootCd--;
  /* Q：短按换枪，长按读条丢枪 */
  if(keys['KeyQ']){
    if(p.qHold < 0) p.qHold = 0;
    p.qHold++;
    if(p.qHold >= DROP_HOLD && !p.qDropped){ p.qDropped = true; dropWeapon(); }
  } else {
    if(p.qHold >= 0 && p.qHold < DROP_HOLD) swapWeapons();
    p.qHold = -1; p.qDropped = false;
  }
  if((mouse.down || keys['KeyJ']) && p.shootCd <= 0){
    var spec = currentWeapon();
    if(spec){ shoot(); p.shootCd = weaponDef(spec.type).cd; }
  }
  checkHitboxTriggers();
  checkHazards();
  checkPickups();
}

/* ---------- 武器 ---------- */
function hasWeaponType(type){
  for(var i=0;i<player.weapons.length;i++){ if(player.weapons[i].type === type) return true; }
  return false;
}
function currentWeapon(){
  if(player.weapons.length === 0) return null;
  return player.weapons[player.weaponIndex] || player.weapons[0];
}
function swapWeapons(){
  if(player.weapons.length < 2) return;
  player.weaponIndex = (player.weaponIndex + 1) % player.weapons.length;
  beep(560, 0.06, 'square', 0.02);
  addParticles(player.x + player.w/2, player.y + player.h/2, 5, '#93c5fd', 2, 14);
}
function dropWeapon(){
  var p = player;
  if(p.weapons.length === 0) return;
  var spec = p.weapons[p.weaponIndex];
  var dir = p.facing >= 0 ? 1 : -1;
  var sx = p.x + p.w/2, sy = p.y + p.h/2;
  var tx = sx + dir * DROP_DIST, ty = sy - 6;
  weapons.push({
    x: sx - 14, y: sy - 7, w: 28, h: 14,
    type: spec.type, damage: spec.damage,
    path: [], pathSpeed: 2, pathDist: 0, pathDir: 1,
    alive: true, _fromLevel: false, _dropLock: 26,
    _toss: { t: 0, dur: 22, x0: sx, y0: sy, x1: tx, y1: ty }
  });
  p.weapons.splice(p.weaponIndex, 1);
  if(p.weaponIndex >= p.weapons.length) p.weaponIndex = 0;
  beep(300, 0.1, 'square', 0.03);
  addParticles(sx, sy, 8, '#fbbf24', 3, 18);
}
function updateWorldItems(){
  var i;
  for(i=0;i<healthpacks.length;i++){
    var hp = healthpacks[i];
    if(hp.path && hp.path.length >= 2) updatePath(hp);
  }
  for(i=0;i<weapons.length;i++){
    var w = weapons[i];
    if(!w.alive) continue;
    if(w._dropLock > 0) w._dropLock--;
    if(w._toss){
      var ts = w._toss; ts.t++;
      var pr = Math.min(1, ts.t / ts.dur);
      w.x = ts.x0 + (ts.x1 - ts.x0) * pr - w.w/2;
      w.y = ts.y0 + (ts.y1 - ts.y0) * pr - w.h/2 - Math.sin(Math.PI * pr) * 24;
      if(ts.t >= ts.dur) w._toss = null;
    } else if(w.path && w.path.length >= 2){
      updatePath(w);
    }
  }
}
function checkPickups(){
  var p = player, i;
  for(i=0;i<healthpacks.length;i++){
    var hp = healthpacks[i];
    if(!hp.active) continue;
    if(!rectHit(p, hp)) continue;
    if(p.hp >= p.maxHp) continue;
    p.hp = Math.min(p.maxHp, p.hp + hp.heal);
    hp.active = false;
    addParticles(hp.x + hp.w/2, hp.y + hp.h/2, 18, '#4ade80', 4, 30);
    beep(880, 0.12, 'sine', 0.03);
  }
  for(i=0;i<weapons.length;i++){
    var w = weapons[i];
    if(!w.alive || w._toss || w._dropLock > 0) continue;
    if(!rectHit(p, w)) continue;
    if(hasWeaponType(w.type)) continue;
    if(p.weapons.length >= MAX_SLOTS) continue;
    p.weapons.push({ type: w.type, damage: w.damage });
    if(p.weapons.length === 1) p.weaponIndex = 0;
    w.alive = false;
    addParticles(w.x + w.w/2, w.y + w.h/2, 14, '#38bdf8', 4, 26);
    beep(700, 0.09, 'square', 0.025);
  }
}
function shoot(){
  var p = player, spec = currentWeapon();
  if(!spec) return;
  var def = weaponDef(spec.type), a = p.aimAngle;
  var cx = p.x + p.w/2 + Math.cos(a)*14, cy = p.y + p.h/2 + Math.sin(a)*14;
  for(var i = 0; i < def.pellets; i++){
    var ang = a + (def.pellets > 1 ? (i - (def.pellets - 1) / 2) * def.spread : 0);
    bullets.push({ x: cx, y: cy, vx: Math.cos(ang)*def.speed, vy: Math.sin(ang)*def.speed,
                   life: def.life, damage: spec.damage, pierce: def.pierce, type: spec.type });
  }
  p.vx -= Math.cos(a) * def.recoil;
  addParticles(cx, cy, def.pellets > 1 ? 8 : 4, def.color, 3, 12);
  state.shake = Math.max(state.shake, def.shake);
  beep(def.pierce ? 520 : (def.pellets > 1 ? 700 : 900 + rnd(-60,60)), 0.05, 'square', 0.012);
}
function updateBullets(){
  for(var i=bullets.length-1;i>=0;i--){
    var b = bullets[i]; b.x += b.vx; b.y += b.vy; b.life--; var hit = b.life <= 0;
    if(!hit && !b.pierce){ for(var k=0;k<solids.length;k++){ var s = solids[k]; if(s._hidden) continue; if(b.x > s.x && b.x < s.x+s.w && b.y > s.y && b.y < s.y+s.h){ hit = true; break; } } }
    if(!hit){
      for(var m=0;m<enemies.length;m++){
        var e = enemies[m]; if(!e.alive || e._hidden) continue;
        if(b.x > e.x && b.x < e.x+e.w && b.y > e.y && b.y < e.y+e.h){
          e.hp = (e.hp === undefined ? 1 : e.hp) - (b.damage || 1);
          hit = true;
          if (e.hp <= 0) {
            e.alive = false;
            addParticles(b.x, b.y, 16, '#f59e0b', 5.5, 30);
            addParticles(b.x, b.y, 8, '#fde047', 3.5, 20);
            state.shake = 8; beep(260, 0.13, 'sawtooth', 0.03);
          } else {
            addParticles(b.x, b.y, 8, '#f59e0b', 3.5, 16);
            beep(620, 0.05, 'square', 0.02);
          }
          break;
        }
      }
    }
    if(hit) bullets.splice(i,1);
  }
  for(var n=enemyBullets.length-1;n>=0;n--){
    var eb = enemyBullets[n]; eb.x += eb.vx; eb.y += eb.vy; eb.life--; var ehit = eb.life <= 0;
    if(!ehit){ for(var q=0;q<solids.length;q++){ var ss = solids[q]; if(ss._hidden) continue; if(eb.x > ss.x && eb.x < ss.x+ss.w && eb.y > ss.y && eb.y < ss.y+ss.h){ ehit = true; break; } } }
    if(!ehit && state.mode === 'play'){
      if(rectHit({x:eb.x-3,y:eb.y-3,w:6,h:6}, player)){
        ehit = true;
        if(player.invTimer <= 0) { player.hp--; player.invTimer = 60; addParticles(player.x+7, player.y+11, 10, '#e94560', 4, 20); if(player.hp <= 0) killPlayer(); }
      }
    }
    if(ehit) enemyBullets.splice(n,1);
  }
}
function updateEnemies(){
  for(var i=0;i<enemies.length;i++){
    var e = enemies[i]; if(!e.alive) continue;
    var triggerMove = false, hasMoveTrigger = false;
    if (e.hitboxes) {
      for(var j=0; j<e.hitboxes.length; j++){
        var hb = e.hitboxes[j];
        if (hb.triggerMove) {
          hasMoveTrigger = true;
          var heTc = hb.triggerCount || 0;
          if (heTc === 0) {
            if (rectHit(player, getHitboxRect(e, hb, state.t))) triggerMove = true;
          } else if (hb._hits >= heTc) {
            triggerMove = true;
          }
        }
      }
    }
    e._activeMove = hasMoveTrigger ? triggerMove : true;
    if(e.type === 'walker'){
      if (e._activeMove) {
        if (e.path && e.path.length >= 2) updatePath(e);
        else { e.x += e.vx; if(e.x < e.minX){ e.x = e.minX; e.vx *= -1; } if(e.x + e.w > e.maxX){ e.x = e.maxX - e.w; e.vx *= -1; } }
      }
    } else if(e.type === 'shooter'){
      if (e._activeMove) {
        if (e.path && e.path.length >= 2) updatePath(e);
        else { e.phase += 0.05; e.y = e.baseY + Math.sin(e.phase) * 14; }
      }
      e.cd--;
      if(e.cd <= 0 && state.mode === 'play' && !e._hidden){
        var dx = (player.x + player.w/2) - (e.x + e.w/2); var dy = (player.y + player.h/2) - (e.y + e.h/2); var d = Math.hypot(dx, dy) || 1;
        if(d < 540){
          var sp = 4.2; enemyBullets.push({ x: e.x + e.w/2, y: e.y + e.h/2, vx: dx/d*sp, vy: dy/d*sp, life: 220 }); e.cd = 95; beep(200, 0.1, 'sawtooth', 0.02);
        } else { e.cd = 25; }
      }
    }
  }
}
function updateAdvSpikes(){
  for(var i=0;i<adv_spikes.length;i++){
    var s = adv_spikes[i];
    var triggerMove = false, hasMoveTrigger = false;
    if (s.hitboxes) {
      for(var j=0; j<s.hitboxes.length; j++){
        var h = s.hitboxes[j];
        if (h.triggerMove) {
          hasMoveTrigger = true;
          var hsTc = h.triggerCount || 0;
          if (hsTc === 0) {
            if (rectHit(player, getHitboxRect(s, h, state.t))) triggerMove = true;
          } else if (h._hits >= hsTc) {
            triggerMove = true;
          }
        }
      }
    }
    s._activeMove = hasMoveTrigger ? triggerMove : true;
    if (s._activeMove) {
      if (s.path && s.path.length >= 2) updatePath(s);
      else {
        s.phase += s.moveSpeed || 0.02;
        if (s.moveType === 'horizontal') s.x = s.ox + Math.sin(s.phase) * s.moveRange;
        if (s.moveType === 'vertical') s.y = s.oy + Math.sin(s.phase) * s.moveRange;
      }
    }
  }
}
function isAdvSpikeVisible(s) {
  if (!s._activeVis) return false;
  if (s.visibility === 'always') return true;
  if (s.visibility === 'blink') return Math.floor(state.t * 0.05) % 2 === 0;
  if (s.visibility === 'near') {
    var cx = s.x + s.w/2, cy = s.y + s.h/2;
    var px = player.x + player.w/2, py = player.y + player.h/2;
    return Math.hypot(px - cx, py - cy) < 160;
  }
  return true;
}
function checkHitboxTriggers(){
  var p = player;
  var allEnts = staticSolids.concat(movers).concat(adv_spikes).concat(enemies);
  for(var i=0; i<allEnts.length; i++) { allEnts[i]._trigMove = false; allEnts[i]._trigVis = false; }
  for(var i=0; i<allEnts.length; i++){
    var ent = allEnts[i]; if(!ent.hitboxes) continue;
    for(var j=0; j<ent.hitboxes.length; j++){
      var hb = ent.hitboxes[j];
      var rect = getHitboxRect(ent, hb, state.t);
      var isCol = rectHit(p, rect);
      if (isCol && !hb._curCollide) hb._hits++;
      hb._curCollide = isCol;
      var tc = hb.triggerCount || 0;
      var canTrig = (tc === 0) ? isCol : (hb._hits >= tc);
      if (canTrig) {
        if (hb.triggerMove) ent._trigMove = true;
        if (hb.triggerVisibility) ent._trigVis = true;
        if (hb.triggerMorph) ent._morphActivated = true;
        // 减速 / 加速 / 弹射为瞬时效果，需当前帧接触
        if (isCol) {
          if (hb.triggerSlow) p.slowTimer = 20;
          if (hb.triggerFast) p.fastTimer = 20;
          if (hb.triggerBounce && p.bounceCd <= 0) { p.vx = 0; p.vy = -12; p.bounceCd = 40; beep(600, 0.1, 'sine', 0.05); }
        }
      }
    }
  }
  for(var i=0; i<allEnts.length; i++){
    var ent = allEnts[i];
    if(ent.hitboxes && ent.hitboxes.length > 0) {
      var hasVisTrigger = false;
      for(var j=0; j<ent.hitboxes.length; j++){ if(ent.hitboxes[j].triggerVisibility) hasVisTrigger = true; }
      if (hasVisTrigger && !ent._trigVis) ent._hidden = true;
      else ent._hidden = false;
    }
  }
}
function checkHazards(){
  var p = player, i;
  // 普通尖刺：内缩量按比例 clamp，避免小尖刺高度 < 7 时碰撞盒失效
  for(i=0;i<spikes.length;i++){
    var s = spikes[i];
    var spx = Math.min(3, s.w * 0.25), spy = Math.min(7, s.h * 0.4);
    if(rectHit(p, {x:s.x+spx, y:s.y+spy, w:Math.max(1, s.w-spx*2), h:Math.max(1, s.h-spy)})){ killPlayer(); return; }
  }
  for(i=0;i<enemies.length;i++){
    var e = enemies[i]; if(!e.alive || e._hidden) continue;
    var epx = Math.min(3, e.w * 0.25), epy = Math.min(3, e.h * 0.25);
    if(rectHit(p, {x:e.x+epx, y:e.y+epy, w:Math.max(1, e.w-epx*2), h:Math.max(1, e.h-epy*2)})){
      if (p.invTimer <= 0) {
        p.hp -= (e.damage || 1);
        p.invTimer = 60;
        addParticles(p.x+7, p.y+11, 10, '#e94560', 4, 20);
        beep(300, 0.1, 'sawtooth', 0.03);
        if (p.hp <= 0) { killPlayer(); return; }
      }
    }
  }
  if(p.y > H + 120){ killPlayer(); return; }
  for(i=0;i<adv_spikes.length;i++){
    var s = adv_spikes[i];
    var triggerVis = false, triggerDmg = false;
    var hasVisTrigger = false, hasDmgTrigger = false;
    if (s.hitboxes) {
      for(var j=0; j<s.hitboxes.length; j++){
        var h = s.hitboxes[j];
        if (h.triggerVisibility) hasVisTrigger = true;
        if (h.triggerDamage) hasDmgTrigger = true;
        var tc = h.triggerCount || 0;
        var colNow = rectHit(player, getHitboxRect(s, h, state.t));
        var canTrig = (tc === 0) ? colNow : (h._hits >= tc);
        if (canTrig) {
          if (h.triggerVisibility) triggerVis = true;
          if (h.triggerDamage) triggerDmg = true;
        }
      }
    }
    s._activeVis = hasVisTrigger ? triggerVis : true;
    s._activeDmg = hasDmgTrigger ? triggerDmg : true;
    if (s._activeVis && isAdvSpikeVisible(s)) {
      var hitSpike = false;
      if (hasDmgTrigger) {
        for(var j=0; j<s.hitboxes.length; j++){
          var h = s.hitboxes[j];
          if (!h.triggerDamage) continue;
          var tcd = h.triggerCount || 0;
          var dmgRect = getHitboxRect(s, h, state.t);
          var colDmg = rectHit(player, dmgRect);
          if (tcd === 0) { if (colDmg) { hitSpike = true; break; } }
          else if (h._hits >= tcd && colDmg) { hitSpike = true; break; }
        }
      } else {
        var apx = Math.min(3, s.w * 0.25), apy = Math.min(3, s.h * 0.25);
        if(rectHit(player, {x:s.x+apx, y:s.y+apy, w:Math.max(1, s.w-apx*2), h:Math.max(1, s.h-apy*2)})) hitSpike = true;
      }
      if (hitSpike) {
        if (player.invTimer <= 0) {
          player.hp -= s.damage; player.invTimer = 60;
          addParticles(player.x+7, player.y+11, 10, '#e94560', 4, 20);
          beep(300, 0.1, 'sawtooth', 0.03);
          if(player.hp <= 0) { killPlayer(); return; }
        }
      }
    }
  }
  for(i=0;i<checkpoints.length;i++){
    var c = checkpoints[i];
    if(!c.active){
      var hit = false;
      if (c.type === 'trigger') { if (player.x + player.w > c.x) hit = true; }
      else { hit = rectHit(p, c); }
      if (hit) {
        c.active = true;
        state.spawn = { x: c.spawnX, y: c.spawnY };
        addParticles(c.x + c.w/2, c.y + c.h/2, 18, '#4ade80', 4, 36);
        beep(520, 0.1, 'sine', 0.03);
        setTimeout(function(){ beep(780, 0.12, 'sine', 0.03); }, 90);
      }
    }
  }
  if(rectHit(p, goal)){
    state.mode = 'win'; state.winTimer = 0; addParticles(goal.x + goal.w/2, goal.y + goal.h/2, 40, '#fde047', 7, 50); beep(660,0.15,'sine',0.04);
    setTimeout(function(){ beep(880,0.15,'sine',0.04); }, 140); setTimeout(function(){ beep(1100,0.25,'sine',0.04); }, 280);
  }
}
function killPlayer(){
  if(state.mode !== 'play') return;
  state.mode = 'dead'; state.deadTimer = 28; state.deaths++; state.shake = 14;
  addParticles(player.x + player.w/2, player.y + player.h/2, 26, '#e94560', 6.5, 40); addParticles(player.x + player.w/2, player.y + player.h/2, 14, '#ffffff', 4, 24); beep(140, 0.28, 'sawtooth', 0.045);
}
function respawn(){
  player.x = state.spawn.x; player.y = state.spawn.y; player.vx = 0; player.vy = 0; player.jumpsLeft = 1; player.coyote = 0; player.jumpBuffer = 0; player.onGround = false; player.ground = null; player.shootCd = 0;
  player.hp = player.maxHp; player.invTimer = 0;
  player.slowTimer = 0; player.fastTimer = 0; player.bounceCd = 0;
  player.qHold = -1; player.qDropped = false;
  enemyBullets.length = 0; state.mode = 'play'; state.camX = clamp(player.x + player.w/2 - W/2, 0, WORLD_W - W);
  addParticles(player.x + player.w/2, player.y + player.h/2, 16, '#5eead4', 4, 28);
  var allEnts = staticSolids.concat(movers).concat(adv_spikes).concat(enemies);
  for(var i=0; i<allEnts.length; i++) {
      var ent = allEnts[i];
      var shouldReset = false;
      if(ent.hitboxes) {
          for(var j=0; j<ent.hitboxes.length; j++) {
              var hb = ent.hitboxes[j];
              hb._curCollide = false;
              if (hb.resetOnDeath || hb.resetOnDeath === undefined) { hb._hits = 0; shouldReset = true; }
          }
      }
      if (shouldReset) {
          if (ent.path) ent.pathDist = 0;
          ent.phase = 0;
          ent._morphActivated = false;
          ent._morphStartT = undefined;
          ent._morphOffX = 0;
          ent._morphOffY = 0;
          if (ent.ow !== undefined) ent.w = ent.ow;
          if (ent.oh !== undefined) ent.h = ent.oh;
          if (ent.ox !== undefined) ent.x = ent.ox;
          if (ent.oy !== undefined) ent.y = ent.oy;
      }
  }
  for(var i=0; i<enemies.length; i++){
    var en = enemies[i];
    if (en.resetOnDeath !== false) {
      en.alive = true;
      en.hp = en.maxHp !== undefined ? en.maxHp : 1;
    }
  }
  for(var i=0; i<adv_spikes.length; i++){ adv_spikes[i]._activeVis = false; adv_spikes[i]._activeDmg = false; }
  for(var i=0; i<movers.length; i++){ movers[i]._activeMove = false; }

  /* 血包复原；地上武器回到出生点；玩家丢出来的武器清掉 */
  player.qHold = -1; player.qDropped = false;
  for(var h2=0; h2<healthpacks.length; h2++){
    healthpacks[h2].active = true;
    if(healthpacks[h2].path) healthpacks[h2].pathDist = 0;
  }
  for(var w2=weapons.length-1; w2>=0; w2--){
    var ww = weapons[w2];
    if(!ww._fromLevel){ weapons.splice(w2,1); continue; }
    ww.alive = true; ww._dropLock = 0; ww._toss = null;
    ww.x = ww._spawnX; ww.y = ww._spawnY;
    if(ww.path) ww.pathDist = 0;
  }
}
function update(){
  state.t++; updateMovers(); updateAdvSpikes(); updateMorphs(); updateWorldItems();
  if(state.mode === 'play') updatePlayer();
  else if(state.mode === 'dead'){ state.deadTimer--; if(state.deadTimer <= 0) respawn(); } else if(state.mode === 'win') state.winTimer++;
  updateBullets(); updateEnemies(); updateParticles();
  if(state.mode !== 'win'){ var targetX = clamp(player.x + player.w/2 - W/2 + player.vx * 6, 0, WORLD_W - W); state.camX += (targetX - state.camX) * 0.12; }
  if(state.shake > 0.1) state.shake *= 0.87; else state.shake = 0;
}
var stars = [];
for(var si=0;si<160;si++){ stars.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.6 + 0.3, d: Math.random()*0.7 + 0.15, a: Math.random()*0.6 + 0.25 }); }
function drawBackground(){
  var g = ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#07070f'); g.addColorStop(0.55,'#100e1e'); g.addColorStop(1,'#1c1330'); ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  for(var i=0;i<stars.length;i++){ var s = stars[i]; var x = s.x - state.camX * s.d; x = ((x % W) + W) % W; ctx.globalAlpha = s.a; ctx.fillStyle = '#9fb4ff'; ctx.fillRect(x, s.y, s.r, s.r); }
  ctx.globalAlpha = 1; var mx = 780 - state.camX * 0.08; ctx.globalAlpha = 0.55;
  var mg = ctx.createRadialGradient(mx, 110, 10, mx, 110, 90); mg.addColorStop(0, 'rgba(160,180,255,0.45)'); mg.addColorStop(1, 'rgba(160,180,255,0)'); ctx.fillStyle = mg;
  ctx.beginPath(); ctx.arc(mx, 110, 90, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#20264a'; ctx.beginPath(); ctx.arc(mx, 110, 42, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#2b3260'; ctx.beginPath(); ctx.arc(mx - 14, 100, 8, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(mx + 12, 124, 5, 0, Math.PI*2); ctx.fill();
}
function drawSolids(){
  for(var i=0;i<solids.length;i++){
    var s = solids[i]; if(s._hidden) continue; if(s.x + s.w < state.camX - 120 || s.x > state.camX + W + 120) continue;
    var isMover = movers.indexOf(s) >= 0; ctx.fillStyle = isMover ? '#3b2f5e' : '#242440'; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = isMover ? '#8b6ee8' : '#4d4d7d'; ctx.fillRect(s.x, s.y, s.w, 3); ctx.fillStyle = isMover ? '#a78bfa' : '#6a6aa8'; ctx.fillRect(s.x, s.y, s.w, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(s.x, s.y + s.h - 3, s.w, 3);
  }
}
function drawSpikes(){
  for(var i=0;i<spikes.length;i++){
    var s = spikes[i]; if(s.x + s.w < state.camX - 120 || s.x > state.camX + W + 120) continue;
    var n = Math.max(1, Math.round(s.w / 14)); var tw = s.w / n;
    for(var j=0;j<n;j++){
      var x = s.x + j*tw; ctx.beginPath(); ctx.moveTo(x, s.y + s.h); ctx.lineTo(x + tw/2, s.y); ctx.lineTo(x + tw, s.y + s.h); ctx.closePath(); ctx.fillStyle = '#e94560'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + tw/2, s.y); ctx.lineTo(x + tw*0.72, s.y + s.h); ctx.lineTo(x + tw/2, s.y + s.h); ctx.closePath(); ctx.fillStyle = 'rgba(255,180,200,0.45)'; ctx.fill();
    }
  }
}
function drawAdvSpikes(layer) {
  for(var i=0;i<adv_spikes.length;i++){
    var s = adv_spikes[i];
    if(s.layer !== layer) continue;
    if(s._hidden) continue;
    if(s.x + s.w < state.camX - 120 || s.x > state.camX + W + 120) continue;
    if(!isAdvSpikeVisible(s)) continue;
    var cx = s.x + s.w/2, cy = s.y + s.h/2, rad = Math.max(s.w, s.h) / 2;
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = '#ff8c00'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    if (s.shape === 'triangle') {
      var n = 4, tw = s.w / n;
      for(var j=0;j<n;j++){
        var x = -s.w/2 + j*tw;
        ctx.beginPath(); ctx.moveTo(x, s.h/2); ctx.lineTo(x + tw/2, -s.h/2); ctx.lineTo(x + tw, s.h/2); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    } else if (s.shape === 'square') { ctx.fillRect(-s.w/2, -s.h/2, s.w, s.h); ctx.strokeRect(-s.w/2, -s.h/2, s.w, s.h); }
    else if (s.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI*2); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
}
function drawCheckpoints(){
  for(var i=0;i<checkpoints.length;i++){
    var c = checkpoints[i]; if(c.x + c.w < state.camX - 120 || c.x > state.camX + W + 120) continue;
    if (c.type === 'trigger') {
      ctx.fillStyle = c.active ? 'rgba(74,222,128,0.2)' : 'rgba(56,189,248,0.2)'; ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = c.active ? '#4ade80' : '#38bdf8'; ctx.fillRect(c.x + c.w/2 - 1, c.y, 2, c.h);
      if(c.active){ ctx.globalAlpha = 0.25 + Math.sin(state.t*0.1)*0.12; ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(c.x + c.w/2, c.y + c.h/2, 20, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; }
    } else {
      ctx.fillStyle = c.active ? '#9aa4c0' : '#4a4a68'; ctx.fillRect(c.x + c.w/2 - 2, c.y, 4, c.h);
      var wave = Math.sin(state.t * 0.08) * 3; ctx.beginPath(); ctx.moveTo(c.x + c.w/2 + 2, c.y + 4); ctx.lineTo(c.x + c.w/2 + 24, c.y + 12 + wave); ctx.lineTo(c.x + c.w/2 + 2, c.y + 22); ctx.closePath(); ctx.fillStyle = c.active ? '#4ade80' : '#3a3a55'; ctx.fill();
      if(c.active){ ctx.globalAlpha = 0.25 + Math.sin(state.t*0.1)*0.12; ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(c.x + c.w/2, c.y + 20, 22, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; }
    }
  }
}
function drawGoal(){
  var g = goal; if(g.x + g.w < state.camX - 160 || g.x > state.camX + W + 160) return;
  var pulse = Math.sin(state.t * 0.09) * 0.5 + 0.5; var rg = ctx.createRadialGradient(g.x + g.w/2, g.y + g.h/2, 4, g.x + g.w/2, g.y + g.h/2, 70);
  rg.addColorStop(0, 'rgba(253,224,71,' + (0.35 + pulse*0.25) + ')'); rg.addColorStop(1, 'rgba(253,224,71,0)'); ctx.fillStyle = rg; ctx.fillRect(g.x - 60, g.y - 60, g.w + 120, g.h + 120);
  ctx.fillStyle = '#fde047'; ctx.fillRect(g.x, g.y, g.w, g.h); ctx.fillStyle = '#0b0b18'; ctx.fillRect(g.x + 5, g.y + 5, g.w - 10, g.h - 5);
  ctx.globalAlpha = 0.5 + pulse * 0.5; ctx.fillStyle = '#fef9c3';
  for(var i=0;i<4;i++) ctx.fillRect(g.x + 9, g.y + 14 + i*16, g.w - 18, 3);
  ctx.globalAlpha = 1;
}
function drawEnemies(){
  for(var i=0;i<enemies.length;i++){
    var e = enemies[i]; if(!e.alive || e._hidden) continue; if(e.x + e.w < state.camX - 120 || e.x > state.camX + W + 120) continue;
    if(e.type === 'walker'){
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(e.x, e.y, e.w, e.h); ctx.fillStyle = '#b45309'; ctx.fillRect(e.x, e.y + e.h - 6, e.w, 6);
      ctx.fillStyle = '#1a0a00'; var ex = e.vx > 0 ? e.x + e.w - 9 : e.x + 3; ctx.fillRect(ex, e.y + 8, 5, 5);
      ctx.fillStyle = '#fff7ed'; ctx.fillRect(e.x + 5, e.y + e.h - 12, 3, 4); ctx.fillRect(e.x + e.w - 9, e.y + e.h - 12, 3, 4);
      if (e.maxHp > 1) {
        var pct = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x, e.y - 6, e.w, 3);
        ctx.fillStyle = '#e94560'; ctx.fillRect(e.x, e.y - 6, e.w * pct, 3);
      }
    } else if(e.type === 'shooter'){
      var cx = e.x + e.w/2, cy = e.y + e.h/2; var rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26); rg.addColorStop(0, 'rgba(233,69,96,0.5)'); rg.addColorStop(1, 'rgba(233,69,96,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#e94560'; ctx.beginPath(); ctx.arc(cx, cy, e.w/2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a0a12'; ctx.beginPath(); ctx.arc(cx, cy, e.w/4, 0, Math.PI*2); ctx.fill(); var pulse = Math.sin(state.t*0.15)*0.5+0.5; ctx.fillStyle = 'rgba(255,220,120,' + (0.5+pulse*0.5) + ')'; ctx.beginPath(); ctx.arc(cx, cy, 3.5 + pulse*1.5, 0, Math.PI*2); ctx.fill();
      if (e.maxHp > 1) {
        var pct2 = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x, e.y - 6, e.w, 3);
        ctx.fillStyle = '#e94560'; ctx.fillRect(e.x, e.y - 6, e.w * pct2, 3);
      }
    }
  }
}
function drawBullets(){
  for(var i=0;i<bullets.length;i++){ var b = bullets[i]; var def = weaponDef(b.type); var trail = b.pierce ? 26 : 14; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.globalAlpha = 0.32; ctx.fillStyle = def.color; ctx.fillRect(-trail, -1.5, trail, 3); ctx.globalAlpha = 1; ctx.fillStyle = def.color; ctx.fillRect(-3, -2.5, 8, 5); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -1.5, 4, 3); ctx.restore(); }
  for(var i=0;i<enemyBullets.length;i++){ var b = enemyBullets[i]; var rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 10); rg.addColorStop(0, 'rgba(255,120,160,1)'); rg.addColorStop(1, 'rgba(233,69,96,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ff6b8a'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 1.8, 0, Math.PI*2); ctx.fill(); }
}
/* ---------- 血包：绿色十字 ---------- */
function drawHealthPacks(){
  for(var i=0;i<healthpacks.length;i++){
    var h = healthpacks[i];
    if(!h.active) continue;
    if(h.x + h.w < state.camX - 120 || h.x > state.camX + W + 120) continue;
    var cx = h.x + h.w/2, cy = h.y + h.h/2, half = Math.min(h.w, h.h) / 2;
    var pulse = 0.5 + Math.sin(state.t * 0.1) * 0.5;
    var rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, half + 12 + pulse * 6);
    rg.addColorStop(0, 'rgba(74,222,128,0.45)'); rg.addColorStop(1, 'rgba(74,222,128,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, half + 12 + pulse * 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#065f46'; ctx.fillRect(cx - half - 1, cy - half - 1, half*2 + 2, half*2 + 2);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(cx - half*0.32, cy - half*0.9, half*0.64, half*1.8);
    ctx.fillRect(cx - half*0.9, cy - half*0.32, half*1.8, half*0.64);
    ctx.fillStyle = 'rgba(226,255,238,0.9)';
    ctx.fillRect(cx - half*0.14, cy - half*0.72, half*0.28, half*1.44);
    ctx.fillRect(cx - half*0.72, cy - half*0.14, half*1.44, half*0.28);
  }
}
/* ---------- 地上的武器 ---------- */
function drawWeaponItems(){
  for(var i=0;i<weapons.length;i++){
    var w = weapons[i];
    if(!w.alive) continue;
    if(w.x + w.w < state.camX - 120 || w.x > state.camX + W + 120) continue;
    var def = weaponDef(w.type);
    var cx = w.x + w.w/2, cy = w.y + w.h/2 + Math.sin(state.t * 0.06 + i) * 1.5;
    var pulse = 0.5 + Math.sin(state.t * 0.12) * 0.5;
    var rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22 + pulse * 6);
    rg.addColorStop(0, 'rgba(148,163,184,0.3)'); rg.addColorStop(1, 'rgba(148,163,184,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, 22 + pulse * 6, 0, Math.PI*2); ctx.fill();
    ctx.save(); ctx.translate(cx, cy);
    if(w.type === 'rifle'){
      ctx.fillStyle = '#475569'; ctx.fillRect(-13, -3, 21, 6);
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(6, -2, 9, 4);
      ctx.fillStyle = '#334155'; ctx.fillRect(-9, 3, 5, 6);
    } else if(w.type === 'shotgun'){
      ctx.fillStyle = '#7c2d12'; ctx.fillRect(-15, 0, 14, 6);
      ctx.fillStyle = def.color; ctx.fillRect(-2, -5, 16, 4); ctx.fillRect(-2, 0, 16, 4);
    } else {
      ctx.fillStyle = '#4c1d95'; ctx.fillRect(-16, -2, 25, 5);
      ctx.fillStyle = def.color; ctx.fillRect(7, -1.5, 13, 3);
      ctx.fillStyle = '#c4b5fd'; ctx.fillRect(-7, -8, 11, 5);
      ctx.fillStyle = '#312e81'; ctx.fillRect(-8, 3, 6, 5);
    }
    ctx.restore();
    ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(cx + 16, cy - 8, 2.5, 0, Math.PI*2); ctx.fill();
  }
}
/* ---------- 长按 Q 的丢枪读条 ---------- */
function drawDropProgress(){
  var p = player;
  if(p.qHold < 0 || p.weapons.length === 0) return;
  var pr = clamp(p.qHold / DROP_HOLD, 0, 1);
  var bx = p.x + p.w/2 - 26, by = p.y - 18;
  ctx.fillStyle = 'rgba(8,8,16,0.82)'; ctx.fillRect(bx, by, 52, 8);
  ctx.fillStyle = pr >= 1 ? '#f87171' : '#38bdf8'; ctx.fillRect(bx + 1, by + 1, 50 * pr, 6);
  ctx.strokeStyle = 'rgba(160,180,220,0.65)'; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, 51, 7);
}
function drawPlayer(){
  var p = player;
  if(state.mode === 'dead'){ var t = 1 - state.deadTimer / 28; ctx.globalAlpha = Math.max(0, 1 - t*1.4); ctx.fillStyle = '#e94560'; ctx.fillRect(p.x - 4*t, p.y - 4*t, p.w + 8*t, p.h + 8*t); ctx.globalAlpha = 1; return; }
  if(state.mode === 'win') ctx.globalAlpha = 0.6 + Math.sin(state.t*0.3)*0.4;
  if(p.invTimer > 0 && Math.floor(state.t/4)%2===0) { ctx.globalAlpha = 0.3; }
  var cx = p.x + p.w/2, cy = p.y + p.h/2; var rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 24); rg.addColorStop(0, 'rgba(94,234,212,0.28)'); rg.addColorStop(1, 'rgba(94,234,212,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI*2); ctx.fill();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(p.aimAngle); ctx.fillStyle = '#94a3b8'; ctx.fillRect(2, -2.5, 14, 5); ctx.fillStyle = '#e2e8f0'; ctx.fillRect(12, -2, 5, 4); ctx.restore();
  ctx.fillStyle = '#5eead4'; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.strokeStyle = '#0d9488'; ctx.lineWidth = 1; ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
  ctx.fillStyle = '#062a26'; if(p.facing >= 0){ ctx.fillRect(p.x + p.w - 7, p.y + 5, 3, 4); ctx.fillRect(p.x + p.w - 3, p.y + 5, 2, 4); } else { ctx.fillRect(p.x + 2, p.y + 5, 3, 4); ctx.fillRect(p.x + 6, p.y + 5, 2, 4); }
  ctx.fillStyle = '#0d9488'; ctx.fillRect(p.x - 1, p.y + p.h - 6, p.w + 2, 3); ctx.globalAlpha = 1;
}
function drawParticles(){
  for(var i=0;i<particles.length;i++){ var p = particles[i]; var a = clamp(p.life / p.maxLife, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = p.color; var s = p.size * (0.4 + a * 0.6); ctx.fillRect(p.x - s/2, p.y - s/2, s, s); }
  ctx.globalAlpha = 1;
}
function roundRect(x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r); ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r); ctx.closePath(); }
function drawHUD(){
  ctx.fillStyle = 'rgba(10,10,20,0.65)'; roundRect(14, 14, 192, 36, 6); ctx.fill(); ctx.strokeStyle = 'rgba(120,150,255,0.3)'; ctx.lineWidth = 1; roundRect(14.5, 14.5, 191, 35, 6); ctx.stroke();
  ctx.fillStyle = '#e94560'; ctx.font = 'bold 16px "Courier New",monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('☠ 死亡', 26, 33); ctx.fillStyle = '#e2e8f0'; ctx.fillText(('00' + state.deaths).slice(-3), 118, 33);
  // 血量：≤8 用图标，>8 用紧凑文字，避免超出 HUD 宽度
  if (player.maxHp <= 8) {
    for (var i=0; i<player.maxHp; i++) {
      ctx.beginPath(); var hx = 155 + i * 12, hy = 33; ctx.arc(hx, hy, 4, 0, Math.PI*2);
      if (i < player.hp) { ctx.fillStyle = '#e94560'; ctx.fill(); } else { ctx.strokeStyle = '#e94560'; ctx.lineWidth = 1; ctx.stroke(); }
    }
  } else {
    ctx.font = 'bold 14px "Courier New",monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#e94560';
    ctx.fillText('❤ ' + player.hp + ' / ' + player.maxHp, 155, 33);
  }
  /* 武器栏：2 格，当前主武器高亮 */
  var slotY = 56;
  ctx.fillStyle = 'rgba(10,10,20,0.65)'; roundRect(14, slotY, 192, 30, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(120,150,255,0.22)'; ctx.lineWidth = 1; roundRect(14.5, slotY + 0.5, 191, 29, 6); ctx.stroke();
  for(var s = 0; s < MAX_SLOTS; s++){
    var slot = player.weapons[s], bx2 = 22 + s * 94, by2 = slotY + 5;
    var isActive = !!slot && s === player.weaponIndex;
    ctx.fillStyle = isActive ? 'rgba(94,234,212,0.16)' : 'rgba(255,255,255,0.04)';
    roundRect(bx2, by2, 88, 20, 4); ctx.fill();
    if(isActive){ ctx.strokeStyle = '#5eead4'; roundRect(bx2 + 0.5, by2 + 0.5, 87, 19, 4); ctx.stroke(); }
    ctx.font = 'bold 11px "Courier New",monospace'; ctx.textAlign = 'left';
    if(slot){
      ctx.fillStyle = isActive ? '#a7fff0' : 'rgba(160,180,220,0.7)';
      ctx.fillText(weaponDef(slot.type).short + ' ×' + slot.damage, bx2 + 8, by2 + 10);
    } else {
      ctx.fillStyle = 'rgba(160,180,220,0.3)';
      ctx.fillText('空', bx2 + 8, by2 + 10);
    }
  }
  ctx.fillStyle = 'rgba(160,180,220,0.55)'; ctx.font = '13px "Courier New",monospace'; ctx.textAlign = 'right'; ctx.fillText('A/D 移动 · SPACE 跳跃 · 鼠标射击 · Q 换枪(长按丢枪) · R 重来', W - 18, 32);
  var prog = clamp(player.x / (goal.x || 1), 0, 1); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(W/2 - 180, H - 22, 360, 5); ctx.fillStyle = '#5eead4'; ctx.fillRect(W/2 - 180, H - 22, 360 * prog, 5); ctx.fillStyle = '#fde047'; ctx.fillRect(W/2 + 177, H - 26, 6, 13);
  ctx.fillStyle = '#5eead4'; ctx.beginPath(); ctx.arc(W/2 - 180 + 360*prog, H - 19.5, 4, 0, Math.PI*2); ctx.fill();
  var mx = mouse.x, my = mouse.y; ctx.strokeStyle = 'rgba(253,224,71,0.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mx - 15, my); ctx.lineTo(mx - 5, my); ctx.moveTo(mx + 5, my); ctx.lineTo(mx + 15, my); ctx.moveTo(mx, my - 15); ctx.lineTo(mx, my - 5); ctx.moveTo(mx, my + 5); ctx.lineTo(mx, my + 15); ctx.stroke();
}
function drawOverlay(){
  if(state.mode === 'dead'){ var a = (state.deadTimer / 28) * 0.35; ctx.fillStyle = 'rgba(233,69,96,' + a + ')'; ctx.fillRect(0,0,W,H); }
  if(state.mode === 'win'){
    var al = clamp(state.winTimer / 40, 0, 1); ctx.fillStyle = 'rgba(5,5,15,' + (0.72 * al) + ')'; ctx.fillRect(0,0,W,H); ctx.globalAlpha = al; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var bounce = Math.sin(state.t * 0.08) * 6; ctx.font = 'bold 64px "Courier New",monospace'; ctx.fillStyle = '#fde047'; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 30; ctx.fillText('YOU WIN!', W/2, H/2 - 60 + bounce);
    ctx.shadowBlur = 0; ctx.font = 'bold 22px "Courier New",monospace'; ctx.fillStyle = '#e2e8f0'; ctx.fillText('死亡次数: ' + state.deaths, W/2, H/2 + 20);
    ctx.font = '16px "Courier New",monospace'; ctx.fillStyle = 'rgba(180,200,240,0.75)'; ctx.fillText('刷新页面再来一次', W/2, H/2 + 62); ctx.globalAlpha = 1;
  }
}
function render(){
  ctx.clearRect(0,0,W,H); drawBackground(); var sx = state.shake > 0.2 ? rnd(-state.shake, state.shake) : 0; var sy = state.shake > 0.2 ? rnd(-state.shake, state.shake) : 0;
  ctx.save(); ctx.translate(-Math.round(state.camX) + sx, sy);
  drawSolids(); drawSpikes(); drawCheckpoints(); drawGoal();
  drawHealthPacks(); drawWeaponItems();
  drawAdvSpikes('bottom');
  drawEnemies(); drawBullets(); drawPlayer(); drawDropProgress(); drawAdvSpikes('top'); drawParticles();
  ctx.restore();
  drawHUD(); drawOverlay();
}
var lastTime = performance.now(); var accumulator = 0; var STEP = 1000 / 60;
function loop(now){
  requestAnimationFrame(loop); var delta = now - lastTime; lastTime = now; if(delta > 100) delta = 100; accumulator += delta; var guard = 0;
  while(accumulator >= STEP && guard < 5){ update(); accumulator -= STEP; guard++; }
  if(guard >= 5) accumulator = 0; render();
}
state.camX = 0; requestAnimationFrame(loop);
})();
</script>
</body>
</html>`;
