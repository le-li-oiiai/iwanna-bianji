/*
 * draw.js —— 编辑器的画布渲染
 *
 * 网格、世界边框、各类实体、出生点、选中框、拖拽预览，以及「有变化才重绘」的主循环。
 */
(function (E) {
  'use strict';

  var ctx = E.ctx;
  var level = E.level, ed = E.ed;

  E.render = function(){
    ctx.setTransform(E.dpr, 0, 0, E.dpr, 0, 0); ctx.clearRect(0, 0, E.viewW, E.viewH); ctx.fillStyle = '#08080f'; ctx.fillRect(0, 0, E.viewW, E.viewH); E.drawGrid();
    var wb = E.w2r({ x:0, y:0, w:level.worldW, h:level.worldH }); ctx.strokeStyle = 'rgba(120,150,255,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(wb.x + 0.5, wb.y + 0.5, wb.w, wb.h);
    var i; for(i=0;i<level.solids.length;i++) E.drawEntity('solid', level.solids[i]); for(i=0;i<level.movers.length;i++) E.drawEntity('mover', level.movers[i]); for(i=0;i<level.spikes.length;i++) E.drawEntity('spike', level.spikes[i]); for(i=0;i<level.adv_spikes.length;i++) E.drawEntity('adv_spike', level.adv_spikes[i]); for(i=0;i<level.enemies.length;i++) E.drawEntity(level.enemies[i].type, level.enemies[i]); for(i=0;i<level.checkpoints.length;i++) E.drawEntity(level.checkpoints[i].type || 'checkpoint', level.checkpoints[i]); for(i=0;i<level.healthpacks.length;i++) E.drawEntity('healthpack', level.healthpacks[i]); for(i=0;i<level.weapons.length;i++) E.drawEntity('weapon', level.weapons[i]); if(level.goal) E.drawEntity('goal', level.goal);
    E.drawSpawnMarker();
    if(ed.multiSelected.length > 0){ for(i=0; i<ed.multiSelected.length; i++) E.drawSelection(ed.multiSelected[i].e, '#fde047'); }
    else if(ed.selected) { E.drawSelection(ed.selected.e); }
    if(ed.boxSelect){ var bs = E.w2r(ed.boxSelect); ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = ed.boxSelect.type === 'intersect' ? '#5eead4' : '#38bdf8'; ctx.lineWidth = 1.5; ctx.strokeRect(bs.x, bs.y, bs.w, bs.h); ctx.fillStyle = ed.boxSelect.type === 'intersect' ? 'rgba(94,234,212,0.1)' : 'rgba(56,189,248,0.1)'; ctx.fillRect(bs.x, bs.y, bs.w, bs.h); ctx.restore(); }
    if(ed.drag && ed.drag.mode === 'draw'){ var r = E.w2r(ed.drag.preview); ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 1.5; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h); ctx.fillStyle = 'rgba(94,234,212,0.12)'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore(); }
  };
  E.drawGrid = function(){
    var step = ed.gridSize; while(step * ed.zoom < 9) step *= 2;
    var x0 = Math.floor(ed.cam.x / step) * step, y0 = Math.floor(ed.cam.y / step) * step, x1 = ed.cam.x + E.viewW / ed.zoom, y1 = ed.cam.y + E.viewH / ed.zoom, x, y;
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(70,90,150,0.09)'; ctx.beginPath();
    for(x = x0; x <= x1; x += step){ var sx = Math.round((x - ed.cam.x) * ed.zoom) + 0.5; ctx.moveTo(sx, 0); ctx.lineTo(sx, E.viewH); }
    for(y = y0; y <= y1; y += step){ var sy = Math.round((y - ed.cam.y) * ed.zoom) + 0.5; ctx.moveTo(0, sy); ctx.lineTo(E.viewW, sy); }
    ctx.stroke();
    var major = step * 5; ctx.strokeStyle = 'rgba(70,90,150,0.16)'; ctx.beginPath();
    for(x = Math.floor(ed.cam.x / major) * major; x <= x1; x += major){ var mx2 = Math.round((x - ed.cam.x) * ed.zoom) + 0.5; ctx.moveTo(mx2, 0); ctx.lineTo(mx2, E.viewH); }
    for(y = Math.floor(ed.cam.y / major) * major; y <= y1; y += major){ var my2 = Math.round((y - ed.cam.y) * ed.zoom) + 0.5; ctx.moveTo(0, my2); ctx.lineTo(E.viewW, my2); }
    ctx.stroke();
  };
  E.drawEntity = function(type, e){
    var animT = Date.now() / 16;
    var drawE = e;
    var morphP = 0;
    if (e.morphDemo && e.morph && (e.morph === 'stretch' || e.morph === 'pulse')) {
        drawE = Object.assign({}, e);
        var ow = e.ow || e.w, oh = e.oh || e.h;
        if (e.morph === 'pulse') { var scale = 1 + Math.sin(animT * 0.1) * 0.2; drawE.w = ow * scale; drawE.h = oh * scale; }
        else if (e.morph === 'stretch') {
          morphP = (Math.sin(animT * 0.05) + 1) / 2;
          drawE.w = ow + ((e.targetW || ow) - ow) * morphP;
          drawE.h = oh + ((e.targetH || oh) - oh) * morphP;
        }
        drawE.x = e.x + e.w / 2 + (e.targetOffX || 0) * morphP - drawE.w / 2;
        drawE.y = e.y + e.h / 2 + (e.targetOffY || 0) * morphP - drawE.h / 2;
    }
    var r = E.w2r(drawE); if(r.x + r.w < -60 || r.x > E.viewW + 60 || r.y + r.h < -60 || r.y > E.viewH + 60) return; var i, x, y, n, tw;
    if(type === 'solid'){ ctx.fillStyle = '#2c2c4a'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = '#55558a'; ctx.fillRect(r.x, r.y, r.w, Math.min(3, r.h)); ctx.strokeStyle = '#3e3e66'; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, Math.max(0, r.w - 1), Math.max(0, r.h - 1)); }
    else if(type === 'mover'){
      if (!e.path || e.path.length < 2) {
        var range = E.w2r({ x: e.x - e.ax, y: e.y - e.ay, w: e.w + e.ax*2, h: e.h + e.ay*2 }); ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(167,139,250,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(range.x + 0.5, range.y + 0.5, range.w, range.h); ctx.restore();
      }
      ctx.fillStyle = '#4a3b7a'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = '#a78bfa'; ctx.fillRect(r.x, r.y, r.w, Math.min(3, r.h));
      var ac = E.w2s(e.x, e.y); ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ac.x - 4, ac.y); ctx.lineTo(ac.x + 4, ac.y); ctx.moveTo(ac.x, ac.y - 4); ctx.lineTo(ac.x, ac.y + 4); ctx.stroke();
    }
    else if(type === 'spike'){ n = Math.max(1, Math.round(e.w / 14)); tw = r.w / n; ctx.fillStyle = 'rgba(233,69,96,0.85)'; for(i = 0; i < n; i++){ ctx.beginPath(); ctx.moveTo(r.x + i*tw, r.y + r.h); ctx.lineTo(r.x + i*tw + tw/2, r.y); ctx.lineTo(r.x + i*tw + tw, r.y + r.h); ctx.closePath(); ctx.fill(); } }
    else if(type === 'adv_spike'){
      var cx = r.x + r.w/2, cy = r.y + r.h/2, rad = Math.max(r.w, r.h) / 2;
      ctx.fillStyle = 'rgba(255,140,0,0.6)';
      if(e.shape === 'triangle'){ n = Math.max(1, Math.round(e.w / 14)); tw = r.w / n; for(i = 0; i < n; i++){ ctx.beginPath(); ctx.moveTo(r.x + i*tw, r.y + r.h); ctx.lineTo(r.x + i*tw + tw/2, r.y); ctx.lineTo(r.x + i*tw + tw, r.y + r.h); ctx.closePath(); ctx.fill(); } }
      else if(e.shape === 'square'){ ctx.fillRect(r.x, r.y, r.w, r.h); }
      else if(e.shape === 'circle'){ ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI*2); ctx.fill(); }
      ctx.strokeStyle = '#ff8c00'; ctx.lineWidth = 1; ctx.strokeRect(r.x+0.5, r.y+0.5, r.w-1, r.h-1);
      if ((ed.selected && ed.selected.e === e) || ed.multiSelected.some(function(it){ return it.e === e; })) {
        var sp = E.w2s(e.x, e.y); ctx.strokeStyle = '#fde047';
        ctx.beginPath(); ctx.arc(sp.x, sp.y, 8, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sp.x-12, sp.y); ctx.lineTo(sp.x+12, sp.y); ctx.moveTo(sp.x, sp.y-12); ctx.lineTo(sp.x, sp.y+12); ctx.stroke();
      }
    }
    else if(type === 'walker'){
      if (!e.path || e.path.length < 2) {
        var pr = E.w2r({ x: e.minX, y: e.y + e.h - 4, w: Math.max(1, e.maxX - e.minX), h: 1 }); ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(245,158,11,0.35)'; ctx.beginPath(); ctx.moveTo(pr.x, pr.y + 0.5); ctx.lineTo(pr.x + pr.w, pr.y + 0.5); ctx.stroke(); ctx.restore();
      }
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = '#b45309'; ctx.fillRect(r.x, r.y + r.h - Math.max(2, r.h*0.18), r.w, Math.max(2, r.h*0.18)); var es = Math.max(2, r.w * 0.22); ctx.fillStyle = '#1a0a00'; ctx.fillRect(r.x + r.w*0.2, r.y + r.h*0.22, es, es); ctx.fillRect(r.x + r.w*0.6, r.y + r.h*0.22, es, es);
    }
    else if(type === 'shooter'){
      var scx = r.x + r.w/2, scy = r.y + r.h/2, srad = Math.max(r.w, r.h) / 2;
      if (!e.path || e.path.length < 2) {
        var vr = E.w2r({ x: e.x + e.w/2, y: e.baseY - 14, w: 1, h: e.h + 28 }); ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(233,69,96,0.3)'; ctx.beginPath(); ctx.moveTo(vr.x + 0.5, vr.y); ctx.lineTo(vr.x + 0.5, vr.y + vr.h); ctx.stroke(); ctx.restore();
      }
      ctx.fillStyle = '#e94560'; ctx.beginPath(); ctx.arc(scx, scy, srad, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#1a0a12'; ctx.beginPath(); ctx.arc(scx, scy, srad*0.5, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(scx, scy, srad*0.22, 0, Math.PI*2); ctx.fill();
    }
    else if(type === 'checkpoint' || type === 'trigger'){
      if (type === 'trigger') {
        ctx.fillStyle = 'rgba(56,189,248,0.15)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(r.x + r.w/2 - 1, r.y, 2, r.h);
        ctx.beginPath(); ctx.moveTo(r.x + r.w/2 - 4, r.y + r.h/2 - 5); ctx.lineTo(r.x + r.w/2 + 4, r.y + r.h/2); ctx.lineTo(r.x + r.w/2 - 4, r.y + r.h/2 + 5); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        ctx.fillStyle = '#7a86a8'; ctx.fillRect(r.x + r.w/2 - 1, r.y, 2, r.h);
        ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.moveTo(r.x + r.w/2 + 1, r.y + r.h*0.08); ctx.lineTo(r.x + r.w/2 + r.w*0.9, r.y + r.h*0.25); ctx.lineTo(r.x + r.w/2 + 1, r.y + r.h*0.45); ctx.closePath(); ctx.fill();
      }
    }
    else if(type === 'healthpack'){
      var half = Math.min(r.w, r.h) / 2, hcx = r.x + r.w/2, hcy = r.y + r.h/2;
      ctx.fillStyle = 'rgba(74,222,128,0.18)';
      ctx.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
      ctx.fillStyle = '#065f46'; ctx.fillRect(hcx - half, hcy - half, half*2, half*2);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(hcx - half*0.32, hcy - half*0.9, half*0.64, half*1.8);
      ctx.fillRect(hcx - half*0.9, hcy - half*0.32, half*1.8, half*0.64);
      ctx.fillStyle = 'rgba(226,255,238,0.95)';
      ctx.fillRect(hcx - half*0.14, hcy - half*0.72, half*0.28, half*1.44);
      ctx.fillRect(hcx - half*0.72, hcy - half*0.14, half*1.44, half*0.28);
      if (e.heal) {
        ctx.fillStyle = 'rgba(74,222,128,0.9)';
        ctx.font = Math.max(8, Math.round((r.h * 0.42))) + 'px "Courier New",monospace';
        ctx.textAlign = 'left';
        ctx.fillText('+' + e.heal, r.x + r.w + 4, r.y + r.h * 0.75);
      }
    }
    else if(type === 'weapon'){
      var wc = E.WEAPON_COLOR[e.type] || '#38bdf8';
      var wx = r.x + r.w/2, wy = r.y + r.h/2;
      ctx.save(); ctx.translate(wx, wy);
      ctx.scale(Math.max(0.6, r.w / 28), Math.max(0.6, r.h / 14));
      if (e.type === 'shotgun') {
        ctx.fillStyle = '#7c2d12'; ctx.fillRect(-15, 0, 14, 6);
        ctx.fillStyle = wc; ctx.fillRect(-2, -5, 16, 4); ctx.fillRect(-2, 0, 16, 4);
      } else if (e.type === 'sniper') {
        ctx.fillStyle = '#4c1d95'; ctx.fillRect(-16, -2, 25, 5);
        ctx.fillStyle = wc; ctx.fillRect(7, -1.5, 13, 3);
        ctx.fillStyle = '#c4b5fd'; ctx.fillRect(-7, -8, 11, 5);
        ctx.fillStyle = '#312e81'; ctx.fillRect(-8, 3, 6, 5);
      } else {
        ctx.fillStyle = '#475569'; ctx.fillRect(-13, -3, 21, 6);
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(6, -2, 9, 4);
        ctx.fillStyle = '#334155'; ctx.fillRect(-9, 3, 5, 6);
      }
      ctx.restore();
      ctx.fillStyle = wc;
      ctx.font = Math.max(8, Math.round(r.h * 0.5)) + 'px "Courier New",monospace';
      ctx.textAlign = 'left';
      ctx.fillText((E.WEAPON_SHORT[e.type] || '') + '×' + (e.damage || 1), r.x + r.w + 4, r.y + r.h * 0.8);
    }
    else if(type === 'goal'){ ctx.fillStyle = '#fde047'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = '#0b0b18'; ctx.fillRect(r.x + r.w*0.16, r.y + r.h*0.06, r.w*0.68, r.h*0.92); ctx.fillStyle = 'rgba(253,224,71,0.65)'; for(i = 0; i < 4; i++){ ctx.fillRect(r.x + r.w*0.25, r.y + r.h*(0.16 + i*0.2), r.w*0.5, Math.max(1, r.h*0.035)); } }

    if (e.path && e.path.length >= 2) {
      ctx.save(); ctx.beginPath(); var n0 = E.w2s(e.path[0].x, e.path[0].y); ctx.moveTo(n0.x, n0.y);
      for (var k = 1; k < e.path.length; k++) { var nk = E.w2s(e.path[k].x, e.path[k].y); ctx.lineTo(nk.x, nk.y); }
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      for (var kk = 0; kk < e.path.length; kk++) { var nkk = E.w2s(e.path[kk].x, e.path[kk].y); ctx.beginPath(); ctx.arc(nkk.x, nkk.y, 6, 0, Math.PI*2); if (kk === 0) ctx.fillStyle = '#ff3333'; else if (kk === e.path.length - 1) ctx.fillStyle = '#cc33ff'; else ctx.fillStyle = '#33ff33'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
      var ec = E.w2s(e.x + e.w/2, e.y + e.h/2);
      ctx.beginPath(); ctx.arc(ec.x, ec.y, 5, 0, Math.PI*2); ctx.fillStyle = '#fde047'; ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ec.x - 9, ec.y); ctx.lineTo(ec.x + 9, ec.y); ctx.moveTo(ec.x, ec.y - 9); ctx.lineTo(ec.x, ec.y + 9); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    if (e.morph === 'stretch') {
      var isSel = (ed.selected && ed.selected.e === e) || ed.multiSelected.some(function(it){ return it.e === e; });
      if (isSel) {
        var tw2 = e.targetW || e.w, th2 = e.targetH || e.h;
        var tcx = e.x + e.w/2 + (e.targetOffX || 0);
        var tcy = e.y + e.h/2 + (e.targetOffY || 0);
        var tx = tcx - tw2/2, ty = tcy - th2/2;
        var tr = E.w2r({x:tx, y:ty, w:tw2, h:th2});
        ctx.strokeStyle = '#33ff33'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.strokeRect(tr.x, tr.y, tr.w, tr.h); ctx.setLineDash([]);
        var tpts = [[tr.x, tr.y], [tr.x + tr.w, tr.y], [tr.x, tr.y + tr.h], [tr.x + tr.w, tr.y + tr.h]]; ctx.fillStyle = '#33ff33';
        for(var tj=0; tj<4; tj++){ ctx.fillRect(tpts[tj][0] - 4, tpts[tj][1] - 4, 8, 8); }
        var tc = E.w2s(tcx, tcy);
        ctx.beginPath(); ctx.arc(tc.x, tc.y, 4, 0, Math.PI*2); ctx.fillStyle = '#33ff33'; ctx.fill();
        var ec2 = E.w2s(e.x + e.w/2, e.y + e.h/2);
        ctx.beginPath(); ctx.setLineDash([3, 3]); ctx.moveTo(ec2.x, ec2.y); ctx.lineTo(tc.x, tc.y); ctx.strokeStyle = 'rgba(51,255,51,0.5)'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (e.hitboxes && e.hitboxes.length > 0) {
      var isSel2 = (ed.selected && ed.selected.e === e) || ed.multiSelected.some(function(it){ return it.e === e; });
      if (isSel2) {
        for(var hi=0; hi<e.hitboxes.length; hi++){
          var h = e.hitboxes[hi], rect = E.getHitboxRect(e, h, animT), hr = E.w2r(rect);
          ctx.strokeStyle = (ed.selectedHitboxIdx === hi && ed.selected && ed.selected.e === e) ? '#ff00ff' : '#00ffff';
          ctx.setLineDash(h.isRelative ? [] : [4, 4]); ctx.lineWidth = 2; ctx.strokeRect(hr.x, hr.y, hr.w, hr.h);
          ctx.fillStyle = (ed.selectedHitboxIdx === hi && ed.selected && ed.selected.e === e) ? 'rgba(255,0,255,0.1)' : 'rgba(0,255,255,0.05)'; ctx.fillRect(hr.x, hr.y, hr.w, hr.h);
          if (ed.selectedHitboxIdx === hi && ed.selected && ed.selected.e === e) {
            var hpts = [[hr.x, hr.y], [hr.x + hr.w, hr.y], [hr.x, hr.y + hr.h], [hr.x + hr.w, hr.y + hr.h]]; ctx.fillStyle = '#ff00ff';
            for(var hj=0; hj<hpts.length; hj++){ ctx.fillRect(hpts[hj][0] - 4, hpts[hj][1] - 4, 8, 8); }
          }
        }
        ctx.setLineDash([]);
      }
    }
  };
  E.drawSpawnMarker = function(){
    var s = E.w2s(level.spawn.x + 7, level.spawn.y + 11); if(s.x < -40 || s.x > E.viewW + 40 || s.y < -40 || s.y > E.viewH + 40) return; ctx.strokeStyle = 'rgba(94,234,212,0.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s.x - 15, s.y); ctx.lineTo(s.x - 6, s.y); ctx.moveTo(s.x + 6, s.y); ctx.lineTo(s.x + 15, s.y); ctx.moveTo(s.x, s.y - 15); ctx.lineTo(s.x, s.y - 6); ctx.moveTo(s.x, s.y + 6); ctx.lineTo(s.x, s.y + 15); ctx.stroke(); ctx.fillStyle = 'rgba(94,234,212,0.9)'; ctx.font = '10px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.fillText('出生点', s.x, s.y + 28);
  };
  E.drawSelection = function(e, color){
    var r = E.w2r(e); ctx.strokeStyle = color || '#5eead4'; ctx.lineWidth = 1.5; ctx.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1); var hs = 4; var pts = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]; ctx.fillStyle = color || '#5eead4'; ctx.strokeStyle = '#062a26'; ctx.lineWidth = 1;
    for(var i = 0; i < pts.length; i++){ ctx.fillRect(pts[i][0] - hs, pts[i][1] - hs, hs*2, hs*2); ctx.strokeRect(pts[i][0] - hs + 0.5, pts[i][1] - hs + 0.5, hs*2 - 1, hs*2 - 1); }
  };
  var hasMorphEntities = false;
  E.checkMorphs = function(){
    hasMorphEntities =
      level.solids.some(function(e){ return e.morphDemo && (e.morph === 'stretch' || e.morph === 'pulse'); }) ||
      level.adv_spikes.some(function(e){ return e.morphDemo && (e.morph === 'stretch' || e.morph === 'pulse'); }) ||
      level.movers.some(function(e){ return e.morphDemo && (e.morph === 'stretch' || e.morph === 'pulse'); });
  };
  E.loop = function(){ requestAnimationFrame(E.loop); if (ed.dirty || hasMorphEntities || ed.drag) { E.checkMorphs(); E.render(); ed.dirty = false; } };
})(window.EDITOR);
