(function () {
  /* ─── CATALOGS (SIFI) ─── */
  /* TODO: reemplazar por los catálogos reales GEMSAUXI / GEMSBACO / GEMSTPBA cuando el servicio esté disponible. */
  var GEMSAUXI = [['CC','Cédula de ciudadanía'],['CE','Cédula de extranjería'],['NIT','NIT'],['PA','Pasaporte'],['TI','Tarjeta de identidad'],['PPT','Permiso por protección temporal'],['NE','Nit extranjería']];
  var GEMSBACO = [['1001','Banco de Bogotá'],['1002','Banco Popular'],['1007','Bancolombia'],['1013','BBVA Colombia'],['1019','Scotiabank Colpatria'],['1023','Banco de Occidente'],['1032','Banco Caja Social'],['1040','Banco Agrario'],['1051','Davivienda'],['1052','Banco AV Villas'],['1060','Banco Pichincha'],['1062','Banco Falabella'],['1066','Banco Cooperativo Coopcentral'],['1507','Nequi'],['1551','Daviplata']];
  var GEMSTPBA = [['AH','Ahorros'],['CC','Corriente'],['DE','Depósito electrónico']];

  /* ─── MOCK DATA ─── */
  /* TODO: eliminar cuando consultarGiro() apunte al BUS. */
  var MOCK_DB = [
    { tipoId: 'CC', numId: '1144056789', banco: '1007', tipoCta: 'AH', cuenta: '45612378901', valor: '3850000.00', fecha: '2026-09-15',
      rows: [
        { fecha: '2026-09-15', op: 'OC-2026-0918342', idTit: '900487215', tipoTit: 'NIT', nomTit: 'Constructora Altos del Lago S.A.S.', idBen: '1144056789', nomBen: 'Laura Marcela Ríos Patiño', valor: 3850000, tipoCli: 'Fideicomiso inmobiliario', nomCli: 'Fideicomiso Torres del Río – Etapa 2' },
        { fecha: '2026-09-15', op: 'OC-2026-0918517', idTit: 'SIFI-0045213', tipoTit: 'Código SIFI', nomTit: 'Inversiones Valle Verde Ltda.', idBen: '1144056789', nomBen: 'Laura Marcela Ríos Patiño', valor: 3850000, tipoCli: 'Encargo fiduciario', nomCli: 'Encargo de administración y pagos 3317' },
        { fecha: '2026-09-15', op: 'OC-2026-0918790', idTit: '901233870', tipoTit: 'NIT', nomTit: 'Concesionaria Vial Andina S.A.S.', idBen: '1144056789', nomBen: 'Laura Marcela Ríos Patiño', valor: 3850000, tipoCli: 'Patrimonio autónomo', nomCli: 'P.A. Recaudo Peajes Corredor Sur' }
      ] }
  ];

  var FIELDS = ['tipoId','numId','banco','tipoCta','cuenta','valor','fecha'];
  var VIEW_KEY = 'pr-giros-vista';
  var ICON_CARDS = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="1.5" width="5.5" height="5.5" fill="none" stroke="currentColor" stroke-width="1.5"></rect><rect x="9" y="1.5" width="5.5" height="5.5" fill="none" stroke="currentColor" stroke-width="1.5"></rect><rect x="1.5" y="9" width="5.5" height="5.5" fill="none" stroke="currentColor" stroke-width="1.5"></rect><rect x="9" y="9" width="5.5" height="5.5" fill="none" stroke="currentColor" stroke-width="1.5"></rect></svg>';
  var ICON_BACK = '<svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true"><path d="M18.3223 8.33329H5.68274L11.1782 2.85447C11.4918 2.54089 11.668 2.11558 11.668 1.67211C11.668 1.22864 11.4918 0.80333 11.1782 0.489749C10.8646 0.176168 10.4393 0 9.99585 0C9.55238 0 9.12707 0.176168 8.81349 0.489749L0.487022 8.81622C0.335412 8.9746 0.216568 9.16135 0.13731 9.36577C-0.0292497 9.7712 -0.0292497 10.226 0.13731 10.6314C0.216568 10.8358 0.335412 11.0226 0.487022 11.1809L8.81349 19.5074C8.9683 19.6635 9.15249 19.7874 9.35542 19.8719C9.55835 19.9565 9.77601 20 9.99585 20C10.2157 20 10.4334 19.9565 10.6363 19.8719C10.8392 19.7874 11.0234 19.6635 11.1782 19.5074C11.3343 19.3526 11.4582 19.1684 11.5427 18.9655C11.6273 18.7626 11.6708 18.5449 11.6708 18.3251C11.6708 18.1052 11.6273 17.8875 11.5427 17.6846C11.4582 17.4817 11.3343 17.2975 11.1782 17.1427L5.68274 11.6639H18.3223C18.764 11.6639 19.1876 11.4884 19.4999 11.1761C19.8122 10.8638 19.9876 10.4402 19.9876 9.99858C19.9876 9.55692 19.8122 9.13334 19.4999 8.82104C19.1876 8.50874 18.764 8.33329 18.3223 8.33329Z" fill="currentColor"></path></svg>';
  var ICON_TABLE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 2.5h13M1.5 6.5h13M1.5 10.5h13M1.5 14h13" stroke="currentColor" stroke-width="1.5" fill="none"></path></svg>';

  /* ─── DOM ─── */
  function $(id) { return document.getElementById('pr-' + id); }
  if (!$('form')) return;

  var timers = [];
  var view = 'cards';
  try { var saved = localStorage.getItem(VIEW_KEY); if (saved === 'table' || saved === 'cards') view = saved; } catch (e) {}

  /* ─── PURE HELPERS ─── */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function desc(list, code) {
    for (var i = 0; i < list.length; i++) if (list[i][0] === code) return list[i][1];
    return '';
  }
  function cop(n)      { return '$ ' + n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtId(n)    { return Number(n).toLocaleString('es-CO'); }
  function fmtDate(s)  { var p = s.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function ddmmyyyy(s) { var p = s.split('-'); return p[2] + p[1] + p[0]; }
  function fmtTitId(r) { return /^\d+$/.test(r.idTit) ? fmtId(r.idTit) : r.idTit; }
  function plural(n, one, many) { return n > 1 ? many : one; }

  /* ─── CATALOG FILL ─── */
  function fill(id, list, fmt) {
    var sel = $(id);
    list.forEach(function (item) { sel.add(new Option(fmt ? fmt(item[0], item[1]) : item[1], item[0])); });
  }
  fill('tipoId', GEMSAUXI);
  fill('banco', GEMSBACO);
  fill('tipoCta', GEMSTPBA, function (c, d) { return c + ' – ' + d; });

  var today = new Date();
  $('fecha').max = new Date(today.getTime() - today.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

  /* ─── HINTS ─── */
  var HINTS = {};
  FIELDS.forEach(function (id) { HINTS[id] = fieldOf(id).querySelector('.pr-hint').innerHTML; });

  function fieldOf(id) { return $(id).closest('.pr-f'); }

  function resetHint(id) {
    var f = fieldOf(id);
    f.classList.remove('pr-invalid');
    f.querySelector('.pr-hint').innerHTML = HINTS[id];
  }

  var flashTimer;
  function flash(id, msg) {
    fieldOf(id).querySelector('.pr-hint').innerHTML = '<b>' + esc(msg) + '</b>';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { resetHint(id); }, 2600);
  }

  function valorHint() {
    var v = $('valor').value;
    var f = fieldOf('valor');
    f.classList.remove('pr-invalid');
    f.querySelector('.pr-hint').innerHTML = HINTS.valor + (v && !isNaN(+v) && +v > 0
      ? '<br>Así lo leemos: <b class="pr-num">' + cop(+v) + '</b>'
      : '');
  }

  /* ─── LIVE SANITIZING ─── */
  $('numId').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, ''); });

  $('cuenta').addEventListener('input', function (e) {
    var v = e.target.value;
    var clean = v.replace(/[^a-zA-Z0-9]/g, '');
    if (v !== clean) {
      e.target.value = clean;
      flash('cuenta', 'Quitamos los caracteres especiales. Solo se aceptan letras y números.');
    } else {
      resetHint('cuenta');
    }
  });

  $('valor').addEventListener('input', function (e) {
    var v = e.target.value.replace(/,/g, '.').replace(/[^\d.]/g, '');
    var parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    parts = v.split('.');
    if (parts[1] !== undefined) v = parts[0] + '.' + parts[1].slice(0, 2);
    e.target.value = v;
    valorHint();
  });

  ['tipoId','banco','tipoCta','fecha','numId'].forEach(function (id) {
    $(id).addEventListener('change', function () { resetHint(id); });
  });
  $('human').addEventListener('change', function () { $('verify').classList.remove('pr-invalid'); });

  /* ─── VALIDATION ─── */
  var RULES = {
    tipoId:  function (v) { return v ? '' : 'Seleccione el tipo de identificación.'; },
    numId:   function (v) { return !v ? 'Ingrese el número de identificación.' : v.length < 5 ? 'El número parece incompleto.' : ''; },
    banco:   function (v) { return v ? '' : 'Seleccione el banco donde recibió el dinero.'; },
    tipoCta: function (v) { return v ? '' : 'Seleccione el tipo de cuenta.'; },
    cuenta:  function (v) { return !v ? 'Ingrese el número de cuenta.' : v.length < 4 ? 'El número de cuenta parece incompleto.' : ''; },
    valor:   function (v) { return !v ? 'Ingrese el valor recibido.' : (!/^\d+(\.\d{1,2})?$/.test(v) || +v <= 0) ? 'Escriba un valor válido, por ejemplo 3850000.00' : ''; },
    fecha:   function (v) { return !v ? 'Seleccione la fecha de la operación.' : v > $('fecha').max ? 'La fecha no puede ser posterior a hoy.' : ''; }
  };

  function validate() {
    var bad = [];
    FIELDS.forEach(function (id) {
      var msg = RULES[id]($(id).value.trim());
      var f = fieldOf(id);
      if (msg) {
        f.classList.add('pr-invalid');
        f.querySelector('.pr-hint').textContent = msg;
        bad.push(id);
      } else if (f.classList.contains('pr-invalid')) {
        resetHint(id);
      }
    });
    if (!$('human').checked) {
      $('verify').classList.add('pr-invalid');
      bad.push('human');
    }

    var alert = $('form-alert');
    if (bad.length) {
      var nFields = bad.filter(function (b) { return b !== 'human'; }).length;
      var needsHuman = bad.indexOf('human') !== -1;
      alert.textContent = nFields === 0
        ? 'Confirme la verificación de seguridad para continuar.'
        : 'Revise los ' + nFields + ' campos marcados' + (needsHuman ? ' y confirme la verificación de seguridad.' : '.');
      alert.classList.add('pr-show');
      $(bad[0]).focus();
    } else {
      alert.classList.remove('pr-show');
    }
    return !bad.length;
  }

  /* ─── PAYLOAD / SERVICE ─── */
  function buildPayload() {
    return {
      tipoIdentificacion:   $('tipoId').value,
      numeroIdentificacion: Number($('numId').value),
      codigoBanco:          $('banco').value,
      tipoCuenta:           $('tipoCta').value,
      cuentaBancaria:       $('cuenta').value,
      valor:                Number($('valor').value).toFixed(2),
      fecha:                ddmmyyyy($('fecha').value)
    };
  }

  /* TODO: reemplazar por la llamada real al BUS (POST /bus/sifi/giros/ordenante) y mapear la respuesta a este formato de filas. */
  function consultarGiro(p) {
    return new Promise(function (resolve) {
      var hit = MOCK_DB.filter(function (r) {
        return r.tipoId === p.tipoIdentificacion &&
          r.numId === String(p.numeroIdentificacion) &&
          r.banco === p.codigoBanco &&
          r.tipoCta === p.tipoCuenta &&
          r.cuenta.toUpperCase() === p.cuentaBancaria.toUpperCase() &&
          Number(r.valor) === Number(p.valor) &&
          ddmmyyyy(r.fecha) === p.fecha;
      })[0];
      resolve(hit ? hit.rows : []);
    });
  }

  /* ─── STAGE: form → loader → results ─── */
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function show(which) {
    $('form').hidden = which !== 'form';
    $('loader').hidden = which !== 'loader';
    $('results').hidden = which !== 'results';

    var current = which === 'form' ? 1 : 2;
    document.querySelectorAll('#pr-stepper li').forEach(function (li) {
      var n = +li.dataset.step;
      li.classList.toggle('on', n === current);
      li.classList.toggle('done', n < current);
      if (n === current) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });

    var stage = $('stage');
    if (stage.getBoundingClientRect().top < 0) stage.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (which === 'results') {
      var h = $('results').querySelector('h3');
      if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    }
  }

  function goForm(focusId) {
    clearTimers();
    show('form');
    if (focusId) $(focusId).focus({ preventScroll: true });
  }

  function runLoader() {
    var lis = [].slice.call(document.querySelectorAll('#pr-ld-steps li'));
    function step(k) {
      lis.forEach(function (l, j) { l.className = j < k ? 'ok' : j === k ? 'act' : ''; });
      $('ld-bar').style.width = Math.round(k / lis.length * 100) + '%';
    }
    lis.forEach(function (l) { l.className = ''; });
    $('ld-bar').style.width = '0';
    step(0);
    timers.push(setTimeout(function () { step(1); }, 700), setTimeout(function () { step(2); }, 1700), setTimeout(function () { step(3); }, 2300));
    return new Promise(function (resolve) { timers.push(setTimeout(resolve, 2700)); });
  }

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    var p = buildPayload();
    var t0 = performance.now();
    clearTimers();
    show('loader');

    Promise.all([consultarGiro(p), runLoader()]).then(function (res) {
      if ($('loader').hidden) return; /* user navigated away */
      render(p, res[0], Math.round(performance.now() - t0));
      show('results');
    });
  });

  /* ─── RESULTS VIEW ─── */
  function setView(v) {
    view = v;
    try { localStorage.setItem(VIEW_KEY, v); } catch (e) {}
    var c = $('v-cards'), t = $('v-table');
    if (!c || !t) return;
    c.hidden = v !== 'cards';
    t.hidden = v !== 'table';
    $('results').querySelectorAll('.pr-viewsw button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.view === v); });
    var hint = $('v-hint');
    if (hint) hint.textContent = tableHint(v);
  }

  function tableHint(v) { return v === 'table' ? 'Deslice la tabla hacia los lados para ver todas las columnas.' : ''; }

  function navHtml() {
    return '<div class="pr-res-nav"><button type="button" class="pr-back" data-act="back">' + ICON_BACK + 'Modificar datos</button>' +
      '<button type="button" class="pr-btn-sec pr-btn-new" data-act="new">Nueva consulta</button></div>';
  }

  function renderEmpty(p, tipo) {
    var echo = [
      tipo + ' ' + fmtId(p.numeroIdentificacion),
      desc(GEMSBACO, p.codigoBanco),
      desc(GEMSTPBA, p.tipoCuenta) + ' ' + p.cuentaBancaria,
      cop(+p.valor),
      fmtDate($('fecha').value)
    ].map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('');

    return navHtml() +
      '<div class="pr-res-head"><div><p class="pr-eyebrow">Paso 2 de 2 · Resultado</p><h3>Sin operaciones para estos datos</h3></div></div>' +
      '<div class="pr-card pr-empty"><div class="pr-ic" aria-hidden="true">!</div><div>' +
        '<h4>No encontramos giros que coincidan</h4>' +
        '<p>Buscamos un pago con exactamente estos datos y no hubo coincidencias. Un solo dígito o un centavo de diferencia cambia el resultado.</p>' +
        '<div class="pr-echo">' + echo + '</div>' +
        '<ul><li><b>Valor:</b> compárelo con el extracto, incluidos los centavos.</li>' +
        '<li><b>Fecha:</b> use la del abono; los pagos del viernes pueden aparecer el lunes.</li>' +
        '<li><b>Cuenta:</b> verifique que sea la cuenta que recibió el dinero, sin ceros de más.</li></ul>' +
        '<div class="pr-btns"><button class="pr-btn-cta" type="button" data-act="edit">Corregir datos</button></div>' +
      '</div></div>';
  }

  function cardHtml(r) {
    return '<article class="pr-rcard">' +
      '<div class="pr-rc-label"><b>' + esc(r.tipoCli) + '</b></div>' +
      '<h4 class="pr-rc-title">' + esc(r.nomTit) + '</h4>' +
      '<div class="pr-rc-titleid">' + esc(r.tipoTit) + ' <b>' + esc(fmtTitId(r)) + '</b></div>' +
      '<div class="pr-rc-metrics">' +
        '<div><span class="pr-v pr-lg">' + cop(r.valor) + '</span><span class="pr-k">Valor del giro</span></div>' +
        '<div><span class="pr-v">' + fmtDate(r.fecha) + '</span><span class="pr-k">Fecha giro</span></div>' +
        '<div><span class="pr-v pr-op">' + esc(r.op) + '</span><span class="pr-k">Operación de caja</span></div>' +
      '</div>' +
      '<div class="pr-rc-body">' +
        '<div class="pr-rc-f"><span class="pr-k">Cliente asociado</span><span class="pr-v">' + esc(r.nomCli) + '</span><span class="pr-sub">' + esc(r.tipoCli) + '</span></div>' +
      '</div>' +
    '</article>';
  }

  function rowHtml(r) {
    return '<tr><td class="pr-mono">' + fmtDate(r.fecha) + '</td>' +
      '<td class="pr-mono">' + esc(r.op) + '</td>' +
      '<td class="pr-mono">' + esc(fmtTitId(r)) + '<span class="pr-sub">' + esc(r.tipoTit) + '</span></td>' +
      '<td><span class="pr-strong">' + esc(r.nomTit) + '</span></td>' +
      '<td class="pr-r">' + cop(r.valor) + '</td>' +
      '<td><span class="pr-tag">' + esc(r.tipoCli) + '</span></td>' +
      '<td>' + esc(r.nomCli) + '</td></tr>';
  }

  function renderFound(p, rows, tipo, ms) {
    var n = rows.length;
    var stamp = 'Respuesta en ' + (ms / 1000).toFixed(1).replace('.', ',') + ' s · ' +
      new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

    return navHtml() +
      '<div class="pr-res-head"><div><p class="pr-eyebrow">Paso 2 de 2 · Resultado</p><h3>Ordenante del giro</h3></div></div>' +
      '<div class="pr-card pr-summary">' +
        '<div class="pr-first"><div class="pr-k">Beneficiario</div><div class="pr-v pr-name">' + esc(rows[0].nomBen) + '</div>' +
          '<div class="pr-first-id pr-num">' + esc(tipo) + ' <b>' + fmtId(p.numeroIdentificacion) + '</b></div></div>' +
        '<div><div class="pr-k">Fecha del giro</div><div class="pr-v pr-num">' + fmtDate(rows[0].fecha) + '</div></div>' +
      '</div>' +
      '<div class="pr-res-tools"><span class="pr-count">Mostrando <b>' + n + '</b> ' + plural(n, 'fila', 'filas') + '</span>' +
        '<div class="pr-viewsw" role="group" aria-label="Cambiar vista de resultados">' +
          '<button type="button" data-view="cards" aria-pressed="' + (view === 'cards') + '">' + ICON_CARDS + 'Tarjetas</button>' +
          '<button type="button" data-view="table" aria-pressed="' + (view === 'table') + '">' + ICON_TABLE + 'Tabla</button>' +
        '</div></div>' +
      '<div class="pr-cards" id="pr-v-cards"' + (view === 'cards' ? '' : ' hidden') + '>' +
        rows.map(cardHtml).join('') +
      '</div>' +
      '<div class="pr-card" id="pr-v-table"' + (view === 'table' ? '' : ' hidden') + '><div class="pr-tbl-wrap"><table class="pr-table">' +
        '<thead><tr><th>Fecha giro</th><th>Operación de caja</th><th>ID titular</th><th>Nombre titular</th><th class="pr-r">Valor</th><th>Tipo cliente asociado</th><th>Nombre cliente asociado</th></tr></thead>' +
        '<tbody>' + rows.map(rowHtml).join('') + '</tbody>' +
      '</table></div></div>' +
      '<div class="pr-res-foot"><span>' + stamp + '</span><span id="pr-v-hint">' + tableHint(view) + '</span></div>';
  }

  function render(p, rows, ms) {
    var sec = $('results');
    var tipo = desc(GEMSAUXI, p.tipoIdentificacion);

    sec.innerHTML = rows.length ? renderFound(p, rows, tipo, ms) : renderEmpty(p, tipo);

    sec.querySelectorAll('.pr-viewsw button').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.dataset.view); });
    });

    var edit = sec.querySelector('[data-act="edit"]');
    if (edit) edit.addEventListener('click', function () { goForm('valor'); });
    sec.querySelector('[data-act="back"]').addEventListener('click', function () { goForm('tipoId'); });
    sec.querySelector('[data-act="new"]').addEventListener('click', function () { setForm({}); goForm('tipoId'); });
  }

  /* ─── RESET ─── */
  function setForm(v) {
    FIELDS.forEach(function (k) { $(k).value = v[k] || ''; resetHint(k); });
    valorHint();
    $('human').checked = false;
    $('verify').classList.remove('pr-invalid');
    $('form-alert').classList.remove('pr-show');
  }

  $('clear').addEventListener('click', function () { setForm({}); $('tipoId').focus(); });
})();
