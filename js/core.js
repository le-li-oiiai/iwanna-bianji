/*
 * core.js —— 编辑器核心状态
 *
 * 这一层只有「数据」和「模型操作」：
 *   默认关卡、工具定义、编辑状态 ed、撤销栈 history、坐标换算、实体增删改查、视图缩放
 *
 * 所有对外接口都挂在 window.EDITOR 上（下面简写 E），其他文件通过 E.xxx 调用。
 */
window.EDITOR = window.EDITOR || {};

(function (E) {
  'use strict';

  E.defaultLevel = function(){
    return {
      worldW: 4000, worldH: 540, playerMaxHp: 3,
      spawn: { x: 60, y: 458 },
      solids: [
        {x:0,y:480,w:560,h:60,hitboxes:[]},{x:720,y:480,w:480,h:60,hitboxes:[]},
        {x:1400,y:480,w:600,h:60,hitboxes:[]},{x:2150,y:480,w:550,h:60,hitboxes:[]},
        {x:2900,y:480,w:700,h:60,hitboxes:[]},{x:3800,y:480,w:200,h:60,hitboxes:[]},
        {x:180,y:380,w:120,h:18,hitboxes:[]},{x:400,y:300,w:110,h:18,hitboxes:[]},
        {x:600,y:400,w:90,h:18,hitboxes:[]},{x:830,y:360,w:140,h:18,hitboxes:[]},
        {x:1080,y:290,w:110,h:18,hitboxes:[]},{x:1300,y:410,w:80,h:18,hitboxes:[]},
        {x:1500,y:380,w:130,h:18,hitboxes:[]},{x:1750,y:300,w:120,h:18,hitboxes:[]},
        {x:1980,y:390,w:90,h:18,hitboxes:[]},{x:2200,y:380,w:130,h:18,hitboxes:[]},
        {x:2450,y:310,w:110,h:18,hitboxes:[]},{x:2950,y:360,w:140,h:18,hitboxes:[]},
        {x:3250,y:290,w:110,h:18,hitboxes:[]},{x:3550,y:390,w:100,h:18,hitboxes:[]},
        {x:2500,y:460,w:60,h:20,hitboxes:[]},{x:3350,y:460,w:60,h:20,hitboxes:[]}
      ],
      movers: [
        {x:2680,y:390,w:90,h:16,ax:90,ay:0,spd:0.018,phase:0,hitboxes:[]},
        {x:1200,y:390,w:80,h:16,ax:0,ay:60,spd:0.022,phase:0,hitboxes:[]}
      ],
      spikes: [
        {x:300,y:456,w:70,h:24},{x:900,y:456,w:90,h:24},
        {x:1600,y:456,w:110,h:24},{x:2300,y:456,w:90,h:24},
        {x:3050,y:456,w:80,h:24},{x:3450,y:456,w:70,h:24},
        {x:470,y:284,w:40,h:16},{x:2500,y:454,w:60,h:6}
      ],
      adv_spikes: [],
      enemies: [
        {type:'walker',x:950,y:446,w:22,h:34,minX:860,maxX:1150,vx:1.5,hitboxes:[],hp:1,damage:1,resetOnDeath:true},
        {type:'walker',x:1650,y:446,w:22,h:34,minX:1450,maxX:1950,vx:1.8,hitboxes:[],hp:1,damage:1,resetOnDeath:true},
        {type:'walker',x:2400,y:446,w:22,h:34,minX:2200,maxX:2650,vx:1.6,hitboxes:[],hp:1,damage:1,resetOnDeath:true},
        {type:'walker',x:3150,y:446,w:22,h:34,minX:2960,maxX:3550,vx:1.9,hitboxes:[],hp:1,damage:1,resetOnDeath:true},
        {type:'shooter',x:1480,y:210,w:26,h:26,baseY:210,phase:0,cd:60,hitboxes:[],hp:1,damage:1,resetOnDeath:true},
        {type:'shooter',x:2260,y:180,w:26,h:26,baseY:180,phase:1.5,cd:90,hitboxes:[],hp:1,damage:1,resetOnDeath:true},
        {type:'shooter',x:3320,y:200,w:26,h:26,baseY:200,phase:3.0,cd:120,hitboxes:[],hp:1,damage:1,resetOnDeath:true}
      ],
      checkpoints: [
        {x:60,y:440,w:20,h:40,spawnX:60,spawnY:458},
        {x:730,y:440,w:20,h:40,spawnX:730,spawnY:458},
        {x:1420,y:440,w:20,h:40,spawnX:1420,spawnY:458},
        {x:2170,y:440,w:20,h:40,spawnX:2170,spawnY:458},
        {x:2920,y:440,w:20,h:40,spawnX:2920,spawnY:458}
      ],
      healthpacks: [],
      weapons: [],
      playerWeapons: [{ type:'rifle', damage:1 }],
      goal: { x:3900, y:400, w:34, h:80 }
    };
  };

  var TOOLS = E.TOOLS = [
    { id:'select', name:'选择 / 移动', color:'#5eead4', key:'1' },
    { id:'solid', name:'实体方块', color:'#4d4d7d', key:'2' },
    { id:'mover', name:'移动平台', color:'#a78bfa', key:'3' },
    { id:'spike', name:'普通尖刺', color:'#e94560', key:'4' },
    { id:'adv_spike', name:'自设尖刺', color:'#ff8c00', key:'0' },
    { id:'walker', name:'巡逻敌人', color:'#f59e0b', key:'5' },
    { id:'shooter', name:'射击敌人', color:'#e94560', key:'6' },
    { id:'healthpack', name:'血包', color:'#4ade80', key:'H' },
    { id:'weapon', name:'武器', color:'#38bdf8', key:'W' },
    { id:'checkpoint', name:'接触存档点', color:'#4ade80', key:'7' },
    { id:'trigger', name:'自动存档点', color:'#38bdf8', key:'T' },
    { id:'goal', name:'终点', color:'#fde047', key:'8' },
    { id:'erase', name:'橡皮擦', color:'#6a7290', key:'9' }
  ];
  var TOOL_DEFAULT = E.TOOL_DEFAULT = { solid:{w:100,h:20}, mover:{w:90,h:16}, spike:{w:60,h:24}, adv_spike:{w:40,h:40}, walker:{w:22,h:34}, shooter:{w:26,h:26}, healthpack:{w:22,h:22}, weapon:{w:28,h:14}, checkpoint:{w:20,h:40}, trigger:{w:10,h:100}, goal:{w:34,h:80} };
  var TYPE_NAME = E.TYPE_NAME = { solid:'实体方块', mover:'移动平台', spike:'普通尖刺', adv_spike:'自设尖刺', walker:'巡逻敌人', shooter:'射击敌人', healthpack:'血包', weapon:'武器', checkpoint:'接触存档点', trigger:'自动存档点', goal:'终点' };
  var TYPE_COLOR = E.TYPE_COLOR = { solid:'#4d4d7d', mover:'#a78bfa', spike:'#e94560', adv_spike:'#ff8c00', walker:'#f59e0b', shooter:'#e94560', healthpack:'#4ade80', weapon:'#38bdf8', checkpoint:'#4ade80', trigger:'#38bdf8', goal:'#fde047' };

  /* 武器相关常量（编辑器侧的一份，和游戏里 js/weapons.js 对应） */
  E.WEAPON_OPTIONS = [
    { id:'rifle',   name:'突击步枪', color:'#fde047' },
    { id:'shotgun', name:'霰弹枪',   color:'#fb923c' },
    { id:'sniper',  name:'狙击步枪', color:'#a78bfa' }
  ];
  E.WEAPON_NAME  = { rifle:'突击步枪', shotgun:'霰弹枪', sniper:'狙击步枪' };
  E.WEAPON_SHORT = { rifle:'突击', shotgun:'霰弹', sniper:'狙击' };
  E.WEAPON_COLOR = { rifle:'#fde047', shotgun:'#fb923c', sniper:'#a78bfa' };
  E.WEAPON_DEFAULT_DAMAGE = { rifle:1, shotgun:1, sniper:3 };
  E.MAX_WEAPON_SLOTS = 2;

  var $ = E.$ = function(id){ return document.getElementById(id); };
  var cvs = $('cv'), ctx = cvs.getContext('2d');
  E.dpr = window.devicePixelRatio || 1;
  var level = E.defaultLevel();
  var ed = { tool: 'select', cam: { x: -40, y: -40 }, zoom: 0.7, selected: null, multiSelected: [], selectedHitboxIdx: undefined, drag: null, panning: false, spaceDown: false, shiftDown: false, snap: true, gridSize: 10, mouseScreen: { x:0, y:0 }, mouseWorld: { x:0, y:0 }, dirty: true, boxSelect: null };
  E.viewW = 800; E.viewH = 600;
  var history = { undo: [], redo: [], limit: 80 };

  E.getHitboxRect = function(ent, h, t) {
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
      if (morph === 'pulse') { var scale = 1 + Math.sin(t * 0.1) * 0.2; cw = ow * scale; ch = oh * scale; }
      else if (morph === 'stretch') { var p = (Math.sin(t * 0.05) + 1) / 2; cw = ow + ((ent.targetW || ow) - ow) * p; ch = oh + ((ent.targetH || oh) - oh) * p; }
      var sx = cw / ow, sy = ch / oh;
      var ecx = ent.x + ent.w / 2, ecy = ent.y + ent.h / 2;
      var ocx = ox + ow / 2, ocy = oy + oh / 2;
      var ohcx = ox + h.x + h.w / 2, ohcy = oy + h.y + h.h / 2;
      var offsetX = ohcx - ocx, offsetY = ohcy - ocy;
      var new_hcx = ecx + offsetX * sx, new_hcy = ecy + offsetY * sy;
      var new_hw = h.w * sx, new_hh = h.h * sy;
      return { x: new_hcx - new_hw / 2, y: new_hcy - new_hh / 2, w: new_hw, h: new_hh };
  };
  E.cloneLevel = function(){ return JSON.parse(JSON.stringify({ worldW: level.worldW, worldH: level.worldH, playerMaxHp: level.playerMaxHp, spawn: level.spawn, solids: level.solids, movers: level.movers, spikes: level.spikes, adv_spikes: level.adv_spikes, enemies: level.enemies, checkpoints: level.checkpoints, healthpacks: level.healthpacks, weapons: level.weapons, playerWeapons: level.playerWeapons, goal: level.goal })); };
  E.pushHistory = function(){ history.undo.push(JSON.stringify(E.cloneLevel())); if(history.undo.length > history.limit) history.undo.shift(); history.redo.length = 0; E.updateHistoryButtons(); };
  E.restoreFrom = function(str){
    var d = JSON.parse(str);
    level.worldW = d.worldW; level.worldH = d.worldH; level.playerMaxHp = d.playerMaxHp || 3; level.spawn = d.spawn; level.solids = d.solids; level.movers = d.movers; level.spikes = d.spikes; level.adv_spikes = d.adv_spikes || []; level.enemies = d.enemies; level.checkpoints = d.checkpoints;
    level.healthpacks = d.healthpacks || []; level.weapons = d.weapons || []; level.playerWeapons = d.playerWeapons || [];
    level.goal = d.goal;
    ed.selected = null; ed.multiSelected = []; ed.selectedHitboxIdx = undefined; ed.boxSelect = null; E.refreshAll();
  };
  E.doUndo = function(){ if(!history.undo.length) return; history.redo.push(JSON.stringify(E.cloneLevel())); E.restoreFrom(history.undo.pop()); E.updateHistoryButtons(); };
  E.doRedo = function(){ if(!history.redo.length) return; history.undo.push(JSON.stringify(E.cloneLevel())); E.restoreFrom(history.redo.pop()); E.updateHistoryButtons(); };
  E.updateHistoryButtons = function(){ $('btn-undo').disabled = history.undo.length === 0; $('btn-redo').disabled = history.redo.length === 0; };

  E.w2s = function(wx, wy){ return { x: (wx - ed.cam.x) * ed.zoom, y: (wy - ed.cam.y) * ed.zoom }; };
  E.s2w = function(sx, sy){ return { x: sx / ed.zoom + ed.cam.x, y: sy / ed.zoom + ed.cam.y }; };
  E.w2r = function(e){ return { x: (e.x - ed.cam.x) * ed.zoom, y: (e.y - ed.cam.y) * ed.zoom, w: e.w * ed.zoom, h: e.h * ed.zoom }; };
  E.snapVal = function(v){ return ed.snap ? Math.round(v / ed.gridSize) * ed.gridSize : Math.round(v); };
  E.clamp = function(v,a,b){ return v<a?a:v>b?b:v; };

  E.collectEntities = function(){
    var out = [], i, e;
    for(i=0;i<level.solids.length;i++){ e=level.solids[i]; out.push({type:'solid', e:e, arr:level.solids}); }
    for(i=0;i<level.movers.length;i++){ e=level.movers[i]; out.push({type:'mover', e:e, arr:level.movers}); }
    for(i=0;i<level.spikes.length;i++){ e=level.spikes[i]; out.push({type:'spike', e:e, arr:level.spikes}); }
    for(i=0;i<level.adv_spikes.length;i++){ e=level.adv_spikes[i]; out.push({type:'adv_spike', e:e, arr:level.adv_spikes}); }
    for(i=0;i<level.enemies.length;i++){ e=level.enemies[i]; out.push({type:e.type, e:e, arr:level.enemies}); }
    for(i=0;i<level.checkpoints.length;i++){ e=level.checkpoints[i]; out.push({type:e.type || 'checkpoint', e:e, arr:level.checkpoints}); }
    for(i=0;i<level.healthpacks.length;i++){ e=level.healthpacks[i]; out.push({type:'healthpack', e:e, arr:level.healthpacks}); }
    for(i=0;i<level.weapons.length;i++){ e=level.weapons[i]; out.push({type:'weapon', e:e, arr:level.weapons}); }
    if(level.goal) out.push({type:'goal', e:level.goal, arr:[level.goal]});
    return out;
  };
  E.hitTest = function(wx, wy){
    var list = E.collectEntities();
    for(var i=list.length-1;i>=0;i--){ var it = list[i], e = it.e; if(wx >= e.x && wx <= e.x + e.w && wy >= e.y && wy <= e.y + e.h) return it; }
    return null;
  };
  E.hitHandle = function(sx, sy, e){
    var r = E.w2r(e), hs = 8;
    var pts = { nw: [r.x, r.y], ne: [r.x + r.w, r.y], sw: [r.x, r.y + r.h], se: [r.x + r.w, r.y + r.h] };
    for(var k in pts){ if(Math.abs(sx - pts[k][0]) <= hs && Math.abs(sy - pts[k][1]) <= hs) return k; }
    return null;
  };
  E.hitTargetHandle = function(sx, sy, e){
    if(e.morph !== 'stretch') return null;
    var tw = e.targetW || e.w, th = e.targetH || e.h;
    var tcx = e.x + e.w/2 + (e.targetOffX || 0);
    var tcy = e.y + e.h/2 + (e.targetOffY || 0);
    var tx = tcx - tw/2, ty = tcy - th/2;
    var r = E.w2r({x:tx, y:ty, w:tw, h:th}), hs = 8;
    var pts = { nw: [r.x, r.y], ne: [r.x + r.w, r.y], sw: [r.x, r.y + r.h], se: [r.x + r.w, r.y + r.h] };
    for(var k in pts){ if(Math.abs(sx - pts[k][0]) <= hs && Math.abs(sy - pts[k][1]) <= hs) return k; }
    if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) return 'move';
    return null;
  };
  E.createEntity = function(type, x, y, w, h){
    var e;
    if(type === 'solid') e = { x:x, y:y, w:w, h:h, ow:w, oh:h, ox:x, oy:y, morph:'none', morphDemo:false, morphLoop:true, targetW:w, targetH:h, targetOffX:0, targetOffY:0, hitboxes: [] };
    else if(type === 'mover') e = { x:x, y:y, w:w, h:h, ow:w, oh:h, ox:x, oy:y, morph:'none', morphDemo:false, morphLoop:true, targetW:w, targetH:h, targetOffX:0, targetOffY:0, ax:60, ay:0, spd:0.02, phase:0, path: [], hitboxes: [] };
    else if(type === 'spike') e = { x:x, y:y, w:w, h:h };
    else if(type === 'adv_spike') e = { x:x, y:y, w:w, h:h, ow:w, oh:h, ox:x, oy:y, morph:'none', morphDemo:false, morphLoop:true, targetW:w, targetH:h, targetOffX:0, targetOffY:0, damage:1, shape:'triangle', visibility:'always', layer:'top', hitboxes:[], phase:0, path: [] };
    else if(type === 'walker') e = { type:'walker', x:x, y:y, w:w, h:h, minX: x-100, maxX: x+w+100, vx:1.5, path: [], hitboxes: [], hp:1, damage:1, resetOnDeath:true };
    else if(type === 'shooter') e = { type:'shooter', x:x, y:y, w:w, h:h, baseY:y, phase:0, cd:90, path: [], hitboxes: [], hp:1, damage:1, resetOnDeath:true };
    else if(type === 'healthpack') e = { x:x, y:y, w:w, h:h, heal:1, path: [], pathSpeed: 2 };
    else if(type === 'weapon') e = { x:x, y:y, w:w, h:h, type:'rifle', damage:1, path: [], pathSpeed: 2 };
    else if(type === 'checkpoint') e = { x:x, y:y, w:w, h:h, spawnX: Math.round(x + w/2 - 7), spawnY: Math.round(y + h - 22) };
    else if(type === 'trigger') e = { type:'trigger', x:x, y:y, w:w, h:h, spawnX: Math.round(x + w + 10), spawnY: Math.round(y + h - 22) };
    else if(type === 'goal') e = { x:x, y:y, w:w, h:h };
    return e;
  };
  E.addEntity = function(type, x, y, w, h){
    E.pushHistory(); var e = E.createEntity(type, x, y, w, h);
    if(type === 'solid') level.solids.push(e); 
    else if(type === 'mover') level.movers.push(e); 
    else if(type === 'spike') level.spikes.push(e); 
    else if(type === 'adv_spike') level.adv_spikes.push(e);
    else if(type === 'walker' || type === 'shooter') level.enemies.push(e); 
    else if(type === 'healthpack') level.healthpacks.push(e);
    else if(type === 'weapon') level.weapons.push(e);
    else if(type === 'checkpoint' || type === 'trigger') level.checkpoints.push(e);
    else if(type === 'goal'){ if(level.goal){ alert('关卡中已经有终点，请先删除旧的。'); history.undo.pop(); return; } level.goal = e; }
    ed.selected = { type:type, e:e, arr:null }; ed.multiSelected = []; ed.selectedHitboxIdx = undefined; E.refreshAll();
  };
  E.deleteSelected = function(){
    if(ed.multiSelected.length > 0){
      E.pushHistory();
      for(var k=0; k<ed.multiSelected.length; k++){
        var it = ed.multiSelected[k];
        if(it.type === 'goal') level.goal = null;
        else { var arr = it.arr; var idx = arr.indexOf(it.e); if(idx >= 0) arr.splice(idx, 1); }
      }
      ed.multiSelected = []; ed.selected = null; ed.selectedHitboxIdx = undefined; E.refreshAll(); return;
    }
    if(!ed.selected) return; var it = ed.selected; E.pushHistory();
    if(it.type === 'goal') level.goal = null;
    else {
      var arr = (it.type === 'solid') ? level.solids : (it.type === 'mover') ? level.movers : (it.type === 'spike') ? level.spikes : (it.type === 'adv_spike') ? level.adv_spikes : (it.type === 'walker' || it.type === 'shooter') ? level.enemies : (it.type === 'healthpack') ? level.healthpacks : (it.type === 'weapon') ? level.weapons : level.checkpoints;
      var idx = arr.indexOf(it.e); if(idx >= 0) arr.splice(idx, 1);
    }
    ed.selected = null; ed.selectedHitboxIdx = undefined; E.refreshAll();
  };
  E.resizeCanvas = function(){ var rect = cvs.getBoundingClientRect(); E.viewW = rect.width; E.viewH = rect.height; cvs.width = Math.round(E.viewW * E.dpr); cvs.height = Math.round(E.viewH * E.dpr); ed.dirty = true; };
  E.fitView = function(){ ed.zoom = E.clamp(Math.min(E.viewW / level.worldW, E.viewH / level.worldH) * 0.94, 0.05, 3); ed.cam.x = level.worldW / 2 - E.viewW / (2 * ed.zoom); ed.cam.y = level.worldH / 2 - E.viewH / (2 * ed.zoom); E.updateZoomLabel(); ed.dirty = true; };
  E.updateZoomLabel = function(){ $('zoom-label').textContent = Math.round(ed.zoom * 100) + '%'; };

  /* 共享给其他模块（对象引用不变，后续只改字段） */
  E.$ = $;
  E.cvs = cvs;
  E.ctx = ctx;
  E.level = level;
  E.ed = ed;
  E.history = history;
})(window.EDITOR);
