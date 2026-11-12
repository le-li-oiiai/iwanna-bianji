/*
 * main.js —— 启动：绑定 UI、初始化视图、开始主循环
 */
(function (E) {
  'use strict';

  var $ = E.$;
  var ed = E.ed;

  E.init = function(){
    E.buildTools(); E.bindWorldInputs();
    $('closeAdvModal').addEventListener('click', function(){ ed.selected = null; ed.multiSelected = []; ed.selectedHitboxIdx = undefined; E.refreshInspector(); E.refreshObjList(); ed.dirty = true; });
    $('closeEntityModal').addEventListener('click', function(){ ed.selected = null; ed.multiSelected = []; ed.selectedHitboxIdx = undefined; E.refreshInspector(); E.refreshObjList(); ed.dirty = true; });
    $('btn-undo').addEventListener('click', E.doUndo); $('btn-redo').addEventListener('click', E.doRedo); $('btn-fit').addEventListener('click', E.fitView); $('btn-test').addEventListener('click', E.testPlay); $('btn-close-test').addEventListener('click', E.closeTest); $('btn-export').addEventListener('click', E.exportHTML); $('btn-save').addEventListener('click', E.saveJSON); $('btn-load').addEventListener('click', E.loadJSON);
    // 让测试 iframe 在点击遮罩任意位置时也能重新获得焦点
    $('test-overlay').addEventListener('mousedown', function(){
      try { $('test-frame').contentWindow.focus(); } catch(e){}
    });
    window.addEventListener('resize', function(){ E.resizeCanvas(); ed.dirty = true; });
    E.resizeCanvas(); E.fitView(); E.refreshAll();
    requestAnimationFrame(E.loop);
    window.__editorInited = true;
  };
  E.init();
})(window.EDITOR);
