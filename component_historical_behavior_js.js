(function () {
  /* ─── CONSTANTS ─── */
  var renderStablePortfolio = [
    { key: 'unitValue', label: 'Valor Unidad',  format: 'currency' },
    { key: 'fundValue', label: 'VALOR FONDO',   format: 'currency' },
    { key: 'date',      label: 'Fecha',         format: 'date'     }
  ];
  var renderStablePortfolioPV = [
    { key: 'fundValue', label: 'VALOR FONDO',    format: 'currency' },
    { key: 'date',      label: 'Fecha',         format: 'date'     }
  ];
  var tableHeaders = ['Participación','Año Corrido','Diaria','Mensual','Semestral','Último Año','Últimos 2 Años','Últimos 3 Años'];
  var colKeys      = ['yearToDate','return1','return30','return180','return365','return730','return1095'];
  var defaultSort  = 'order';
  var defaultSortLabel = 'Destacados Alianza';

  /* ─── LIQUID DATA ─── */
  var dataLista = {{ dataList | json }};
  var pTypes    = {{ participationTypes | json }};

  /* ─── SHARED MODAL ─── */
  var elModal        = document.querySelector('#hb-modal');
  var elModalSub     = document.querySelector('#hb-modal-subtitle');
  var elModalTitle   = document.querySelector('#hb-modal-title');
  var elModalContent = document.querySelector('#hb-modal-content');
  var elModalTopMetrics = document.querySelector('#hb-modal-top-metrics');

  /* ─── PURE HELPERS ─── */
  function num(v)        { return parseFloat(v) || 0; }
  function hasVal(v)     { return v !== null && v !== undefined && v !== ''; }
  function esc(v)        { return String(v == null ? '' : v); }

  function metricCls(v) {
    var n = num(v);
    if (!hasVal(v) || isNaN(parseFloat(v))) return 'hb-metric-neutral';
    if (n > 0) return 'hb-metric-positive';
    if (n < 0) return 'hb-metric-negative';
    return 'hb-metric-neutral';
  }

  function fmtMetric(v, row) {
    var n = num(v);
    if (!hasVal(v) || isNaN(parseFloat(v))) return 'N.A';
    if (n === 0) return (row && row['Cambiar cero']) ? 'N.A' : '0.00';
    return n.toFixed(2);
  }

  function fmtSummary(v, fmt) {
    if (!hasVal(v)) return 'N.A';
    if (fmt === 'currency') {
      var raw = parseFloat(v);
      if (isNaN(raw)) return esc(v);
      return raw.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (fmt === 'date') {
      var s = esc(v).trim();
      if (!s) return 'N.A';
      return s.split('T')[0].split(' ')[0];
    }
    return esc(v);
  }

  function rendBand(r) {
    var n = num(r.yearToDate);
    if (n < 0)  return 'negativo';
    if (n < 5)  return 'bajo';
    if (n < 15) return 'medio';
    return 'alto';
  }

  function trendBand(r) {
    if (!hasVal(r.return180) || !hasVal(r.return365)) return 'estable';
    var d = num(r.return180) - num(r.return365);
    if (d > 0.5)  return 'alza';
    if (d < -0.5) return 'caida';
    return 'estable';
  }

  function isEmptyRow(u) {
    return colKeys.every(function(k) { return num(u[k]) === 0; });
  }

  function normalizeKey(v) {
    return esc(v).trim().toLowerCase().replace(/[\s._-]+/g, '');
  }

  function sameCode(a, b) {
    if (!hasVal(a) || !hasVal(b)) return false;
    return normalizeKey(a) === normalizeKey(b);
  }

  function getFieldAny(obj, keys) {
    if (!obj) return '';
    for (var i = 0; i < keys.length; i++) {
      if (hasVal(obj[keys[i]])) return obj[keys[i]];
    }
    var keyMap = {};
    Object.keys(obj).forEach(function(k) { keyMap[normalizeKey(k)] = k; });
    for (var j = 0; j < keys.length; j++) {
      var mk = keyMap[normalizeKey(keys[j])];
      if (mk && hasVal(obj[mk])) return obj[mk];
    }
    return '';
  }

  function buildParticipationMap(currentFund) {
    var map = {};
    if (!currentFund) return map;

    /* Build lookup of participation types by UUID */
    var pTypeByUuid = {};
    if (pTypes) {
      pTypes.forEach(function(pt) {
        if (pt && pt.meta && pt.meta.uuid) {
          pTypeByUuid[pt.meta.uuid] = pt;
        }
      });
    }

    /* Get the fund's participation entries — each has config flags + a UUID ref */
    var tiposField = currentFund.fields && currentFund.fields['Tipos de participación'];
    var entries = (tiposField && tiposField.fields) ? tiposField.fields : [];
    if (!Array.isArray(entries)) entries = [];

    entries.forEach(function(entry) {
      var ref = entry['Tipo de participación'];
      if (!ref || !ref.uuid) return;

      var pt = pTypeByUuid[ref.uuid];
      if (!pt) return;

      var ptFields = pt.fields || {};
      var uid = getFieldAny(ptFields, ['UnitId', 'Unit ID', 'unitId']);
      if (!hasVal(uid) && pt.meta) uid = String(pt.meta.uuid);
      if (!hasVal(uid)) return;

      var cfg = {
        useAlias:    !!ptFields['Usar alias general'],
        alias:       ptFields['Nombre'] || '',
        order:       parseInt(entry['Orden Participación']) || 999,
        hideOnZero:  !!entry['Ocultar fila en ceros'],
        disabled:    !!entry['Desactivar fila'],
        changeZero:  !!entry['Cambiar cero'],
        fundType:    getFieldAny(ptFields, ['Tipo de fondo', 'Tipo de Fondo']) || '',
        riskProfile: getFieldAny(ptFields, ['Perfil de riesgo', 'Perfil de Riesgo']) || ''
      };

      map[uid]                   = cfg;
      map[esc(uid).trim()]       = cfg;
      map[normalizeKey(uid)]     = cfg;
    });

    return map;
  }

  function normalizeRows(data, currentFund) {
    function normalizeTag(v) {
      return esc(v).trim().toLowerCase();
    }

    function getTagValue(source, keys) {
      for (var i = 0; i < keys.length; i++) {
        if (hasVal(source[keys[i]])) return normalizeTag(source[keys[i]]);
      }
      return '';
    }

    function normalizeRiskTag(v) {
      var tag = normalizeTag(v);
      if (!tag) return '';
      if (tag.indexOf('conserv') !== -1 || tag.indexOf('bajo') !== -1 || tag.indexOf('1') === 0) return 'conservador';
      if (tag.indexOf('moder') !== -1 || tag.indexOf('medio') !== -1 || tag.indexOf('2') === 0) return 'moderado';
      if (tag.indexOf('mayor') !== -1 || tag.indexOf('alto') !== -1 || tag.indexOf('agres') !== -1 || tag.indexOf('3') === 0) return 'mayor';
      return tag;
    }

    function normalizeClaseTag(v) {
      var tag = normalizeTag(v);
      if (!tag) return '';
      if (tag.indexOf('abier') !== -1) return 'abierto';
      if (tag.indexOf('cerr') !== -1) return 'cerrado';
      return tag;
    }

    function claseLabelFromTag(tag) {
      if (tag === 'abierto') return 'Abierto';
      if (tag === 'cerrado') return 'Cerrado';
      return '';
    }

    function getClaseLabelFromTag(tag, u, cfg, fallbackFundType) {
      var mapped = claseLabelFromTag(tag);
      if (mapped) return mapped;
      var raw = getFieldAny(u, ['portfolioClass', 'portfolio_class', 'clase', 'class', 'fundClass', 'tipoClase', 'Tipo de fondo', 'Tipo de Fondo']) || cfg.fundType || fallbackFundType;
      if (hasVal(raw)) return esc(raw).trim();
      return 'Sin clase';
    }

    function getClaseTag(u, cfg, fallbackFundType) {
      // New API returns class per unit in `portfolioClass` (Abierto/Cerrado).
      var unitClassTag = normalizeClaseTag(getTagValue(u, ['portfolioClass', 'portfolio_class']));
      if (unitClassTag) return unitClassTag;
      var tag = normalizeClaseTag(cfg.fundType);
      if (tag) return tag;
      tag = normalizeClaseTag(fallbackFundType);
      if (tag) return tag;
      tag = normalizeClaseTag(getTagValue(u, ['clase', 'class', 'fundClass', 'tipoClase', 'Tipo de fondo']));
      if (tag) return tag;
      if (u.isClosed === true || u.cerrado === true) return 'cerrado';
      if (u.isClosed === false || u.cerrado === false) return 'abierto';
      return '';
    }

    var map  = buildParticipationMap(currentFund);
    var fundFields = (currentFund && currentFund.fields) ? currentFund.fields : {};
    var fallbackFundType = getFieldAny(fundFields, ['Tipo de fondo', 'Tipo de Fondo']);
    var fallbackRiskProfile = getFieldAny(fundFields, ['Perfil de riesgo', 'Perfil de Riesgo']);

    function getUnitIdRaw(u) {
      if (hasVal(u.unitId)) return u.unitId;
      if (hasVal(u.UnitId)) return u.UnitId;
      return '';
    }

    function getCfgByUnitId(unitIdRaw) {
      return map[unitIdRaw] || map[esc(unitIdRaw).trim()] || map[normalizeKey(unitIdRaw)] || {};
    }

    function getRiskTag(u, cfg) {
      var rawRisk = cfg.riskProfile || getTagValue(u, ['riesgo', 'risk', 'riskLevel', 'nivelRiesgo', 'riskType', 'Perfil de riesgo']) || fallbackRiskProfile;
      return normalizeRiskTag(rawRisk);
    }

    var units = (data && data.units) || [];
    var rows = units.map(function(u) {
      var unitIdRaw = getUnitIdRaw(u);
      var cfg = getCfgByUnitId(unitIdRaw);
      if (cfg.disabled) return null;
      if (cfg.hideOnZero && isEmptyRow(u)) return null;
      var name = (cfg.useAlias && cfg.alias) ? cfg.alias : (u.unitName || unitIdRaw);
      var claseTag = getClaseTag(u, cfg, fallbackFundType);
      var claseLabel = getClaseLabelFromTag(claseTag, u, cfg, fallbackFundType);
      return Object.assign({}, u, {
        unitId: unitIdRaw,
        displayName: name,
        order:       cfg.order || 999,
        'Cambiar cero': cfg.changeZero,
        riskTag:   getRiskTag(u, cfg),
        claseTag:  claseTag,
        claseLabel: claseLabel,
        rendBand:  rendBand(u),
        trendBand: trendBand(u),
        searchTxt: name.toLowerCase()
      });
    }).filter(Boolean);
    rows.sort(function(a, b) { return a.order - b.order; });
    return rows;
  }

  function buildCompTable(items) {
    var periods = ['Año Corrido','Diaria','Mensual','Semestral','Último Año','Últimos 2 Años','Últimos 3 Años'];
    var hd = '<th>Período</th>' + items.map(function(it) {
      return '<th class="hb-th-fund">' + esc(it.displayName) + '</th>';
    }).join('');
    var bd = periods.map(function(period, i) {
      var key = colKeys[i];
      var cells = items.map(function(it) {
        return '<td class="' + metricCls(it[key]) + '">' + esc(fmtMetric(it[key], it)) + '</td>';
      }).join('');
      return '<tr><td>' + esc(period) + '</td>' + cells + '</tr>';
    }).join('');
    return '<table><thead><tr>' + hd + '</tr></thead><tbody>' + bd + '</tbody></table>';
  }

  function setModalTopMetrics(show, row) {
    if (!elModalTopMetrics) return;
    if (!show || !row) {
      elModalTopMetrics.classList.remove('is-visible');
      elModalTopMetrics.innerHTML = '';
      return;
    }
    var unitValue = hasVal(row.unitValue) ? esc(row.unitValue) : 'N.A';
    var fundValue = hasVal(row.fundValue) ? esc(row.fundValue) : 'N.A';
    elModalTopMetrics.innerHTML =
      '<div class="hb-modal-top-metric">' +
        '<span class="hb-modal-top-metric-label">Valor unidad</span>' +
        '<span class="hb-modal-top-metric-value">' + unitValue + '</span>' +
      '</div>' +
      '<div class="hb-modal-top-metric">' +
        '<span class="hb-modal-top-metric-label">VALOR FONDO</span>' +
        '<span class="hb-modal-top-metric-value">' + fundValue + '</span>' +
      '</div>';
    elModalTopMetrics.classList.add('is-visible');
  }

  /* ─── PANEL FACTORY ─── */
  function makePanelUI(pfx) {
    var state = {
      viewMode: 'cards',
      search:   '',
      filters:  { risk: null, clase: null },
      sort:     defaultSort,
      selected: new Set(),
      rows:     [],
      fund:     null,
      page:     1,
      pageSize: 20,
      hintDone: false,
      loaded:   false
    };

    function $(id)  { return document.querySelector('#' + pfx + '-' + id); }
    function $$(id) { return document.querySelectorAll('#hb-panel-' + pfx + ' ' + id); }

    var elGrid    = $('portfolio-grid');
    var elTable   = $('portfolio-table');
    var elPager   = $('hb-pagination');
    var elEmpty   = $('hb-empty');
    var elHint    = $('hb-hint');
    var elCmpBtn  = $('compare-btn');
    var elClrSel  = $('clear-selection');
    var elBadge   = $('selection-badge');
    var elCmpLbl  = $('compare-label');
    var elSearch  = $('search-input');
    var elSortLbl = $('sort-lbl');
    var elClrFlt  = $('clear-filters');
    var elFundData= $('fund-data');
    var elSelect  = $('select-fund');
    var elFundPickerSearch = $('fund-picker-search');
    var elFundPickerList   = $('fund-picker-list');
    var elViewCards = $('view-cards');
    var elViewTable = $('view-table');
    var elChipRiskLbl = $('chip-risk-lbl');
    var elChipClaseLbl = $('chip-clase-lbl');

    var FILTER_LABEL = { risk: 'Riesgo', clase: 'Clase' };
    var FILTER_VALUE_LABEL = {
      risk: { conservador: '1 - Conservador', moderado: '2 - Moderado', mayor: '3 - Mayor' },
      clase: { abierto: 'Abierto', cerrado: 'Cerrado' }
    };

    function updateFilterChipText() {
      if (elChipRiskLbl) {
        elChipRiskLbl.textContent = state.filters.risk
          ? FILTER_LABEL.risk + ': ' + (FILTER_VALUE_LABEL.risk[state.filters.risk] || state.filters.risk)
          : FILTER_LABEL.risk;
      }
      if (elChipClaseLbl) {
        elChipClaseLbl.textContent = state.filters.clase
          ? FILTER_LABEL.clase + ': ' + (FILTER_VALUE_LABEL.clase[state.filters.clase] || state.filters.clase)
          : FILTER_LABEL.clase;
      }
    }

    /* ── filtered rows ── */
    function filtered() {
      var rows = state.rows.slice();
      if (state.search) {
        var q = state.search;
        rows = rows.filter(function(r) { return r.searchTxt.indexOf(q) !== -1; });
      }
      if (state.filters.risk) {
        var rv = state.filters.risk;
        rows = rows.filter(function(r) { return r.riskTag === rv; });
      }
      if (state.filters.clase) {
        var cv = state.filters.clase;
        rows = rows.filter(function(r) { return r.claseTag === cv; });
      }
      rows.sort(function(a, b) {
        switch (state.sort) {
          case 'order': return num(a.order) - num(b.order);
          case 'ua-desc': return num(b.yearToDate) - num(a.yearToDate);
          case 'ua-asc':  return num(a.yearToDate) - num(b.yearToDate);
          case 'az': return a.displayName.localeCompare(b.displayName, 'es');
          case 'za': return b.displayName.localeCompare(a.displayName, 'es');
          default: return 0;
        }
      });
      return rows;
    }

    /* ── UI helpers ── */
    function updateSelUi() {
      var n = state.selected.size;
      if (elBadge)  { elBadge.textContent = n + ' seleccionado' + (n !== 1 ? 's' : ''); elBadge.classList.toggle('is-visible', n > 0); }
      if (elClrSel) elClrSel.classList.toggle('is-visible', n > 0);
      if (elCmpBtn) elCmpBtn.disabled = n < 2;
      if (elCmpLbl) elCmpLbl.textContent = n > 0 ? 'Comparar (' + n + ')' : 'Comparar';
    }

    function updateFltUi() {
      var has = !!(state.filters.risk || state.filters.clase || state.sort !== defaultSort);
      var cr = $('chip-risk'), ct = $('chip-clase'), cs = $('chip-sort');
      if (cr) cr.classList.toggle('has-filter', !!state.filters.risk);
      if (ct) ct.classList.toggle('has-filter', !!state.filters.clase);
      if (cs) cs.classList.toggle('has-filter', state.sort !== defaultSort);
      if (elClrFlt) elClrFlt.classList.toggle('is-visible', has);
    }

    function updateViewUi() {
      if (elViewCards) elViewCards.classList.toggle('active', state.viewMode === 'cards');
      if (elViewTable) elViewTable.classList.toggle('active', state.viewMode === 'table');
    }

    function hideHint() {
      if (!state.hintDone && elHint) { state.hintDone = true; elHint.classList.add('is-hidden'); }
    }

    function initFundPicker() {
      if (pfx !== 'f' || !elSelect || !elFundPickerList) return;

      var typeFilter = 'all';
      var sortOrder = 'asc';
      var elFundSort = document.getElementById('f-fund-sort');

      function normalizeType(v) {
        var t = esc(v).trim().toLowerCase();
        if (t.indexOf('abier') !== -1) return 'abierto';
        if (t.indexOf('cerr') !== -1) return 'cerrado';
        return t;
      }

      function sortFundItems() {
        var items = Array.from(elFundPickerList.querySelectorAll('.hb-fund-picker-item'));
        items.sort(function(a, b) {
          var nameA = esc(a.querySelector('.hb-fund-picker-item-name') && a.querySelector('.hb-fund-picker-item-name').textContent).toLowerCase();
          var nameB = esc(b.querySelector('.hb-fund-picker-item-name') && b.querySelector('.hb-fund-picker-item-name').textContent).toLowerCase();
          var cmp = nameA.localeCompare(nameB, 'es');
          return sortOrder === 'asc' ? cmp : -cmp;
        });
        items.forEach(function(item) {
          elFundPickerList.appendChild(item);
        });
      }

      function filterFundItems() {
        var q = elFundPickerSearch ? esc(elFundPickerSearch.value).trim().toLowerCase() : '';
        elFundPickerList.querySelectorAll('.hb-fund-picker-item').forEach(function(item) {
          var name = esc(item.querySelector('.hb-fund-picker-item-name') && item.querySelector('.hb-fund-picker-item-name').textContent).toLowerCase();
          var itemType = normalizeType(item.getAttribute('data-type'));
          var matchesSearch = !q || name.indexOf(q) !== -1;
          var matchesType = typeFilter === 'all' || itemType === typeFilter;
          item.classList.toggle('is-hidden', !(matchesSearch && matchesType));
        });
        sortFundItems();
      }

      function syncSelectedUi(code) {
        elFundPickerList.querySelectorAll('.hb-fund-picker-item').forEach(function(item) {
          var on = esc(item.getAttribute('data-code')) === esc(code);
          item.classList.toggle('is-selected', on);
          item.setAttribute('aria-selected', on ? 'true' : 'false');
        });
      }

      elFundPickerList.querySelectorAll('.hb-fund-picker-item').forEach(function(item) {
        item.addEventListener('click', function() {
          var code = item.getAttribute('data-code');
          if (!code || !elSelect) return;
          elSelect.value = code;
          syncSelectedUi(code);
          elSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });

      if (elFundPickerSearch) {
        elFundPickerSearch.addEventListener('input', filterFundItems);
      }

      if (elFundSort) {
        elFundSort.addEventListener('change', function() {
          sortOrder = elFundSort.value || 'asc';
          sortFundItems();
        });
      }

      var filterBtns = document.querySelectorAll('#hb-panel-' + pfx + ' .hb-fund-type-btn');
      filterBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          filterBtns.forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          typeFilter = btn.getAttribute('data-type') || 'all';
          filterFundItems();
        });
      });

      syncSelectedUi(elSelect.value);
      filterFundItems();
    }

    function resetState() {
      state.search = ''; state.filters = { risk: null, clase: null }; state.sort = defaultSort;
      state.selected = new Set(); state.page = 1; state.hintDone = false; state.viewMode = 'cards';
      if (elSearch)  elSearch.value = '';
      if (elSortLbl) elSortLbl.textContent = defaultSortLabel;
      document.querySelectorAll('#hb-panel-' + pfx + ' .hb-dd-item').forEach(function(el) { el.classList.remove('sel'); });
      var defaultSortEl = document.querySelector('#' + pfx + '-dd-sort .hb-dd-item[data-val="' + defaultSort + '"]');
      if (defaultSortEl) defaultSortEl.classList.add('sel');
      document.querySelectorAll('#hb-panel-' + pfx + ' .hb-chip').forEach(function(el) { el.classList.remove('has-filter'); });
      if (elHint) elHint.classList.remove('is-hidden');
      updateSelUi();
      updateFltUi();
      updateFilterChipText();
      updateViewUi();
    }

    /* ── card builder ── */
    function createCard(row) {
      var uid  = esc(row.unitId);
      var isSel = state.selected.has(row.unitId);
      var ua   = fmtMetric(row.return30, row);
      var r1   = fmtMetric(row.return1,  row);
      var uaCls = metricCls(row.return30);
      var r1Cls = metricCls(row.return1);
      var subtitle = pfx === 'f'
        ? (esc(row.unitId) + ' - Participación')
        : (esc(row.unitId) + ' - ' + esc(row.claseLabel));
      var art = document.createElement('article');
      art.className = 'hb-card' + (isSel ? ' is-selected' : '');
      art.setAttribute('tabindex', '0');
      art.setAttribute('role', 'button');
      art.setAttribute('data-uid', uid);
      art.innerHTML =
        '<button class="hb-card-check" type="button" aria-label="Seleccionar" onclick="tg(\'' + pfx + '\',\'' + uid + '\');event.stopPropagation()">' +
          (isSel ? '&#10003;' : '') +
        '</button>' +
        '<div class="hb-card-kicker">' + subtitle + '</div>' +
        '<div class="hb-card-name">' + esc(row.displayName) + '</div>' +
        '<div class="hb-card-metrics">' +
          '<div class="hb-card-main"><span class="hb-card-main-label">Diaria</span>' +
          '<span class="hb-card-main-value ' + r1Cls + '">' + r1 + '</span></div>' +
          '<div class="hb-card-secondary"><span class="hb-card-secondary-label">Mensual</span>' +
          '<span class="hb-card-secondary-value ' + uaCls + '">' + ua + '</span></div>' +
        '</div>';
      art.onclick = function(e) {
        if (!e.target.closest('.hb-card-check')) openDetail(row.unitId);
      };
      art.onkeydown = function(e) {
        if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.hb-card-check')) openDetail(row.unitId);
      };
      return art;
    }

    /* ── table builder ── */
    function createTable(items) {
      var hd = '<th class="hb-table-chk-col"></th>' +
        '<th class="hb-th-fund">Participación</th>' +
        tableHeaders.slice(1).map(function(h) { return '<th>' + esc(h) + '</th>'; }).join('');
      var bd = items.map(function(row) {
        var isSel = state.selected.has(row.unitId);
        var uid   = row.unitId;
        var cells = colKeys.map(function(k) {
          return '<td>' + esc(fmtMetric(row[k], row)) + '</td>';
        }).join('');
        return '<tr class="' + (isSel ? 'hb-table-row-sel' : '') + '">' +
          '<td class="hb-table-chk-col"><span class="hb-table-chk' + (isSel ? ' on' : '') + '" onclick="tg(\'' + pfx + '\',\'' + uid + '\')">✓</span></td>' +
          '<td class="hb-table-portfolio">' + esc(row.displayName) + '</td>' + cells + '</tr>';
      }).join('');
      var tbl = document.createElement('table');
      tbl.className = 'hb-table';
      tbl.innerHTML = '<thead><tr>' + hd + '</tr></thead><tbody>' + bd + '</tbody>';
      return tbl;
    }

    /* ── paginator ── */
    function renderPager(total) {
      if (!elPager) return;
      var pages = Math.ceil(total / state.pageSize);
      if (pages <= 1) { elPager.innerHTML = ''; return; }
      var cur = state.page;
      var h = '<button class="hb-page-btn" onclick="changePage(\'' + pfx + '\',' + (cur - 1) + ')"' + (cur <= 1 ? ' disabled' : '') + '>&#8592;</button>';
      for (var i = 1; i <= pages; i++) {
        if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - cur) > 1) {
          if (i === 3 || i === pages - 2) h += '<span class="hb-page-dots">&#8230;</span>';
          continue;
        }
        h += '<button class="hb-page-btn' + (i === cur ? ' active' : '') + '" onclick="changePage(\'' + pfx + '\',' + i + ')">' + i + '</button>';
      }
      h += '<button class="hb-page-btn" onclick="changePage(\'' + pfx + '\',' + (cur + 1) + ')"' + (cur >= pages ? ' disabled' : '') + '>&#8594;</button>';
      elPager.innerHTML = h;
    }

    /* ── renderGrid ── */
    function renderGrid() {
      if (!elGrid) return;
      var items = filtered();
      var total = items.length;
      if (elEmpty) {
        elEmpty.classList.toggle('is-hidden', total > 0);
        if (!total) elEmpty.innerHTML = '<p>No se encontraron resultados con los filtros aplicados.</p>';
      }
      var start = (state.page - 1) * state.pageSize;
      var page  = items.slice(start, start + state.pageSize);
      if (state.viewMode === 'cards') {
        elGrid.classList.remove('is-table');
        if (elTable) { elTable.innerHTML = ''; elTable.classList.remove('is-visible'); }
        elGrid.innerHTML = '';
        page.forEach(function(r) { elGrid.appendChild(createCard(r)); });
      } else {
        elGrid.classList.add('is-table');
        if (elTable) { elTable.classList.add('is-visible'); elTable.innerHTML = ''; elTable.appendChild(createTable(page)); }
      }
      renderPager(total);
    }

    /* ── renderFundData ── */
    function renderFundData(data) {
      if (!elFundData) return;
      var sp = (data && data.stablePortfolio) || {};
      var summaryConfig = pfx === 'p' ? renderStablePortfolioPV : renderStablePortfolio;
      elFundData.innerHTML = summaryConfig.map(function(item) {
        return '<div class="hb-summary-card"><div class="hb-summary-label">' + esc(item.label) +
          '</div><div class="hb-summary-value">' + fmtSummary(sp[item.key], item.format) + '</div></div>';
      }).join('');
    }

    /* ── detail / compare modal ── */
    function openDetail(uid) {
      hideHint();
      var row = state.rows.find(function(r) { return r.unitId === uid; });
      if (!row || !elModal) return;
      if (elModalSub)     elModalSub.textContent   = pfx === 'f' ? 'Detalle de la participación' : 'Detalle del portafolio';
      if (elModalTitle)   elModalTitle.textContent  = row.displayName;
      if (elModalContent) elModalContent.innerHTML  = buildCompTable([row]);
      setModalTopMetrics(pfx === 'p', row);
      elModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function openCompare() {
      var items = state.rows.filter(function(r) { return state.selected.has(r.unitId); });
      if (items.length < 2 || !elModal) return;
      if (elModalSub)     elModalSub.textContent   = 'Comparativa detallada';
      if (elModalTitle)   elModalTitle.textContent  = 'Comparación de portafolios';
      if (elModalContent) elModalContent.innerHTML  = buildCompTable(items);
      setModalTopMetrics(false);
      elModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    /* ── loading ── */
    function setLoading(on) {
      var el = $('loading');
      if (el) el.classList.toggle('d-none', !on);
    }

    /* ── fetch ── */
    function getFundData(code) {
      if (!code) return;
      state.loaded = true;
      setLoading(true);
      if (elFundData) elFundData.innerHTML = '';
      if (elGrid)   elGrid.innerHTML = '';
      if (elTable)  { elTable.innerHTML = ''; elTable.classList.remove('is-visible'); }
      if (elPager)  elPager.innerHTML = '';
      if (elEmpty)  elEmpty.classList.add('is-hidden');
      var fundObj = (dataLista || []).find(function(f) {
        if (!f || !f.fields) return false;
        return sameCode(f.fields['Código identificador'], code) || sameCode(f.meta && f.meta.uuid, code);
      }) || null;
      fetch('{{ vars.api }}/historical-returns/' + encodeURIComponent(code))
        .then(function(res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function(data) {
          renderFundData(data);
          state.fund = fundObj;
          state.rows = normalizeRows(data, fundObj);
          resetState();
          setLoading(false);
          renderGrid();
        })
        .catch(function(err) {
          setLoading(false);
          if (elEmpty) { elEmpty.classList.remove('is-hidden'); elEmpty.innerHTML = '<p>No se pudo cargar la información del fondo.</p>'; }
          console.error('[hb-' + pfx + '] fetch error:', err);
        });
    }

    /* ── public API ── */
    return {
      hasLoaded:    function()      { return state.loaded; },
      loadFirst:    function()      { if (elSelect && elSelect.value) getFundData(elSelect.value); },
      tg: function(id) {
        hideHint();
        state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
        updateSelUi(); renderGrid();
      },
      clrSel: function() { state.selected.clear(); updateSelUi(); renderGrid(); },
      flt: function(q) { hideHint(); state.search = (q || '').trim().toLowerCase(); state.page = 1; renderGrid(); },
      changePage: function(p) { state.page = p; renderGrid(); },
      toggleDD: function(key) {
        var dd = $('dd-' + key);
        if (!dd) return;
        var wasOpen = dd.classList.contains('open');
        document.querySelectorAll('#hb-panel-' + pfx + ' .hb-chip-dd').forEach(function(el) { el.classList.remove('open'); });
        if (!wasOpen) dd.classList.add('open');
      },
      closeAllDD: function() {
        document.querySelectorAll('#hb-panel-' + pfx + ' .hb-chip-dd').forEach(function(el) { el.classList.remove('open'); });
      },
      setFilter: function(key, el) {
        hideHint();
        var val = el.getAttribute('data-val');
        document.querySelectorAll('#' + pfx + '-dd-' + key + ' .hb-dd-item').forEach(function(i) { i.classList.remove('sel'); });
        if (state.filters[key] === val) { state.filters[key] = null; } else { state.filters[key] = val; el.classList.add('sel'); }
        state.page = 1; updateFltUi(); updateFilterChipText(); renderGrid();
        document.querySelectorAll('#hb-panel-' + pfx + ' .hb-chip-dd').forEach(function(d) { d.classList.remove('open'); });
      },
      setSort: function(el, label) {
        hideHint();
        var val = el.getAttribute('data-val');
        document.querySelectorAll('#' + pfx + '-dd-sort .hb-dd-item').forEach(function(i) { i.classList.remove('sel'); });
        state.sort = val; el.classList.add('sel');
        if (elSortLbl) elSortLbl.textContent = label;
        state.page = 1; updateFltUi(); renderGrid();
        document.querySelectorAll('#hb-panel-' + pfx + ' .hb-chip-dd').forEach(function(d) { d.classList.remove('open'); });
      },
      clearAllFilters: function() {
        state.filters = { risk: null, clase: null }; state.sort = defaultSort; state.page = 1;
        if (elSortLbl) elSortLbl.textContent = defaultSortLabel;
        document.querySelectorAll('#hb-panel-' + pfx + ' .hb-dd-item').forEach(function(el) { el.classList.remove('sel'); });
        var defaultSortEl = document.querySelector('#' + pfx + '-dd-sort .hb-dd-item[data-val="' + defaultSort + '"]');
        if (defaultSortEl) defaultSortEl.classList.add('sel');
        updateFltUi(); updateFilterChipText(); renderGrid();
      },
      setView: function(mode) {
        state.viewMode = mode === 'table' ? 'table' : 'cards';
        updateViewUi();
        renderGrid();
      },
      setItemsPerPage: function(size) {
        if (size > 0 && size !== state.pageSize) {
          state.pageSize = size;
          state.page = 1;
          renderGrid();
        }
      },
      openDetail: openDetail,
      openCompare: openCompare,
      getFundData: getFundData,
      initSelect: function() {
        if (!elSelect) return;
        initFundPicker();
        if (document.querySelector('#hb-panel-' + pfx + ':not([hidden])')) {
          if (elSelect.value) getFundData(elSelect.value);
        }
        elSelect.addEventListener('change', function() {
          if (this.value) getFundData(this.value);
          if (pfx === 'f' && elFundPickerList) {
            elFundPickerList.querySelectorAll('.hb-fund-picker-item').forEach(function(item) {
              var on = esc(item.getAttribute('data-code')) === esc(elSelect.value);
              item.classList.toggle('is-selected', on);
              item.setAttribute('aria-selected', on ? 'true' : 'false');
            });
          }
        });
      }
    };
  }

  /* ─── CREATE PANELS ─── */
  var panelF = makePanelUI('f');
  var panelP = makePanelUI('p');

  function getPanel(pfx) { return pfx === 'f' ? panelF : panelP; }

  /* ─── GLOBAL API (called from HTML onclick) ─── */
  window.tg              = function(pfx, id)        { getPanel(pfx).tg(id); };
  window.clrSel          = function(pfx)            { getPanel(pfx).clrSel(); };
  window.flt             = function(pfx, q)          { getPanel(pfx).flt(q); };
  window.changePage      = function(pfx, p)          { getPanel(pfx).changePage(p); };
  window.toggleDD        = function(pfx, key)        { getPanel(pfx).toggleDD(key); };
  window.setFilter       = function(pfx, key, el)    { getPanel(pfx).setFilter(key, el); };
  window.setSort         = function(pfx, el, label)  { getPanel(pfx).setSort(el, label); };
  window.clearAllFilters = function(pfx)             { getPanel(pfx).clearAllFilters(); };
  window.openDetail      = function(pfx, id)         { getPanel(pfx).openDetail(id); };
  window.openM           = function(pfx)             { getPanel(pfx).openCompare(); };
  window.setView         = function(pfx, mode)       { getPanel(pfx).setView(mode); };
  window.setItemsPerPage = function(pfx, size)       { getPanel(pfx).setItemsPerPage(parseInt(size, 10)); };

  /* ─── MODAL CLOSE ─── */
  window.closeM = function() {
    if (elModal) elModal.classList.remove('open');
    if (elModalTopMetrics) {
      elModalTopMetrics.classList.remove('is-visible');
      elModalTopMetrics.innerHTML = '';
    }
    document.body.style.overflow = '';
  };
  window.omc = function(e) { if (e.target === elModal) closeM(); };
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeM(); });

  /* ─── CLOSE DROPDOWNS ON OUTSIDE CLICK ─── */
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.hb-chip-wrap')) {
      panelF.closeAllDD();
      panelP.closeAllDD();
    }
  });

  /* ─── TAB SWITCH ─── */
  var elTabF  = document.querySelector('#hb-tab-f');
  var elTabP  = document.querySelector('#hb-tab-p');
  var elPanF  = document.querySelector('#hb-panel-f');
  var elPanP  = document.querySelector('#hb-panel-p');

  window.sw = function(tab) {
    var toF = tab === 'f';
    if (elTabF) { elTabF.classList.toggle('active', toF); elTabF.setAttribute('aria-selected', toF ? 'true' : 'false'); }
    if (elTabP) { elTabP.classList.toggle('active', !toF); elTabP.setAttribute('aria-selected', toF ? 'false' : 'true'); }
    if (elPanF) { toF ? elPanF.removeAttribute('hidden') : elPanF.setAttribute('hidden', ''); }
    if (elPanP) { toF ? elPanP.setAttribute('hidden', '') : elPanP.removeAttribute('hidden'); }
    var panel = toF ? panelF : panelP;
    if (!panel.hasLoaded()) panel.loadFirst();
  };

  /* ─── INIT ─── */
  var initialFund = '{{ fundCode }}';
  if (initialFund && initialFund !== '') {
    // Specific fund provided — try FIC first, then PV
    panelF.getFundData(initialFund);
  } else {
    // Auto-load first fund in each panel select; FIC is active by default
    panelF.initSelect();
    panelP.initSelect();
  }
})();
