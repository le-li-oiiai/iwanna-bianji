/*
 * inspector.js —— 左侧工具栏 + 右侧属性面板 + 对象列表
 *
 * 这一层的代码基本都在拼 HTML 字符串，再把输入框的 change 事件接回 level 数据。
 */
(function (E) {
  'use strict';

  var $ = E.$;
  var cvs = E.cvs;
  var level = E.level, ed = E.ed;

  E.buildTools = function(){
    var box = $('tools'); box.innerHTML = '';
    E.TOOLS.forEach(function(t){
      var b = document.createElement('button'); b.className = 'tool' + (ed.tool === t.id ? ' active' : ''); b.dataset.tool = t.id;
      b.innerHTML = '<span class="dot" style="background:' + t.color + '"></span><span>' + t.name + '</span><span class="kbd">' + t.key + '</span>';
      b.addEventListener('click', function(){ E.setTool(t.id); }); box.appendChild(b);
    });
  };
  E.setTool = function(id){
    ed.tool = id; var els = document.querySelectorAll('.tool');
    for(var i = 0; i < els.length; i++){ els[i].classList.toggle('active', els[i].dataset.tool === id); }
    if(!ed.panning && !ed.shiftDown && !ed.spaceDown) cvs.style.cursor = id === 'erase' ? 'not-allowed' : (id === 'select' ? 'default' : 'crosshair');
  };

  E.buildHitboxHTML = function(e, type) {
    var html = '<div class="panel-title" style="margin-top:15px;">碰撞箱</div>';
    html += '<div style="margin-bottom:10px;"><button class="mini-btn add-hitbox-btn">+ 添加碰撞箱</button></div>';
    for(var i=0; i<e.hitboxes.length; i++){
      var h = e.hitboxes[i], isSel = ed.selectedHitboxIdx === i;
      html += '<div class="hitbox-item" data-idx="'+i+'" style="border:1px solid '+(isSel?'var(--accent)':'#26263f')+'; border-radius:4px; padding:6px; margin-bottom:6px; background:'+(isSel?'#16302e':'#12121e')+';">';
      html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">';
      html += '<span style="font-weight:bold; font-size:11px; color:'+(isSel?'var(--accent)':'var(--dim)')+'">碰撞箱 #'+(i+1)+'</span>';
      html += '<button class="mini-btn del-hitbox-btn" data-del="'+i+'" style="padding:2px 6px; margin:0; border-color:#e94560; color:#e94560;">删除</button>';
      html += '</div>';
      html += '<div class="field"><label>X</label><input type="number" data-hbox="'+i+'" data-hkey="x" value="'+(h.x||0)+'" step="1"></div>';
      html += '<div class="field"><label>Y</label><input type="number" data-hbox="'+i+'" data-hkey="y" value="'+(h.y||0)+'" step="1"></div>';
      html += '<div class="field"><label>宽</label><input type="number" data-hbox="'+i+'" data-hkey="w" value="'+(h.w||20)+'" step="1"></div>';
      html += '<div class="field"><label>高</label><input type="number" data-hbox="'+i+'" data-hkey="h" value="'+(h.h||20)+'" step="1"></div>';
      html += '<label class="row"><input type="checkbox" data-hbox="'+i+'" data-hkey="isRelative" '+(h.isRelative?'checked':'')+'> 相对于实体</label>';
      html += '<div class="field"><label title="0=持续接触才触发（离开即停止）&#10;1=碰一次即触发并保持（重生前不重置）&#10;2=第二次接触时触发&#10;3=第三次接触时触发">触发时机</label><input type="number" data-hbox="'+i+'" data-hkey="triggerCount" value="'+(h.triggerCount||0)+'" step="1" min="0"></div>';
      html += '<div style="font-size:10px; color:var(--dim); margin:-2px 0 6px 80px; line-height:1.4;">0=持续接触 / 1=碰一次 / N=碰N次</div>';
      html += '<label class="row"><input type="checkbox" data-hbox="'+i+'" data-hkey="resetOnDeath" '+(h.resetOnDeath?'checked':'')+'> 玩家死后重置触发</label>';
      html += '<div style="font-size:11px; color:var(--dim); margin-top:5px; border-top:1px dashed #26263f; padding-top:5px;">触发功能：</div>';
      if (type !== 'solid') {
        html += '<label class="row"><input type="checkbox" data-hbox="'+i+'" data-hkey="triggerMove" '+(h.triggerMove?'checked':'')+'> 触发运动</label>';
      }
      if (type === 'solid' || type === 'mover' || type === 'adv_spike') {
        html += '<label class="row"><input type="checkbox" data-hbox="'+i+'" data-hkey="triggerMorph" '+(h.triggerMorph?'checked':'')+'> 触发形变</label>';
      }
      html += '<label class="row"><input type="checkbox" data-hbox="'+i+'" data-hkey="triggerVisibility" '+(h.triggerVisibility?'checked':'')+'> 触发显形</label>';
      html += '<label class="row"><input type="checkbox" data-hbox="'+i+'" data-hkey="triggerSlow" '+(h.triggerSlow?'checked':'')+'> 触发减速</label>';
      html += '<label class="row"><input type="checkbox" data-hbox="'+i+'" data-hkey="triggerFast" '+(h.triggerFast?'checked':'')+'> 触发加速</label>';
      html += '<label class="row"><input type="checkbox" data-hbox="'+i+'" data-hkey="triggerBounce" '+(h.triggerBounce?'checked':'')+'> 触发弹射</label>';
      html += '</div>';
    }
    return html;
  };

  E.bindHitboxEvents = function(targetBox) {
    var addBtn = targetBox.querySelector('.add-hitbox-btn');
    if (addBtn) addBtn.addEventListener('click', function(){
      E.pushHistory(); var s = ed.selected.e;
      s.hitboxes.push({ x: -10, y: -10, w: s.w + 20, h: s.h + 20, isRelative: true, triggerCount: 0, resetOnDeath: true, triggerMove: false, triggerMorph: false, triggerVisibility: false, triggerSlow: false, triggerFast: false, triggerBounce: false });
      ed.selectedHitboxIdx = s.hitboxes.length - 1; E.refreshInspector(); ed.dirty = true;
    });
    var delBtns = targetBox.querySelectorAll('.del-hitbox-btn');
    for(var i=0; i<delBtns.length; i++){ (function(btn){ btn.addEventListener('click', function(){ E.pushHistory(); var idx = parseInt(btn.getAttribute('data-del')); ed.selected.e.hitboxes.splice(idx, 1); if (ed.selectedHitboxIdx === idx) ed.selectedHitboxIdx = undefined; else if (ed.selectedHitboxIdx > idx) ed.selectedHitboxIdx--; E.refreshInspector(); ed.dirty = true; }); })(delBtns[i]); }
    var boxes = targetBox.querySelectorAll('.hitbox-item');
    for(var j=0; j<boxes.length; j++){ (function(box){ box.addEventListener('mousedown', function(e){ if(e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return; ed.selectedHitboxIdx = parseInt(box.dataset.idx); E.refreshInspector(); ed.dirty = true; }); })(boxes[j]); }
  };

  E.buildEnemyCommonHTML = function(e, type) {
    var html = '';
    html += '<div class="field"><label>血量</label><input type="number" data-key="hp" value="'+(e.hp||1)+'" step="1" min="1"></div>';
    html += '<div class="field"><label>伤害</label><input type="number" data-key="damage" value="'+(e.damage||1)+'" step="1" min="1"></div>';
    html += '<label class="row"><input type="checkbox" data-key="resetOnDeath" '+(e.resetOnDeath !== false ? 'checked' : '')+'> 玩家死后重置（敌人复活）</label>';
    return html;
  };

  E.refreshInspector = function(){
    var box = $('inspector'), modalAdv = $('advSpikeModal'), modalEnt = $('entityModal');
    if(ed.multiSelected.length > 0){ modalAdv.classList.add('hidden'); modalEnt.classList.add('hidden'); box.innerHTML = '<div class="empty" style="color:var(--accent2)">已选中 ' + ed.multiSelected.length + ' 个对象<br><span>按 Delete 批量删除；点击任意对象可切换为单选。</span></div>'; return; }
    if(!ed.selected){ box.innerHTML = '<div class="empty">未选中对象<br><span>左键框选相交，右键框选包含</span></div>'; modalAdv.classList.add('hidden'); modalEnt.classList.add('hidden'); return; }
    var type = ed.selected.type, e = ed.selected.e, html = '';
    if (type === 'adv_spike') {
      modalEnt.classList.add('hidden'); box.innerHTML = '<div class="empty" style="color:var(--accent)">已打开浮窗编辑器<br><span>请在右侧浮窗调整参数</span></div>'; modalAdv.classList.remove('hidden');
      html += '<div class="field"><label>伤害</label><input type="number" data-key="damage" value="'+(e.damage||1)+'" step="1" min="1"></div>';
      html += '<div class="field"><label>轨迹运动</label><input type="checkbox" data-key="hasPath" '+(e.path && e.path.length>0 ? 'checked' : '')+'></div>';
      if (e.path && e.path.length > 0) {
        html += '<div class="field"><label>节点数</label><div><button class="mini-btn" id="delPathNode" style="padding:2px 6px;">-</button> <span style="margin:0 8px;">'+e.path.length+'</span> <button class="mini-btn" id="addPathNode" style="padding:2px 6px;">+</button></div></div>';
        html += '<div class="field"><label>速度</label><input type="number" data-key="pathSpeed" value="'+(e.pathSpeed||2)+'" step="0.1"></div>';
      }
      html += '<div class="field"><label>形状</label><select data-key="shape">'
           + '<option value="triangle"'+(e.shape==='triangle'?' selected':'')+'>三角</option>'
           + '<option value="square"'+(e.shape==='square'?' selected':'')+'>方块</option>'
           + '<option value="circle"'+(e.shape==='circle'?' selected':'')+'>圆形</option>'
           + '</select></div>';
      html += '<div class="field"><label>隐身</label><select data-key="visibility">'
           + '<option value="always"'+(e.visibility==='always'?' selected':'')+'>常显</option>'
           + '<option value="blink"'+(e.visibility==='blink'?' selected':'')+'>闪烁</option>'
           + '<option value="near"'+(e.visibility==='near'?' selected':'')+'>靠近显现</option>'
           + '</select></div>';
      html += '<div class="field"><label>形变</label><select data-key="morph">'
           + '<option value="none"'+(e.morph==='none'||!e.morph?' selected':'')+'>无</option>'
           + '<option value="stretch"'+(e.morph==='stretch'?' selected':'')+'>拉伸</option>'
           + '</select></div>';
      if (e.morph === 'stretch') {
        html += '<label class="row"><input type="checkbox" data-key="morphDemo" '+(e.morphDemo ? 'checked' : '')+'> 演示形变（仅编辑器预览）</label>';
        html += '<label class="row"><input type="checkbox" data-key="morphLoop" '+(e.morphLoop !== false ? 'checked' : '')+'> 循环形变（取消 = 只发生一次）</label>';
        html += '<div class="field"><label>目标宽</label><input type="number" data-key="targetW" value="'+(e.targetW||e.w)+'" step="1"></div>';
        html += '<div class="field"><label>目标高</label><input type="number" data-key="targetH" value="'+(e.targetH||e.h)+'" step="1"></div>';
        html += '<div class="field"><label>目标偏移X</label><input type="number" data-key="targetOffX" value="'+(e.targetOffX||0)+'" step="1"></div>';
        html += '<div class="field"><label>目标偏移Y</label><input type="number" data-key="targetOffY" value="'+(e.targetOffY||0)+'" step="1"></div>';
        html += '<button class="mini-btn" id="applyTargetSize" style="width:100%;margin-bottom:4px;">↧ 应用目标尺寸为实体大小</button>';
        html += '<button class="mini-btn" id="resetTargetToEntity" style="width:100%;margin-bottom:4px;">↺ 以当前实体大小作为目标</button>';
      }
      html += '<div class="field"><label>图层</label><select data-key="layer">'
           + '<option value="top"'+(e.layer==='top'?' selected':'')+'>顶层</option>'
           + '<option value="bottom"'+(e.layer==='bottom'?' selected':'')+'>底层</option>'
           + '</select></div>';
      html += E.buildHitboxHTML(e, type);
      $('advSpikeBody').innerHTML = html;
    } else if (type === 'solid' || type === 'mover' || type === 'walker' || type === 'shooter') {
      modalAdv.classList.add('hidden'); box.innerHTML = '<div class="empty" style="color:var(--accent)">已打开浮窗编辑器<br><span>请在右侧浮窗调整参数</span></div>'; modalEnt.classList.remove('hidden');
      html = '<div class="type-tag" style="color:' + E.TYPE_COLOR[type] + '">' + E.TYPE_NAME[type] + '</div>';
      ['x','y','w','h'].forEach(function(k){
        var labels = {x:'X', y:'Y', w:'宽', h:'高'}; var val = (e[k] === undefined ? 0 : e[k]);
        html += '<div class="field"><label>' + labels[k] + '</label><input type="number" data-key="' + k + '" value="' + val + '" step="1"></div>';
      });
      if (type === 'walker' || type === 'shooter') {
        html += E.buildEnemyCommonHTML(e, type);
      }
      if (type === 'solid' || type === 'mover' || type === 'adv_spike') {
        html += '<div class="field"><label>形变</label><select data-key="morph">'
             + '<option value="none"'+(e.morph==='none'||!e.morph?' selected':'')+'>无</option>'
             + '<option value="stretch"'+(e.morph==='stretch'?' selected':'')+'>拉伸</option>'
             + '</select></div>';
        if (e.morph === 'stretch') {
          html += '<label class="row"><input type="checkbox" data-key="morphDemo" '+(e.morphDemo ? 'checked' : '')+'> 演示形变（仅编辑器预览）</label>';
          html += '<label class="row"><input type="checkbox" data-key="morphLoop" '+(e.morphLoop !== false ? 'checked' : '')+'> 循环形变（取消 = 只发生一次）</label>';
          html += '<div class="field"><label>目标宽</label><input type="number" data-key="targetW" value="'+(e.targetW||e.w)+'" step="1"></div>';
          html += '<div class="field"><label>目标高</label><input type="number" data-key="targetH" value="'+(e.targetH||e.h)+'" step="1"></div>';
          html += '<div class="field"><label>目标偏移X</label><input type="number" data-key="targetOffX" value="'+(e.targetOffX||0)+'" step="1"></div>';
          html += '<div class="field"><label>目标偏移Y</label><input type="number" data-key="targetOffY" value="'+(e.targetOffY||0)+'" step="1"></div>';
          html += '<button class="mini-btn" id="applyTargetSize" style="width:100%;margin-bottom:4px;">↧ 应用目标尺寸为实体大小</button>';
          html += '<button class="mini-btn" id="resetTargetToEntity" style="width:100%;margin-bottom:4px;">↺ 以当前实体大小作为目标</button>';
        }
      }
      if (type === 'mover' || type === 'walker' || type === 'shooter') {
        html += '<div class="field"><label>轨迹运动</label><input type="checkbox" data-key="hasPath" '+(e.path && e.path.length>0 ? 'checked' : '')+'></div>';
        if (e.path && e.path.length > 0) {
          html += '<div class="field"><label>节点数</label><div><button class="mini-btn" id="delPathNode" style="padding:2px 6px;">-</button> <span style="margin:0 8px;">'+e.path.length+'</span> <button class="mini-btn" id="addPathNode" style="padding:2px 6px;">+</button></div></div>';
          html += '<div class="field"><label>速度</label><input type="number" data-key="pathSpeed" value="'+(e.pathSpeed||2)+'" step="0.1"></div>';
        } else {
          if (type === 'mover') {
            html += '<div class="field"><label>水平振幅</label><input type="number" data-key="ax" value="'+(e.ax||0)+'" step="1"></div>';
            html += '<div class="field"><label>垂直振幅</label><input type="number" data-key="ay" value="'+(e.ay||0)+'" step="1"></div>';
            html += '<div class="field"><label>速度</label><input type="number" data-key="spd" value="'+(e.spd||0.02)+'" step="0.001"></div>';
          } else if (type === 'walker') {
            html += '<div class="field"><label>左边界</label><input type="number" data-key="minX" value="'+(e.minX||0)+'" step="1"></div>';
            html += '<div class="field"><label>右边界</label><input type="number" data-key="maxX" value="'+(e.maxX||0)+'" step="1"></div>';
            html += '<div class="field"><label>速度</label><input type="number" data-key="vx" value="'+(e.vx||1.5)+'" step="0.1"></div>';
          }
        }
      }
      if (type === 'shooter') {
        html += '<div class="field"><label>射击间隔</label><input type="number" data-key="cd" value="'+(e.cd||90)+'" step="1"></div>';
      }
      if (type === 'solid' || type === 'mover' || type === 'walker' || type === 'shooter') {
        html += E.buildHitboxHTML(e, type);
      }
      $('entityBody').innerHTML = html;
    } else {
      modalAdv.classList.add('hidden'); modalEnt.classList.add('hidden');
      html = '<div class="type-tag" style="color:' + E.TYPE_COLOR[type] + '">' + E.TYPE_NAME[type] + '</div>';
      ['x','y','w','h'].forEach(function(k){
        var labels = {x:'X', y:'Y', w:'宽', h:'高'}; var val = (e[k] === undefined ? 0 : e[k]);
        html += '<div class="field"><label>' + labels[k] + '</label><input type="number" data-key="' + k + '" value="' + val + '" step="1"></div>';
      });
      if (type === 'checkpoint' || type === 'trigger') {
        html += '<div class="field"><label>重生X</label><input type="number" data-key="spawnX" value="'+(e.spawnX||0)+'" step="1"></div>';
        html += '<div class="field"><label>重生Y</label><input type="number" data-key="spawnY" value="'+(e.spawnY||0)+'" step="1"></div>';
        html += '<button class="mini-btn" id="cp-auto">↧ 重生点对齐到底部</button>';
      }
      if (type === 'healthpack') {
        html += '<div class="field"><label>回复量</label><input type="number" data-key="heal" value="'+(e.heal||1)+'" step="1" min="1"></div>';
        html += '<div class="hint-text" style="margin:4px 0 8px">绿色十字，碰到回血；满血时不会浪费。</div>';
      }
      if (type === 'weapon') {
        html += '<div class="field"><label>武器</label><select data-key="type">';
        E.WEAPON_OPTIONS.forEach(function(w){
          html += '<option value="' + w.id + '"' + (e.type === w.id ? ' selected' : '') + '>' + w.name + '</option>';
        });
        html += '</select></div>';
        html += '<div class="field"><label>伤害</label><input type="number" data-key="damage" value="'+(e.damage||1)+'" step="1" min="1"></div>';
        html += '<div class="hint-text" style="margin:4px 0 8px">玩家已有同款武器时不重复拾取；装备栏（2 格）满时也捡不起来。</div>';
      }
      if (type === 'healthpack' || type === 'weapon') {
        html += '<div class="field"><label>轨迹运动</label><input type="checkbox" data-key="hasPath" '+(e.path && e.path.length>0 ? 'checked' : '')+'></div>';
        if (e.path && e.path.length > 0) {
          html += '<div class="field"><label>节点数</label><div><button class="mini-btn" id="delPathNode" style="padding:2px 6px;">-</button> <span style="margin:0 8px;">'+e.path.length+'</span> <button class="mini-btn" id="addPathNode" style="padding:2px 6px;">+</button></div></div>';
          html += '<div class="field"><label>速度</label><input type="number" data-key="pathSpeed" value="'+(e.pathSpeed||2)+'" step="0.1"></div>';
        }
      }
      box.innerHTML = html;
    }
    var targetBox = (type === 'adv_spike' ? $('advSpikeBody') : ((type === 'solid' || type === 'mover' || type === 'walker' || type === 'shooter') ? $('entityBody') : box));
    var inputs = targetBox.querySelectorAll('input[data-key], select[data-key], input[data-hbox]');
    for(var i = 0; i < inputs.length; i++){
      (function(inp){
        inp.addEventListener('change', function(){
          var hboxIdx = inp.getAttribute('data-hbox');
          var k = hboxIdx !== null ? inp.getAttribute('data-hkey') : inp.dataset.key;
          var v = inp.value;
          if (inp.type === 'checkbox') v = inp.checked;
          else if (inp.tagName === 'INPUT') { v = parseFloat(v); if(isNaN(v)) v = 0; }
          E.pushHistory();
          if (hboxIdx !== null) {
            var hbox = ed.selected.e.hitboxes[parseInt(hboxIdx)];
            if (k === 'isRelative') {
              // 相对锚点是 ox/oy（E.getHitboxRect 用它做基准），不能用 e.x/e.y
              var anchorX = ed.selected.e.ox !== undefined ? ed.selected.e.ox : ed.selected.e.x;
              var anchorY = ed.selected.e.oy !== undefined ? ed.selected.e.oy : ed.selected.e.y;
              if (v === true && !hbox.isRelative) { hbox.x -= anchorX; hbox.y -= anchorY; }
              else if (v === false && hbox.isRelative) { hbox.x += anchorX; hbox.y += anchorY; }
              hbox.isRelative = v;
            } else { hbox[k] = v; }
          } else {
            if (k === 'hasPath') {
              if (v === true) {
                if (!ed.selected.e.path || ed.selected.e.path.length === 0) {
                  var pcx = ed.selected.e.x + ed.selected.e.w/2;
                  var pcy = ed.selected.e.y + ed.selected.e.h/2;
                  ed.selected.e.path = [{ x: pcx, y: pcy }, { x: pcx + 100, y: pcy }, { x: pcx + 200, y: pcy }];
                  ed.selected.e.pathSpeed = ed.selected.e.pathSpeed || 2;
                }
              } else { ed.selected.e.path = []; }
            } else {
              ed.selected.e[k] = v;
              // 同步 morph/hitbox 的相对锚点
              if (k === 'x' && ed.selected.e.ox !== undefined) ed.selected.e.ox = v;
              if (k === 'y' && ed.selected.e.oy !== undefined) ed.selected.e.oy = v;
              if(ed.selected.type === 'walker' && k === 'x'){ ed.selected.e.minX = v - 100; ed.selected.e.maxX = v + ed.selected.e.w + 100; }
              if(k === 'morph' && v === 'stretch'){ if(e.targetW === undefined) e.targetW = e.w; if(e.targetH === undefined) e.targetH = e.h; if(e.targetOffX === undefined) e.targetOffX = 0; if(e.targetOffY === undefined) e.targetOffY = 0; }
              if(k === 'hp' && v < 1) { e.hp = 1; }
              if(k === 'damage' && v < 1) { e.damage = 1; }
              /* 换武器类型时，伤害跟到该类型的默认值 */
              if(k === 'type' && ed.selected.type === 'weapon'){ e.damage = E.WEAPON_DEFAULT_DAMAGE[v] || 1; }
            }
          }
          if (k === 'hasPath' || k === 'morph' || (ed.selected.type === 'weapon' && k === 'type') || (ed.selected.type === 'adv_spike' && (k === 'moveType' || k === 'visibility' || k === 'shape'))) { E.refreshInspector(); }
          E.refreshObjList(); ed.dirty = true;
        });
      })(inputs[i]);
    }
    var addNodeBtn = targetBox.querySelector('#addPathNode');
    if (addNodeBtn) addNodeBtn.addEventListener('click', function(){ E.pushHistory(); var p = ed.selected.e.path; if (p.length >= 2) { var last = p[p.length-1], prev = p[p.length-2]; p.splice(p.length-1, 0, { x: (last.x + prev.x) / 2, y: (last.y + prev.y) / 2 }); } E.refreshInspector(); ed.dirty = true; });
    var delNodeBtn = targetBox.querySelector('#delPathNode');
    if (delNodeBtn) delNodeBtn.addEventListener('click', function(){ E.pushHistory(); var p = ed.selected.e.path; if (p.length > 2) { p.splice(p.length-2, 1); } E.refreshInspector(); ed.dirty = true; });
    var applyBtn = targetBox.querySelector('#applyTargetSize');
    if (applyBtn) applyBtn.addEventListener('click', function(){
      E.pushHistory(); var s = ed.selected.e;
      if (s.targetW !== undefined) s.w = s.targetW;
      if (s.targetH !== undefined) s.h = s.targetH;
      s.targetW = s.w; s.targetH = s.h; s.targetOffX = 0; s.targetOffY = 0;
      E.refreshInspector(); E.refreshObjList(); ed.dirty = true;
    });
    var resetTgtBtn = targetBox.querySelector('#resetTargetToEntity');
    if (resetTgtBtn) resetTgtBtn.addEventListener('click', function(){
      E.pushHistory(); var s = ed.selected.e;
      s.targetW = s.w; s.targetH = s.h; s.targetOffX = 0; s.targetOffY = 0;
      E.refreshInspector(); ed.dirty = true;
    });
    E.bindHitboxEvents(targetBox);
    if (type !== 'adv_spike' && type !== 'solid' && type !== 'mover' && type !== 'walker' && type !== 'shooter') {
      var cpAuto = box.querySelector('#cp-auto');
      if(cpAuto){ cpAuto.addEventListener('click', function(){ E.pushHistory(); var c = ed.selected.e; if(c.type === 'trigger') c.spawnX = Math.round(c.x + c.w + 10); else c.spawnX = Math.round(c.x + c.w/2 - 7); c.spawnY = Math.round(c.y + c.h - 22); E.refreshInspector(); ed.dirty = true; }); }
    }
  };

  E.refreshObjList = function(){
    var box = $('objlist'), list = E.collectEntities();
    if(!list.length){ box.innerHTML = '<div class="obj-item" style="cursor:default;color:#3a3f58">（空）</div>'; return; }
    var html = '';
    for(var i = 0; i < list.length; i++){
      var it = list[i], sel = (ed.selected && ed.selected.e === it.e) || ed.multiSelected.some(function(x){return x.e===it.e;}) ? ' sel' : '';
      var name = E.TYPE_NAME[it.type] || it.type;
      if(it.type === 'weapon') name += '·' + (E.WEAPON_SHORT[it.e.type] || '');
      if(it.type === 'healthpack') name += ' +' + (it.e.heal || 1);
      var coord = 'x:' + Math.round(it.e.x) + ' y:' + Math.round(it.e.y);
      html += '<div class="obj-item' + sel + '" data-idx="' + i + '"><span class="dot" style="background:' + E.TYPE_COLOR[it.type] + '"></span><span class="nm">' + name + ' <span style="opacity:.55">' + coord + '</span></span></div>';
    }
    box.innerHTML = html;
    var items = box.querySelectorAll('.obj-item[data-idx]');
    for(var j = 0; j < items.length; j++){
      (function(el){
        el.addEventListener('click', function(ev){ var idx = parseInt(el.dataset.idx, 10), l = E.collectEntities(); if(l[idx]){ if(ev.shiftKey){ if(!ed.multiSelected.some(function(x){return x.e===l[idx].e;})) ed.multiSelected.push(l[idx]); ed.selected = null; } else { ed.selected = l[idx]; ed.multiSelected = []; } ed.selectedHitboxIdx = undefined; E.refreshInspector(); E.refreshObjList(); ed.dirty = true; } });
        el.addEventListener('dblclick', function(){ var idx = parseInt(el.dataset.idx, 10), l = E.collectEntities(); if(!l[idx]) return; var e = l[idx].e; ed.cam.x = e.x + e.w/2 - E.viewW / (2 * ed.zoom); ed.cam.y = e.y + e.h/2 - E.viewH / (2 * ed.zoom); ed.dirty = true; });
      })(items[j]);
    }
  };

  /* 初始武器下拉框的选项（无 / 三种武器） */
  E.buildWeaponSelects = function(){
    for(var i = 0; i < E.MAX_WEAPON_SLOTS; i++){
      var sel = $('weapon-' + (i + 1));
      if(!sel) continue;
      sel.innerHTML = '';
      var none = document.createElement('option');
      none.value = '';
      none.textContent = '无';
      sel.appendChild(none);
      E.WEAPON_OPTIONS.forEach(function(w){
        var o = document.createElement('option');
        o.value = w.id;
        o.textContent = w.name;
        sel.appendChild(o);
      });
    }
  };

  E.refreshWorldInputs = function(){
    $('world-w').value = level.worldW; $('world-h').value = level.worldH; $('player-max-hp').value = level.playerMaxHp || 3;
    $('spawn-x').value = level.spawn.x; $('spawn-y').value = level.spawn.y;

    /* 初始武器：两个格子，没配就是空 */
    for(var i = 0; i < E.MAX_WEAPON_SLOTS; i++){
      var slot = (level.playerWeapons || [])[i];
      $('weapon-' + (i + 1)).value = slot ? slot.type : '';
      $('weapon-dmg-' + (i + 1)).value = slot ? slot.damage : 1;
      $('weapon-dmg-' + (i + 1)).disabled = !slot;
    }
  };

  /* 把两个下拉框的当前选择同步回 level.playerWeapons（空的忽略，自动往前排） */
  E.syncInitialWeapons = function(){
    var prev = level.playerWeapons || [];
    var list = [];
    for(var i = 0; i < E.MAX_WEAPON_SLOTS; i++){
      var type = $('weapon-' + (i + 1)).value;
      if(!type) continue;
      var dmg = E.clamp(parseInt($('weapon-dmg-' + (i + 1)).value, 10) || 1, 1, 99);
      /* 换了武器类型就回到该类型的默认伤害，避免沿用上一把的数值 */
      if(!prev[i] || prev[i].type !== type) dmg = E.WEAPON_DEFAULT_DAMAGE[type] || 1;
      list.push({ type: type, damage: dmg });
    }
    level.playerWeapons = list;
    E.refreshWorldInputs();
  };

  E.bindWorldInputs = function(){
    E.buildWeaponSelects();
    $('world-w').addEventListener('change', function(){ var v = E.clamp(parseInt(this.value, 10) || 4000, 400, 20000); E.pushHistory(); level.worldW = v; this.value = v; ed.dirty = true; });
    $('world-h').addEventListener('change', function(){ var v = E.clamp(parseInt(this.value, 10) || 540, 200, 3000); E.pushHistory(); level.worldH = v; this.value = v; ed.dirty = true; });
    $('player-max-hp').addEventListener('change', function(){ var v = E.clamp(parseInt(this.value, 10) || 3, 1, 99); E.pushHistory(); level.playerMaxHp = v; this.value = v; ed.dirty = true; });
    $('spawn-x').addEventListener('change', function(){ var v = parseInt(this.value, 10) || 0; E.pushHistory(); level.spawn.x = v; this.value = v; ed.dirty = true; });
    $('spawn-y').addEventListener('change', function(){ var v = parseInt(this.value, 10) || 0; E.pushHistory(); level.spawn.y = v; this.value = v; ed.dirty = true; });
    $('snap-toggle').addEventListener('change', function(){ ed.snap = this.checked; });
    $('grid-size').addEventListener('change', function(){ var v = E.clamp(parseInt(this.value, 10) || 10, 1, 200); ed.gridSize = v; this.value = v; ed.dirty = true; });

    for(var i = 0; i < E.MAX_WEAPON_SLOTS; i++){
      (function(){
        $('weapon-' + (i + 1)).addEventListener('change', function(){ E.pushHistory(); E.syncInitialWeapons(); ed.dirty = true; });
        $('weapon-dmg-' + (i + 1)).addEventListener('change', function(){ E.pushHistory(); E.syncInitialWeapons(); ed.dirty = true; });
      })();
    }
  };

  E.refreshAll = function(){ E.refreshInspector(); E.refreshObjList(); E.refreshWorldInputs(); E.updateHistoryButtons(); ed.dirty = true; };
})(window.EDITOR);
