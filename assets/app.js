/* Orvane Industries – Gestion du temps et des priorités. Comportements communs. */
(function () {
  'use strict';

  /* Hors ligne : mise en cache des pages après la première visite */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  /* Stockage local, avec repli si le navigateur le refuse (navigation privée, réglages stricts) */
  var HAS_STORAGE = (function () {
    try { var k = '__orvane'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; }
  })();
  function lsGet(k) { if (!HAS_STORAGE) return null; try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { if (!HAS_STORAGE) return false; try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { if (!HAS_STORAGE) return; try { localStorage.removeItem(k); } catch (e) {} }
  function two(n) { return n < 10 ? '0' + n : '' + n; }
  function hhmm(d) { return two(d.getHours()) + '\u00A0h\u00A0' + two(d.getMinutes()); }

  [].forEach.call(document.querySelectorAll('[data-print]'), function (b) {
    b.addEventListener('click', function () { window.print(); });
  });

  /* Suivi de la section visible (rail du dossier, étapes de la fiche) */
  function spy(links, targets) {
    if (!links.length) return;
    var ticking = false;
    function update() {
      ticking = false;
      var active = 0, offset = 170;
      targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= offset) active = i; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) active = targets.length - 1;
      links.forEach(function (a, i) {
        if (i === active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Dossier : repérer les documents lus ---------- */
  var rail = document.querySelector('.rail');
  if (rail) {
    var links = [].slice.call(rail.querySelectorAll('a[href^="#"]'));
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    spy(links, targets);

    var READ = 'orvane-priorites-lu-v1';
    var read = [];
    try { read = JSON.parse(lsGet(READ) || '[]'); } catch (e) { read = []; }
    function paintRead() {
      [].forEach.call(document.querySelectorAll('.readbtn'), function (btn) {
        var id = btn.getAttribute('data-doc'), on = read.indexOf(id) > -1;
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.textContent = on ? 'Lu' : 'Marquer comme lu';
        var link = rail.querySelector('a[href="#' + id + '"]');
        if (link) link.parentNode.classList.toggle('is-read', on);
      });
    }
    [].forEach.call(document.querySelectorAll('.readbtn'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-doc'), i = read.indexOf(id);
        if (i > -1) read.splice(i, 1); else read.push(id);
        lsSet(READ, JSON.stringify(read));
        paintRead();
      });
    });
    paintRead();
  }

  /* ---------- Fiche de travail ---------- */
  var form = document.getElementById('fiche');
  if (!form) return;

  var STORE = 'orvane-priorites-fiche-v1', EXPORTED = 'orvane-priorites-dernier-export-v1';
  var fields = [].slice.call(form.querySelectorAll('[data-key]'));
  var statusBox = document.getElementById('status'), statusText = document.getElementById('status-text');
  var reminder = document.getElementById('reminder');
  var timer = null, flashTimer = null, dirtySinceExport = false, firstEdit = 0;
  var lastExport = Number(lsGet(EXPORTED)) || 0;

  function grow(el) {
    if (el.tagName !== 'TEXTAREA' || !el.offsetParent) return;
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight + 2) + 'px';
  }
  function growAll() { fields.forEach(grow); }
  function valueOf(el) { return el.value; }
  function collect() { var o = {}; fields.forEach(function (f) { o[f.getAttribute('data-key')] = valueOf(f); }); return o; }
  function hasAnswers() { return fields.some(function (f) { return f.getAttribute('data-key').indexOf('g.') !== 0 && f.value.trim() !== ''; }); }

  function setStatus(state, text) {
    statusBox.setAttribute('data-state', state);
    if (text) { statusText.textContent = text; return; }
    var off = navigator.onLine === false ? ' Vous êtes hors ligne : vos réponses restent sur cet appareil.' : '';
    if (state === 'pending') statusText.textContent = 'Enregistrement…';
    else if (state === 'error') statusText.textContent = 'Enregistrement automatique impossible sur ce navigateur. Exportez vos réponses régulièrement.';
    else statusText.textContent = 'Enregistré à ' + hhmm(new Date()) + ' sur cet appareil.' + off;
  }
  function flash(text, state) {
    setStatus(state || 'saved', text);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { setStatus(HAS_STORAGE ? 'saved' : 'error'); }, 6000);
  }

  function updateProgress() {
    [].forEach.call(document.querySelectorAll('.steps a[data-step]'), function (a) {
      var n = a.getAttribute('data-step');
      var any = fields.some(function (f) { return f.getAttribute('data-key').indexOf('s' + n + '.') === 0 && f.value.trim() !== ''; });
      a.classList.toggle('has-content', any);
    });
  }

  function checkReminder() {
    var ref = lastExport || firstEdit;
    if (dirtySinceExport && hasAnswers() && ref && Date.now() - ref > 15 * 60000) {
      var mins = Math.round((Date.now() - ref) / 60000);
      reminder.textContent = lastExport
        ? 'Pensez à exporter vos réponses : dernier export il y a ' + mins + ' min.'
        : 'Pensez à exporter vos réponses : pour l’instant, elles ne sont enregistrées que sur cet appareil.';
      reminder.hidden = false;
    } else {
      reminder.hidden = true;
    }
  }

  function save() {
    clearTimeout(timer); timer = null;
    var payload = { app: 'orvane-priorites', v: 1, savedAt: Date.now(), fields: collect() };
    if (!lsSet(STORE, JSON.stringify(payload))) { setStatus('error'); return; }
    dirtySinceExport = true;
    if (!firstEdit) firstEdit = Date.now();
    setStatus('saved');
    checkReminder();
  }
  function schedule() { setStatus('pending'); clearTimeout(timer); timer = setTimeout(save, 350); }

  function applyValues(obj) {
    fields.forEach(function (f) {
      var k = f.getAttribute('data-key');
      if (obj && Object.prototype.hasOwnProperty.call(obj, k)) f.value = obj[k];
    });
    growAll(); updateProgress();
  }

  /* Restauration au chargement */
  (function restore() {
    if (!HAS_STORAGE) { setStatus('error'); return; }
    var raw = lsGet(STORE);
    if (!raw) { setStatus('saved', 'Prêt. Vos réponses s’enregistrent automatiquement sur cet appareil.'); return; }
    try {
      var p = JSON.parse(raw);
      if (p && p.fields) {
        applyValues(p.fields);
        firstEdit = p.savedAt || 0;
        dirtySinceExport = (p.savedAt || 0) > lastExport && hasAnswers();
        setStatus('saved', 'Réponses restaurées (enregistrées à ' + hhmm(new Date(p.savedAt || Date.now())) + ').');
      }
    } catch (e) { setStatus('saved', 'Prêt. Vos réponses s’enregistrent automatiquement sur cet appareil.'); }
  })();

  fields.forEach(function (f) {
    f.addEventListener('input', function () { grow(f); updateProgress(); schedule(); });
    f.addEventListener('change', function () { updateProgress(); schedule(); });
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && timer) save(); });
  window.addEventListener('pagehide', function () { if (timer) save(); });
  window.addEventListener('online', function () { setStatus(HAS_STORAGE ? 'saved' : 'error'); });
  window.addEventListener('offline', function () { setStatus(HAS_STORAGE ? 'saved' : 'error'); });
  window.addEventListener('beforeprint', growAll);
  window.addEventListener('resize', growAll);
  window.addEventListener('load', growAll);
  setInterval(checkReminder, 60000);
  growAll(); updateProgress();

  /* Suivi des étapes */
  var stepLinks = [].slice.call(document.querySelectorAll('.steps a[data-step]'));
  spy(stepLinks, stepLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }));

  [].forEach.call(document.querySelectorAll('dialog [data-close]'), function (b) {
    b.addEventListener('click', function () { b.closest('dialog').close('cancel'); });
  });

  /* ----- Export ----- */
  function labelOf(el) { var l = form.querySelector('label[for="' + el.id + '"]'); return l ? l.textContent.replace(/\s+/g, ' ').trim() : el.getAttribute('data-key'); }
  function textValue(el) {
    if (el.tagName === 'SELECT') return el.selectedIndex > 0 ? el.options[el.selectedIndex].text : '';
    return el.value;
  }
  function buildText(includeStep5) {
    var out = ['Fiche de travail – Mission d’appui, semaine 12 (Orvane Industries)'];
    var d = new Date();
    out.push('Exportée le ' + two(d.getDate()) + '/' + two(d.getMonth() + 1) + '/' + d.getFullYear() + ' à ' + hhmm(d).replace(/\u00A0/g, ' '));
    var head = [].filter.call(form.querySelectorAll('[data-key^="g."]'), function (f) { return f.value.trim(); });
    if (head.length) out.push('');
    head.forEach(function (f) { out.push(labelOf(f) + ' : ' + f.value.trim()); });
    [].forEach.call(form.querySelectorAll('section.step'), function (sec) {
      if (sec.id === 'etape-5' && !includeStep5) return;
      var block = [], lastTitle = null;
      [].forEach.call(sec.querySelectorAll('[data-key]'), function (el) {
        var v = textValue(el).trim();
        if (!v) return;
        var row = el.closest('.frow');
        var title = '';
        if (row) {
          var tt = row.querySelector('.frow-title'), strong = tt.querySelector('strong'), sub = tt.querySelector('span');
          title = strong.textContent.trim() + (sub ? ' (' + sub.textContent.trim() + ')' : '');
        }
        if (title && title !== lastTitle) { block.push('', '— ' + title); lastTitle = title; }
        else if (!title && lastTitle !== '') { block.push(''); lastTitle = ''; }
        block.push('  ' + labelOf(el) + ' : ' + v.replace(/\n/g, '\n    '));
      });
      if (block.length) { out.push('', '=== ' + sec.querySelector('h2').textContent.replace(/\s+/g, ' ').trim() + ' ==='); out = out.concat(block); }
    });
    return out.join('\n') + '\n';
  }
  function buildJson(includeStep5) {
    var all = collect(), keep = {};
    Object.keys(all).forEach(function (k) { if (includeStep5 || k.indexOf('s5.') !== 0) keep[k] = all[k]; });
    return JSON.stringify({ app: 'orvane-priorites', v: 1, exportedAt: new Date().toISOString(), fields: keep }, null, 2);
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 600);
  }
  function fileName(ext) {
    var d = new Date();
    var g = ((form.querySelector('[data-key="g.groupe"]') || {}).value || '').trim().replace(/[^A-Za-z0-9\-]+/g, '-').slice(0, 20);
    return 'fiche-priorites-' + (g ? 'groupe-' + g : 'sans-groupe') + '-' + d.getFullYear() + two(d.getMonth() + 1) + two(d.getDate()) + '-' + two(d.getHours()) + two(d.getMinutes()) + '.' + ext;
  }
  function runExport(format, includeStep5) {
    if (format === 'txt') download(fileName('txt'), buildText(includeStep5), 'text/plain');
    else download(fileName('json'), buildJson(includeStep5), 'application/json');
    lastExport = Date.now(); lsSet(EXPORTED, String(lastExport)); dirtySinceExport = false; checkReminder();
    flash('Export créé à ' + hhmm(new Date()) + '. Gardez le fichier : il vous permet de reprendre votre travail.');
  }

  var expDlg = document.getElementById('export-dialog');
  var fmtRadios = [].slice.call(expDlg.querySelectorAll('input[name="fmt"]'));
  var inc5 = document.getElementById('inc5');
  fmtRadios.forEach(function (r) { r.addEventListener('change', function () { inc5.checked = (r.value === 'json' && r.checked); }); });
  document.getElementById('btn-export').addEventListener('click', function () {
    if (typeof expDlg.showModal === 'function') expDlg.showModal(); else runExport('json', true);
  });
  expDlg.addEventListener('close', function () {
    if (expDlg.returnValue !== 'ok') return;
    var fmt = (fmtRadios.filter(function (r) { return r.checked; })[0] || {}).value || 'json';
    runExport(fmt, inc5.checked);
  });

  /* ----- Import ----- */
  var askDlg = document.getElementById('ask-dialog'), askAction = null;
  function ask(title, msg, ok, fn) {
    document.getElementById('ask-title').textContent = title;
    document.getElementById('ask-msg').textContent = msg;
    document.getElementById('ask-ok').textContent = ok;
    askAction = fn;
    if (typeof askDlg.showModal === 'function') askDlg.showModal(); else if (window.confirm(msg)) fn();
  }
  askDlg.addEventListener('close', function () { if (askDlg.returnValue === 'ok' && askAction) askAction(); askAction = null; });

  var fileInput = document.getElementById('import-file');
  document.getElementById('btn-import').addEventListener('click', function () { fileInput.value = ''; fileInput.click(); });
  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var data = null;
      try { data = JSON.parse(String(reader.result)); } catch (e) { data = null; }
      if (!data || data.app !== 'orvane-priorites' || typeof data.fields !== 'object') {
        flash('Fichier non reconnu : choisissez un fichier .json exporté depuis cette fiche.', 'error'); return;
      }
      function doImport() { clearTimeout(timer); applyValues(data.fields); save(); flash('Réponses importées à ' + hhmm(new Date()) + '.'); }
      if (hasAnswers()) ask('Remplacer vos réponses ?', 'Les réponses actuelles de cette fiche seront remplacées par celles du fichier.', 'Remplacer', doImport);
      else doImport();
    };
    reader.readAsText(file);
  });

  /* ----- Effacer ----- */
  document.getElementById('btn-clear').addEventListener('click', function () {
    ask('Effacer toutes vos réponses ?', 'Les réponses enregistrées sur cet appareil seront supprimées. Pensez à exporter avant.', 'Tout effacer', function () {
      clearTimeout(timer); timer = null;
      fields.forEach(function (f) { f.value = ''; });
      lsDel(STORE); dirtySinceExport = false; firstEdit = 0; growAll(); updateProgress(); checkReminder();
      flash('Fiche vide. Rien n’est enregistré tant que vous n’écrivez pas.');
    });
  });

  window.OrvaneFiche = { checkReminder: checkReminder, collect: collect, buildText: buildText, buildJson: buildJson, applyValues: applyValues };
})();
