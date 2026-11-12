/*
 * level-io.js —— 关卡读写与导出
 *
 *   保存 JSON / 加载 JSON：关卡文件
 *   测试游玩 / 导出 HTML：把关卡数据塞进 templates/game-template.js 里的模板
 */
(function (E) {
  'use strict';

  var $ = E.$;
  var level = E.level, ed = E.ed;

  E.serializeLevel = function(){
    var movers = level.movers.map(function(m){
      return { x: m.x, y: m.y, w: m.w, h: m.h, ow: m.ow !== undefined ? m.ow : m.w, oh: m.oh !== undefined ? m.oh : m.h, ox: m.ox !== undefined ? m.ox : m.x, oy: m.oy !== undefined ? m.oy : m.y, ax: m.ax, ay: m.ay, spd: m.spd, phase: m.phase || 0, dx: 0, dy: 0, path: m.path || [], pathSpeed: m.pathSpeed || 2, pathDist: 0, pathDir: 1, hitboxes: m.hitboxes || [], morph: m.morph || 'none', morphLoop: m.morphLoop !== false, targetW: m.targetW || m.w, targetH: m.targetH || m.h, targetOffX: m.targetOffX || 0, targetOffY: m.targetOffY || 0 };
    });
    var solids = level.solids.map(function(s){
      return { x: s.x, y: s.y, w: s.w, h: s.h, ow: s.ow !== undefined ? s.ow : s.w, oh: s.oh !== undefined ? s.oh : s.h, ox: s.ox !== undefined ? s.ox : s.x, oy: s.oy !== undefined ? s.oy : s.y, hitboxes: s.hitboxes || [], morph: s.morph || 'none', morphLoop: s.morphLoop !== false, targetW: s.targetW || s.w, targetH: s.targetH || s.h, targetOffX: s.targetOffX || 0, targetOffY: s.targetOffY || 0 };
    });
    var enemies = level.enemies.map(function(e){
      var baseObj = { type: e.type, x: e.x, y: e.y, w: e.w, h: e.h, alive: true, path: e.path || [], pathSpeed: e.pathSpeed || 2, pathDist: 0, pathDir: 1, hitboxes: e.hitboxes || [], hp: e.hp || 1, maxHp: e.hp || 1, damage: e.damage || 1, resetOnDeath: e.resetOnDeath !== false };
      if (e.type === 'shooter') { baseObj.baseY = e.y; baseObj.phase = e.phase || 0; baseObj.cd = e.cd || 90; }
      else if (e.type === 'walker') { baseObj.minX = e.minX; baseObj.maxX = e.maxX; baseObj.vx = e.vx; }
      return baseObj;
    });
    var adv_spikes = level.adv_spikes.map(function(s) {
      return { x: s.x, y: s.y, w: s.w, h: s.h, ow: s.ow !== undefined ? s.ow : s.w, oh: s.oh !== undefined ? s.oh : s.h, ox: s.ox !== undefined ? s.ox : s.x, oy: s.oy !== undefined ? s.oy : s.y, damage: s.damage, shape: s.shape, visibility: s.visibility, morph: s.morph || 'none', morphLoop: s.morphLoop !== false, layer: s.layer, targetW: s.targetW || s.w, targetH: s.targetH || s.h, targetOffX: s.targetOffX || 0, targetOffY: s.targetOffY || 0, hitboxes: s.hitboxes || [], phase: s.phase || 0, path: s.path || [], pathSpeed: s.pathSpeed || 2, pathDist: 0, pathDir: 1 };
    });
    var cps = level.checkpoints.map(function(c){ return { x: c.x, y: c.y, w: c.w, h: c.h, type: c.type || 'checkpoint', spawnX: c.spawnX, spawnY: c.spawnY, active: false }; });

    var healthpacks = (level.healthpacks || []).map(function(h){
      return {
        x: h.x, y: h.y, w: h.w, h: h.h, heal: h.heal || 1,
        path: h.path || [], pathSpeed: h.pathSpeed || 2, pathDist: 0, pathDir: 1
      };
    });

    var weapons = (level.weapons || []).map(function(w){
      return {
        x: w.x, y: w.y, w: w.w, h: w.h,
        type: w.type || 'rifle', damage: w.damage || 1,
        path: w.path || [], pathSpeed: w.pathSpeed || 2, pathDist: 0, pathDir: 1
      };
    });

    var playerWeapons = (level.playerWeapons || []).slice(0, E.MAX_WEAPON_SLOTS).map(function(w){
      return { type: w.type, damage: w.damage || 1 };
    });

    return {
      worldW: level.worldW, worldH: level.worldH, playerMaxHp: level.playerMaxHp || 3,
      spawn: { x: level.spawn.x, y: level.spawn.y },
      solids: solids, movers: movers, spikes: level.spikes, adv_spikes: adv_spikes,
      enemies: enemies, checkpoints: cps, healthpacks: healthpacks, weapons: weapons,
      playerWeapons: playerWeapons,
      goal: level.goal || { x: 0, y: 0, w: 0, h: 0 }
    };
  };

  E.generateGameHTML = function(){
    var lv = E.serializeLevel();
    var block = [
      '/* ---- 关卡数据（由编辑器生成） ---- */',
      'var WORLD_W = ' + lv.worldW + ';',
      'var WORLD_H = ' + lv.worldH + ';',
      'var MAX_HP = ' + lv.playerMaxHp + ';',
      'var SPAWN = { x: ' + lv.spawn.x + ', y: ' + lv.spawn.y + ' };',
      '',
      'var staticSolids = ' + JSON.stringify(lv.solids) + ';',
      '',
      'var movers = ' + JSON.stringify(lv.movers) + ';',
      '',
      'var spikes = ' + JSON.stringify(lv.spikes) + ';',
      '',
      'var adv_spikes = ' + JSON.stringify(lv.adv_spikes) + ';',
      '',
      'var enemies = ' + JSON.stringify(lv.enemies) + ';',
      '',
      'var checkpoints = ' + JSON.stringify(lv.checkpoints) + ';',
      '',
      'var healthpacks = ' + JSON.stringify(lv.healthpacks) + ';',
      '',
      'var weapons = ' + JSON.stringify(lv.weapons) + ';',
      '',
      'var playerWeapons = ' + JSON.stringify(lv.playerWeapons) + ';',
      '',
      'var goal = ' + JSON.stringify(lv.goal) + ';'
    ].join('\n');
    var tpl = window.IW_TEMPLATES.gameTemplate;
    // JS 模板字符串会把换行统一成 LF，这里还原成 CRLF，导出的文件和以前逐字节一致
    tpl = tpl.replace(/\r?\n/g, '\r\n');
    return tpl.replace('/*__LEVEL_DATA__*/', function(){ return block; });
  };

  var currentBlobUrl = null;
  E.testPlay = function(){
    try{
      var html = E.generateGameHTML(), blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      if(currentBlobUrl){ URL.revokeObjectURL(currentBlobUrl); }
      currentBlobUrl = URL.createObjectURL(blob);
      var iframe = $('test-frame');
      iframe.onload = function() { try { iframe.contentWindow.focus(); } catch(e) {} };
      iframe.src = currentBlobUrl;
      $('test-overlay').classList.remove('hidden');
    }catch(err){ alert('生成测试页面失败：' + err.message); }
  };
  E.closeTest = function(){ $('test-overlay').classList.add('hidden'); $('test-frame').src = 'about:blank'; if(currentBlobUrl){ URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; } };
  E.downloadBlob = function(blob, filename){ var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 200); };
  E.exportHTML = function(){ var html = E.generateGameHTML(); E.downloadBlob(new Blob([html], { type:'text/html;charset=utf-8' }), 'i-wanna-shoot.html'); };
  E.saveJSON = function(){ var data = JSON.stringify(E.serializeLevel(), null, 2); E.downloadBlob(new Blob([data], { type:'application/json;charset=utf-8' }), 'level.json'); };

  E.loadJSON = function(){
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.addEventListener('change', function(){
      var f = inp.files && inp.files[0]; if(!f) return;
      var reader = new FileReader();
      reader.onload = function(){
        try{
          var d = JSON.parse(reader.result); if(!d || typeof d !== 'object') throw new Error('格式错误'); E.pushHistory();
          level.worldW = d.worldW || 4000; level.worldH = d.worldH || 540; level.playerMaxHp = d.playerMaxHp || 3; level.spawn = d.spawn || { x:60, y:458 };
          level.solids = (d.solids || []).map(function(s){ return { x:s.x, y:s.y, w:s.w, h:s.h, ow:s.w, oh:s.h, ox:s.x, oy:s.y, hitboxes: s.hitboxes || [], morph: s.morph || 'none', morphDemo: false, morphLoop: s.morphLoop !== false, targetW: s.targetW || s.w, targetH: s.targetH || s.h, targetOffX: s.targetOffX || 0, targetOffY: s.targetOffY || 0 }; });
          level.movers = (d.movers || []).map(function(m){ return { x:m.x, y:m.y, w:m.w, h:m.h, ow:m.w, oh:m.h, ox:m.x, oy:m.y, ax:m.ax||0, ay:m.ay||0, spd:m.spd||0.02, phase:m.phase||0, path: m.path || [], pathSpeed: m.pathSpeed || 2, hitboxes: m.hitboxes || [], morph: m.morph || 'none', morphDemo: false, morphLoop: m.morphLoop !== false, targetW: m.targetW || m.w, targetH: m.targetH || m.h, targetOffX: m.targetOffX || 0, targetOffY: m.targetOffY || 0 }; });
          level.spikes = d.spikes || [];
          level.adv_spikes = (d.adv_spikes || []).map(function(s){
            return { x:s.x, y:s.y, w:s.w, h:s.h, ow:s.w, oh:s.h, ox:s.x, oy:s.y, damage:s.damage, shape:s.shape, visibility:s.visibility, morph:s.morph || 'none', morphDemo: false, morphLoop:s.morphLoop !== false, layer:s.layer, targetW:s.targetW||s.w, targetH:s.targetH||s.h, targetOffX: s.targetOffX || 0, targetOffY: s.targetOffY || 0, hitboxes:s.hitboxes||[], phase:s.phase||0, path: s.path || [], pathSpeed: s.pathSpeed || 2 };
          });
          level.enemies = (d.enemies || []).map(function(e){
            var base = { type:e.type, x:e.x, y:e.y, w:e.w, h:e.h, path: e.path || [], pathSpeed: e.pathSpeed || 2, hitboxes: e.hitboxes || [], hp: e.hp || 1, damage: e.damage || 1, resetOnDeath: e.resetOnDeath !== false };
            if(e.type === 'walker'){ base.minX=e.minX; base.maxX=e.maxX; base.vx=e.vx || 1.5; }
            else { base.baseY = e.baseY !== undefined ? e.baseY : e.y; base.phase = e.phase || 0; base.cd = e.cd || 90; }
            return base;
          });
          level.checkpoints = (d.checkpoints || []).map(function(c){ return { type: c.type || 'checkpoint', x:c.x, y:c.y, w:c.w, h:c.h, spawnX: c.spawnX !== undefined ? c.spawnX : Math.round(c.x + c.w/2 - 7), spawnY: c.spawnY !== undefined ? c.spawnY : Math.round(c.y + c.h - 22) }; });
          level.healthpacks = (d.healthpacks || []).map(function(h){
            return { x:h.x, y:h.y, w:h.w || 22, h:h.h || 22, heal: h.heal || 1, path: h.path || [], pathSpeed: h.pathSpeed || 2 };
          });
          level.weapons = (d.weapons || []).map(function(w){
            return { x:w.x, y:w.y, w:w.w || 28, h:w.h || 14, type: w.type || 'rifle', damage: w.damage || 1, path: w.path || [], pathSpeed: w.pathSpeed || 2 };
          });
          level.playerWeapons = (Array.isArray(d.playerWeapons) ? d.playerWeapons : [{ type:'rifle', damage:1 }])
            .slice(0, E.MAX_WEAPON_SLOTS)
            .map(function(w){ return { type: w.type || 'rifle', damage: w.damage || 1 }; });
          level.goal = d.goal && d.goal.w ? d.goal : null; ed.selected = null; ed.multiSelected = []; ed.selectedHitboxIdx = undefined; ed.boxSelect = null; E.refreshAll(); E.fitView(); E.render();
        }catch(err){ alert('加载失败：' + err.message); }
      }; reader.readAsText(f);
    }); inp.click();
  };
})(window.EDITOR);
