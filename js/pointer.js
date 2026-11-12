/*
 * pointer.js —— 画布上的鼠标 / 键盘操作
 *
 * 框选、拖动、缩放、拖拽手柄、绘制新对象、快捷键。
 */
(function (E) {
  'use strict';

  var cvs = E.cvs;
  var level = E.level, ed = E.ed;

  E.evtPos = function(ev){ var rect = cvs.getBoundingClientRect(); return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }; };

  cvs.addEventListener('mousedown', function(ev){
    var sp = E.evtPos(ev), wp = E.s2w(sp.x, sp.y); ed.mouseScreen = sp; ed.mouseWorld = wp;
    if(ev.button === 1 || (ev.button === 0 && (ed.spaceDown || ed.shiftDown))){ ev.preventDefault(); ed.panning = true; cvs.style.cursor = 'grabbing'; ed.panStart = { sx: sp.x, sy: sp.y, cx: ed.cam.x, cy: ed.cam.y }; return; }
    if(ev.button !== 0 && ev.button !== 2) return;
    var tool = ed.tool;
    if(tool === 'select'){
      var animT = Date.now() / 16;
      if (ed.selected && ed.selected.e.hitboxes && ed.selectedHitboxIdx !== undefined) {
        var hbx = ed.selected.e.hitboxes[ed.selectedHitboxIdx], rect = E.getHitboxRect(ed.selected.e, hbx, animT), hr = E.w2r(rect), hs = 8;
        var pts = { nw: [hr.x, hr.y], ne: [hr.x + hr.w, hr.y], sw: [hr.x, hr.y + hr.h], se: [hr.x + hr.w, hr.y + hr.h] };
        for(var k in pts) { if(Math.abs(sp.x - pts[k][0]) <= hs && Math.abs(sp.y - pts[k][1]) <= hs) { E.pushHistory(); ed.drag = { mode: 'resizeHitbox', handle: k, startWorld: { x: wp.x, y: wp.y }, orig: { x: hbx.x, y: hbx.y, w: hbx.w, h: hbx.h }, target: hbx, isRel: hbx.isRelative }; return; } }
      }
      if(ed.selected){
        var h = E.hitHandle(sp.x, sp.y, ed.selected.e);
        if(h){ E.pushHistory(); ed.drag = { mode: 'resize', handle: h, startWorld: { x: wp.x, y: wp.y }, orig: { x: ed.selected.e.x, y: ed.selected.e.y, w: ed.selected.e.w, h: ed.selected.e.h }, target: ed.selected }; return; }
        var th = E.hitTargetHandle(sp.x, sp.y, ed.selected.e);
        if(th){
          E.pushHistory();
          if (th === 'move') {
            ed.drag = { mode: 'moveTarget', startWorld: { x: wp.x, y: wp.y }, orig: { offX: ed.selected.e.targetOffX || 0, offY: ed.selected.e.targetOffY || 0 }, target: ed.selected };
          } else {
            ed.drag = { mode: 'resizeTarget', handle: th, startWorld: { x: wp.x, y: wp.y }, orig: { w: ed.selected.e.targetW || ed.selected.e.w, h: ed.selected.e.targetH || ed.selected.e.h, offX: ed.selected.e.targetOffX || 0, offY: ed.selected.e.targetOffY || 0 }, target: ed.selected };
          }
          return;
        }
      }
      if (ed.selected && ed.selected.e.path) {
        for (var i = 0; i < ed.selected.e.path.length; i++) { var nd = ed.selected.e.path[i], nds = E.w2s(nd.x, nd.y); if (Math.hypot(sp.x - nds.x, sp.y - nds.y) < 12) { E.pushHistory(); ed.drag = { mode: 'movePathNode', targetNode: nd, startWorld: { x: wp.x, y: wp.y }, orig: { x: nd.x, y: nd.y } }; return; } }
      }
      if (ed.selected && ed.selected.type === 'adv_spike') { var sp2 = E.w2s(ed.selected.e.x, ed.selected.e.y); if (Math.hypot(sp.x - sp2.x, sp.y - sp2.y) < 12) { E.pushHistory(); ed.drag = { mode: 'moveOrigin', startWorld: { x: wp.x, y: wp.y }, target: ed.selected }; return; } }
      if (ed.selected && ed.selected.e.hitboxes) {
        for(var i2=0; i2<ed.selected.e.hitboxes.length; i2++){
          var hbx2 = ed.selected.e.hitboxes[i2], rect2 = E.getHitboxRect(ed.selected.e, hbx2, animT);
          if (wp.x >= rect2.x && wp.x <= rect2.x + rect2.w && wp.y >= rect2.y && wp.y <= rect2.y + rect2.h) { ed.selectedHitboxIdx = i2; E.pushHistory(); ed.drag = { mode: 'moveHitbox', startWorld: { x: wp.x, y: wp.y }, orig: { x: hbx2.x, y: hbx2.y }, target: hbx2 }; E.refreshInspector(); ed.dirty = true; return; }
        }
      }
      var hit = E.hitTest(wp.x, wp.y);
      if(hit){ ed.selected = hit; ed.multiSelected = []; ed.selectedHitboxIdx = undefined; ed.drag = { mode: 'move', startWorld: { x: wp.x, y: wp.y }, orig: { x: hit.e.x, y: hit.e.y }, target: hit, pushed: false }; E.refreshInspector(); E.refreshObjList(); }
      else {
        if (ev.button === 0) { ed.boxSelect = { x: wp.x, y: wp.y, w: 0, h: 0, type: 'intersect' }; ed.selected = null; ed.multiSelected = []; ed.selectedHitboxIdx = undefined; }
        else if (ev.button === 2) { ed.boxSelect = { x: wp.x, y: wp.y, w: 0, h: 0, type: 'contain' }; ed.selected = null; ed.multiSelected = []; ed.selectedHitboxIdx = undefined; }
        E.refreshInspector(); E.refreshObjList();
      }
    } else if(tool === 'erase'){
      var eh = E.hitTest(wp.x, wp.y);
      if(eh){ E.pushHistory(); var arr = eh.arr; if(eh.type === 'goal') level.goal = null; else { var idx = arr.indexOf(eh.e); if(idx >= 0) arr.splice(idx, 1); } if(ed.selected && ed.selected.e === eh.e) ed.selected = null; E.refreshAll(); }
    } else if (ev.button === 0) {
      var x0 = E.snapVal(wp.x), y0 = E.snapVal(wp.y); ed.drag = { mode: 'draw', type: tool, startWorld: { x: x0, y: y0 }, preview: { x: x0, y: y0, w: 0, h: 0 } };
    }
    ed.dirty = true;
  });

  cvs.addEventListener('mousemove', function(ev){
    var sp = E.evtPos(ev), wp = E.s2w(sp.x, sp.y); ed.mouseScreen = sp; ed.mouseWorld = wp;
    if(ed.panning){ ed.cam.x = ed.panStart.cx - (sp.x - ed.panStart.sx) / ed.zoom; ed.cam.y = ed.panStart.cy - (sp.y - ed.panStart.sy) / ed.zoom; ed.dirty = true; return; }
    if (ed.boxSelect) { ed.boxSelect.w = wp.x - ed.boxSelect.x; ed.boxSelect.h = wp.y - ed.boxSelect.y; ed.dirty = true; return; }
    if(!ed.drag) {
      if (ed.tool === 'select') {
        var animT = Date.now() / 16;
        if (ed.selected) {
          if (ed.selected.e.path) { for (var i = 0; i < ed.selected.e.path.length; i++) { var nd = ed.selected.e.path[i], nds = E.w2s(nd.x, nd.y); if (Math.hypot(sp.x - nds.x, sp.y - nds.y) < 12) { cvs.style.cursor = 'grab'; return; } } }
          if (ed.selected.e.hitboxes && ed.selectedHitboxIdx !== undefined) {
            var hbx = ed.selected.e.hitboxes[ed.selectedHitboxIdx], rect = E.getHitboxRect(ed.selected.e, hbx, animT), hr = E.w2r(rect), hs = 8;
            var pts = { nw: [hr.x, hr.y], ne: [hr.x + hr.w, hr.y], sw: [hr.x, hr.y + hr.h], se: [hr.x + hr.w, hr.y + hr.h] };
            for(var k in pts) { if(Math.abs(sp.x - pts[k][0]) <= hs && Math.abs(sp.y - pts[k][1]) <= hs) { cvs.style.cursor = (k === 'nw' || k === 'se') ? 'nwse-resize' : 'nesw-resize'; return; } }
          }
          var h = E.hitHandle(sp.x, sp.y, ed.selected.e);
          if (h === 'nw' || h === 'se') { cvs.style.cursor = 'nwse-resize'; return; }
          if (h === 'ne' || h === 'sw') { cvs.style.cursor = 'nesw-resize'; return; }
          var th = E.hitTargetHandle(sp.x, sp.y, ed.selected.e);
          if (th === 'move') { cvs.style.cursor = 'move'; return; }
          if (th === 'nw' || th === 'se') { cvs.style.cursor = 'nwse-resize'; return; }
          if (th === 'ne' || th === 'sw') { cvs.style.cursor = 'nesw-resize'; return; }
          if (ed.selected.type === 'adv_spike') { var sp2 = E.w2s(ed.selected.e.x, ed.selected.e.y); if (Math.hypot(sp.x - sp2.x, sp.y - sp2.y) < 12) { cvs.style.cursor = 'move'; return; } }
        }
        if (E.hitTest(wp.x, wp.y)) { cvs.style.cursor = 'move'; return; }
        cvs.style.cursor = 'default';
      } else { cvs.style.cursor = ed.tool === 'erase' ? 'not-allowed' : 'crosshair'; }
      return;
    }
    if(ed.drag.mode === 'movePathNode'){ cvs.style.cursor = 'grabbing'; var dx = wp.x - ed.drag.startWorld.x, dy = wp.y - ed.drag.startWorld.y; ed.drag.targetNode.x = E.snapVal(ed.drag.orig.x + dx); ed.drag.targetNode.y = E.snapVal(ed.drag.orig.y + dy); ed.dirty = true; }
    else if(ed.drag.mode === 'move'){
      if (!ed.drag.pushed) { E.pushHistory(); ed.drag.pushed = true; }
      var dx = wp.x - ed.drag.startWorld.x, dy = wp.y - ed.drag.startWorld.y, t = ed.drag.target.e;
      t.x = E.snapVal(ed.drag.orig.x + dx); t.y = E.snapVal(ed.drag.orig.y + dy);
      // 移动实体时同步 morph/hitbox 相对锚点，避免编辑器预览与导出不一致
      if (t.ox !== undefined) t.ox = t.x;
      if (t.oy !== undefined) t.oy = t.y;
      ed.dirty = true;
    }
    else if(ed.drag.mode === 'moveOrigin'){ var dx = wp.x - ed.drag.startWorld.x, dy = wp.y - ed.drag.startWorld.y; var t = ed.drag.target.e; var nx = E.snapVal(t.x + dx), ny = E.snapVal(t.y + dy); t.ox += nx - t.x; t.oy += ny - t.y; t.x = nx; t.y = ny; ed.drag.startWorld = { x: wp.x, y: wp.y }; ed.dirty = true; E.refreshInspector(); }
    else if(ed.drag.mode === 'moveHitbox'){
      var animT = Date.now() / 16; var e = ed.selected.e;
      var ow = e.ow || e.w, oh = e.oh || e.h; var cw = ow, ch = oh;
      if (e.morphDemo !== false && e.morph === 'pulse') { var scale = 1 + Math.sin(animT * 0.1) * 0.2; cw = ow * scale; ch = oh * scale; }
      else if (e.morphDemo !== false && e.morph === 'stretch') { var p = (Math.sin(animT * 0.05) + 1) / 2; cw = ow + ((e.targetW || ow) - ow) * p; ch = oh + ((e.targetH || oh) - oh) * p; }
      var sx = cw / ow, sy = ch / oh;
      var rel = !!ed.drag.target.isRelative;
      var dx = (wp.x - ed.drag.startWorld.x) / (rel ? sx : 1);
      var dy = (wp.y - ed.drag.startWorld.y) / (rel ? sy : 1);
      ed.drag.target.x = E.snapVal(ed.drag.orig.x + dx); ed.drag.target.y = E.snapVal(ed.drag.orig.y + dy); ed.dirty = true; E.refreshInspector();
    }
    else if(ed.drag.mode === 'resizeHitbox'){
      var animT = Date.now() / 16; var e = ed.selected.e;
      var ow = e.ow || e.w, oh = e.oh || e.h; var cw = ow, ch = oh;
      if (e.morphDemo !== false && e.morph === 'pulse') { var scale = 1 + Math.sin(animT * 0.1) * 0.2; cw = ow * scale; ch = oh * scale; }
      else if (e.morphDemo !== false && e.morph === 'stretch') { var p = (Math.sin(animT * 0.05) + 1) / 2; cw = ow + ((e.targetW || ow) - ow) * p; ch = oh + ((e.targetH || oh) - oh) * p; }
      var sx = cw / ow, sy = ch / oh;
      var rel = !!ed.drag.isRel;
      var wdx = (wp.x - ed.drag.startWorld.x) / (rel ? sx : 1);
      var wdy = (wp.y - ed.drag.startWorld.y) / (rel ? sy : 1);
      var o = ed.drag.orig, hd = ed.drag.handle, nx = o.x, ny = o.y, nw = o.w, nh = o.h;
      if(hd.indexOf('w') >= 0){ nx = o.x + wdx; nw = o.w - wdx; } if(hd.indexOf('e') >= 0){ nw = o.w + wdx; }
      if(hd.indexOf('n') >= 0){ ny = o.y + wdy; nh = o.h - wdy; } if(hd.indexOf('s') >= 0){ nh = o.h + wdy; }
      if(nw < 4){ nw = 4; if(hd.indexOf('w') >= 0) nx = o.x + o.w - 4; } if(nh < 4){ nh = 4; if(hd.indexOf('n') >= 0) ny = o.y + o.h - 4; }
      if(ed.snap){ nx = E.snapVal(nx); ny = E.snapVal(ny); nw = E.snapVal(nw); nh = E.snapVal(nh); if(nw < 4) nw = 4; if(nh < 4) nh = 4; }
      var te = ed.drag.target; te.x = nx; te.y = ny; te.w = nw; te.h = nh; ed.dirty = true; E.refreshInspector();
    }
    else if(ed.drag.mode === 'resize'){
      var wdx = wp.x - ed.drag.startWorld.x, wdy = wp.y - ed.drag.startWorld.y, o = ed.drag.orig, hd = ed.drag.handle, nx = o.x, ny = o.y, nw = o.w, nh = o.h;
      if(hd.indexOf('w') >= 0){ nx = o.x + wdx; nw = o.w - wdx; } if(hd.indexOf('e') >= 0){ nw = o.w + wdx; } if(hd.indexOf('n') >= 0){ ny = o.y + wdy; nh = o.h - wdy; } if(hd.indexOf('s') >= 0){ nh = o.h + wdy; }
      if(nw < 8){ nw = 8; if(hd.indexOf('w') >= 0) nx = o.x + o.w - 8; } if(nh < 8){ nh = 8; if(hd.indexOf('n') >= 0) ny = o.y + o.h - 8; }
      if(ed.snap){ nx = E.snapVal(nx); ny = E.snapVal(ny); nw = E.snapVal(nw); nh = E.snapVal(nh); if(nw < 8) nw = 8; if(nh < 8) nh = 8; }
      var te = ed.drag.target.e; te.x = nx; te.y = ny; te.w = nw; te.h = nh; ed.dirty = true; E.refreshInspector();
    }
    else if(ed.drag.mode === 'moveTarget'){
      var dx = wp.x - ed.drag.startWorld.x, dy = wp.y - ed.drag.startWorld.y;
      var te = ed.drag.target.e;
      te.targetOffX = ed.snap ? E.snapVal(ed.drag.orig.offX + dx) : Math.round(ed.drag.orig.offX + dx);
      te.targetOffY = ed.snap ? E.snapVal(ed.drag.orig.offY + dy) : Math.round(ed.drag.orig.offY + dy);
      ed.dirty = true; E.refreshInspector();
    }
    else if(ed.drag.mode === 'resizeTarget'){
      var wdx = wp.x - ed.drag.startWorld.x, wdy = wp.y - ed.drag.startWorld.y;
      var o = ed.drag.orig, hd = ed.drag.handle;
      var nx = -o.w/2 + o.offX, ny = -o.h/2 + o.offY, nw = o.w, nh = o.h;
      if(hd.indexOf('w') >= 0){ nx += wdx; nw -= wdx; }
      if(hd.indexOf('e') >= 0){ nw += wdx; }
      if(hd.indexOf('n') >= 0){ ny += wdy; nh -= wdy; }
      if(hd.indexOf('s') >= 0){ nh += wdy; }
      if(nw < 8) nw = 8; if(nh < 8) nh = 8;
      var te = ed.drag.target.e;
      te.targetW = ed.snap ? E.snapVal(nw) : Math.round(nw);
      te.targetH = ed.snap ? E.snapVal(nh) : Math.round(nh);
      te.targetOffX = ed.snap ? E.snapVal(nx + te.targetW/2) : Math.round(nx + te.targetW/2);
      te.targetOffY = ed.snap ? E.snapVal(ny + te.targetH/2) : Math.round(ny + te.targetH/2);
      ed.dirty = true; E.refreshInspector();
    }
    else if(ed.drag.mode === 'draw'){ var sx0 = ed.drag.startWorld.x, sy0 = ed.drag.startWorld.y, x1 = E.snapVal(wp.x), y1 = E.snapVal(wp.y); ed.drag.preview = { x: Math.min(sx0, x1), y: Math.min(sy0, y1), w: Math.abs(x1 - sx0), h: Math.abs(y1 - sy0) }; ed.dirty = true; }
  });

  window.addEventListener('mouseup', function(ev){
    if(ed.panning){ ed.panning = false; if (ed.shiftDown || ed.spaceDown) cvs.style.cursor = 'grab'; else cvs.style.cursor = ed.tool === 'select' ? 'default' : 'crosshair'; return; }
    if(ed.boxSelect){
      var bs = ed.boxSelect, rect = { x: Math.min(bs.x, bs.x+bs.w), y: Math.min(bs.y, bs.y+bs.h), w: Math.abs(bs.w), h: Math.abs(bs.h) };
      if (rect.w > 4 && rect.h > 4) {
        var all = E.collectEntities(), hitList = [];
        for(var i=0; i<all.length; i++){
          var e = all[i].e;
          if (bs.type === 'intersect') { if (rect.x < e.x + e.w && rect.x + rect.w > e.x && rect.y < e.y + e.h && rect.y + rect.h > e.y) hitList.push(all[i]); }
          else { if (e.x >= rect.x && e.y >= rect.y && e.x + e.w <= rect.x + rect.w && e.y + e.h <= rect.y + rect.h) hitList.push(all[i]); }
        }
        if (hitList.length === 1) { ed.selected = hitList[0]; ed.multiSelected = []; }
        else if (hitList.length > 1) { ed.multiSelected = hitList; ed.selected = null; }
      }
      ed.boxSelect = null; E.refreshInspector(); E.refreshObjList(); ed.dirty = true; return;
    }
    if(!ed.drag) return; var d = ed.drag; ed.drag = null;
    if(d.mode === 'draw'){ var p = d.preview, def = E.TOOL_DEFAULT[d.type], w = p.w, h = p.h, x = p.x, y = p.y; if(w < 4 || h < 4){ w = def.w; h = def.h; x = d.startWorld.x; y = d.startWorld.y; } E.addEntity(d.type, x, y, w, h); }
    else { E.refreshAll(); }
    ed.dirty = true;
  });

  cvs.addEventListener('wheel', function(ev){ ev.preventDefault(); var sp = E.evtPos(ev), wp = E.s2w(sp.x, sp.y), factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12; ed.zoom = E.clamp(ed.zoom * factor, 0.05, 4); ed.cam.x = wp.x - sp.x / ed.zoom; ed.cam.y = wp.y - sp.y / ed.zoom; E.updateZoomLabel(); ed.dirty = true; }, { passive: false });
  cvs.addEventListener('contextmenu', function(ev){ ev.preventDefault(); });

  window.addEventListener('keydown', function(ev){
    var tag = (document.activeElement && document.activeElement.tagName) || ''; if(/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if(ev.code === 'Space'){ ed.spaceDown = true; if(!ed.panning) cvs.style.cursor = 'grab'; ev.preventDefault(); }
    if(ev.key === 'Shift'){ ed.shiftDown = true; if(!ed.panning) cvs.style.cursor = 'grab'; }
    if(ev.ctrlKey || ev.metaKey){ if(ev.code === 'KeyZ'){ ev.preventDefault(); if(ev.shiftKey) E.doRedo(); else E.doUndo(); return; } if(ev.code === 'KeyY'){ ev.preventDefault(); E.doRedo(); return; } if(ev.code === 'KeyS'){ ev.preventDefault(); E.saveJSON(); return; } return; }
    if(ev.code === 'Delete' || ev.code === 'Backspace'){ ev.preventDefault(); E.deleteSelected(); return; }
    if(ev.code === 'Escape'){ ed.selected = null; ed.multiSelected = []; ed.selectedHitboxIdx = undefined; E.refreshInspector(); E.refreshObjList(); ed.dirty = true; return; }
    var num = { Digit1:'select', Digit2:'solid', Digit3:'mover', Digit4:'spike', Digit0:'adv_spike', Digit5:'walker', Digit6:'shooter', KeyH:'healthpack', KeyW:'weapon', Digit7:'checkpoint', KeyT:'trigger', Digit8:'goal', Digit9:'erase' };
    if(num[ev.code]){ E.setTool(num[ev.code]); }
  });
  window.addEventListener('keyup', function(ev){
    if(ev.code === 'Space'){ ed.spaceDown = false; if(!ed.panning && !ed.shiftDown) cvs.style.cursor = ed.tool === 'select' ? 'default' : 'crosshair'; }
    if(ev.key === 'Shift'){ ed.shiftDown = false; if(!ed.panning && !ed.spaceDown) cvs.style.cursor = ed.tool === 'select' ? 'default' : 'crosshair'; }
  });
})(window.EDITOR);
