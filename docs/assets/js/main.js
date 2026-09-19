/* ---------- horizontal rails ---------- */
/* one behaviour, two places: the testimonial strip, and a clip card's extra edits */
window.railify = (function(){
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  return function railify(rail, prev, next, opts){
    opts = opts || {};
    var FADE = opts.fade || '72px';

    function update(){
      var max = rail.scrollWidth - rail.clientWidth;
      var x = rail.scrollLeft;
      rail.style.setProperty('--fade-l', x > 4 ? FADE : '0px');
      rail.style.setProperty('--fade-r', x < max - 4 ? FADE : '0px');
      if (prev) prev.disabled = x <= 4;
      if (next) next.disabled = x >= max - 4;
      rail.classList.toggle('is-static', max <= 4);   // nothing to drag: drop the grab cursor
    }

    function page(dir){
      rail.scrollBy({left: dir * opts.step(), behavior: calm.matches ? 'auto' : 'smooth'});
    }

    if (prev) prev.addEventListener('click', function(){ page(-1); });
    if (next) next.addEventListener('click', function(){ page(1); });

    // click-and-drag for mouse users; touch and trackpad already scroll natively.
    // The pointer is only captured once it has actually moved: capturing on press would
    // retarget the click to the rail, and a link or button riding on it would never get it.
    var pressed = false, dragging = false, startX = 0, startLeft = 0, travelled = 0, pid = null;
    rail.addEventListener('pointerdown', function(e){
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (e.target.closest && e.target.closest('button')) return;   // controls are never drag handles
      pressed = true; dragging = false; travelled = 0;
      startX = e.clientX; startLeft = rail.scrollLeft; pid = e.pointerId;
    });
    rail.addEventListener('pointermove', function(e){
      if (!pressed) return;
      if (!e.buttons) { endDrag(e); return; }                        // released somewhere we never heard about
      var dx = e.clientX - startX;
      travelled = Math.max(travelled, Math.abs(dx));
      if (!dragging && travelled > 5) {
        dragging = true;
        rail.classList.add('dragging');
        try { rail.setPointerCapture(pid); } catch (err) {}
      }
      if (!dragging) return;
      e.preventDefault();
      rail.scrollLeft = startLeft - dx;
    });
    function endDrag(){
      pressed = false;
      if (!dragging) return;
      dragging = false;
      rail.classList.remove('dragging');
      try { rail.releasePointerCapture(pid); } catch (err) {}
    }
    rail.addEventListener('pointerup', endDrag);
    rail.addEventListener('pointercancel', endDrag);
    // a drag that happens to finish on a link must not open it
    rail.addEventListener('click', function(e){
      if (travelled > 5) { e.preventDefault(); e.stopPropagation(); travelled = 0; }
    }, true);
    rail.addEventListener('dragstart', function(e){ e.preventDefault(); });
    rail.addEventListener('scroll', update, {passive:true});
    window.addEventListener('resize', update);
    update();
    return {update: update, page: page, reset: function(){ rail.scrollLeft = 0; update(); }};
  };
})();

(function(){
  var slice = function(n){ return Array.prototype.slice.call(n); };
  var topButtons = slice(document.querySelectorAll('.filter'));
  var subButtons = slice(document.querySelectorAll('.subfilter'));
  var groups = slice(document.querySelectorAll('.grp'));
  var cards = slice(document.querySelectorAll('#grid .card'));
  var count = document.getElementById('count');
  var discipline = 'all';
  var format = 'all';

  function plural(n){ return n + (n === 1 ? ' project' : ' projects'); }

  function render(){
    var shown = 0;
    groups.forEach(function(group){
      group.hidden = discipline !== 'all' && group.dataset.group !== discipline;
    });
    cards.forEach(function(card){
      var inDiscipline = discipline === 'all' || card.dataset.cat === discipline;
      var inFormat = card.dataset.cat !== 'video' || format === 'all' || card.dataset.sub === format;
      var visible = inDiscipline && inFormat;
      var wasVisible = !card.hidden;
      card.hidden = !visible;
      // nothing fires pointerleave when a card is filtered away mid-hover
      if (wasVisible && !visible) card.dispatchEvent(new Event('pointerleave'));
      if (visible) shown++;
    });
    count.textContent = shown + ' showing';
    syncShowAll();
  }

  var calmMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  // replays only on a filter the visitor chose, so nothing is hidden on first paint
  function deal(){
    if (calmMQ.matches) return;
    cards.filter(function(c){ return !c.hidden; }).forEach(function(c, i){
      c.classList.remove('dealt');
      void c.offsetWidth;
      c.style.animationDelay = (i * 45) + 'ms';
      c.classList.add('dealt');
    });
  }

  function setDiscipline(kind){
    discipline = kind;
    format = 'all';
    topButtons.forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.filter === kind)); });
    subButtons.forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.sub === 'all')); });
    render();
    deal();
  }

  topButtons.forEach(function(btn){
    btn.addEventListener('click', function(){ setDiscipline(btn.dataset.filter); });
  });

  // one card per client. Expanding does not resize the card: the reel becomes a rail
  // and the extra edits sit in a column to its right, which we slide straight over to.
  document.querySelectorAll('.more-clips').forEach(function(btn){
    var card = btn.closest('.card');
    var reel = card.querySelector('.reel');
    var label = btn.querySelector('.more-label');
    var n = btn.dataset.count;
    var GAP = 6;
    var r = window.railify(reel, card.querySelector('.reel-prev'), card.querySelector('.reel-next'),
      {fade: '46px', step: function(){ return reel.clientWidth + GAP; }});

    btn.addEventListener('click', function(){
      var open = card.classList.contains('collapsed');
      if (open) {
        card.classList.remove('collapsed');
        r.update();          // reads scrollWidth, so the new column is laid out before we move
        r.page(1);           // slide straight over to the edit that was being kept back
      } else {
        r.reset();
        card.classList.add('collapsed');
      }
      btn.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Show fewer' : ('+' + n + ' more edit' + (n === '1' ? '' : 's'));
    });

    // put the card back to its resting state, whatever the visitor did with it
    card._fold = function(){
      if (card.classList.contains('collapsed')) return;
      r.reset();
      card.classList.add('collapsed');
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      label.textContent = '+' + n + ' more edit' + (n === '1' ? '' : 's');
    };
  });

  // Long-form cards always show every clip; short-form cards do once a format is picked.
  // An open card widens across the grid to fit its clips side by side - one grid column per
  // clip column where there is room, narrower clips where there is not (a tablet) - and on a
  // one-column grid (a phone) its clips stack instead.
  var videoGrid = document.querySelector('.grp[data-group="video"] .pgrid');
  var lastFiltered = null;
  function gridCols(grid){
    return getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
  }
  function syncShowAll(){
    if (!videoGrid) return;
    var filtered = format !== 'all';
    var cols = gridCols(videoGrid);
    var modeChanged = filtered !== lastFiltered;
    lastFiltered = filtered;
    videoGrid.classList.toggle('show-all', filtered);
    slice(videoGrid.querySelectorAll('.card')).forEach(function(card){
      var reel = card.querySelector('.reel');
      var clips = reel ? reel.querySelectorAll('.reel-slot').length : 0;
      if (clips < 2) return;
      if (modeChanged && card._fold) card._fold();   // a hand-opened card starts from rest
      var rows = reel.classList.contains('rows-2') ? 2 : 1;
      var k = Math.ceil(clips / rows);
      var open = card.dataset.sub === 'long' || filtered;
      var stack = open && cols < 2;
      var span = open && !stack ? Math.min(k, cols) : 0;
      card.classList.toggle('spans', !!span);
      card.classList.toggle('squeeze', !!span && span < k);
      card.classList.toggle('stacks', stack);
      card.style.gridColumn = span > 1 ? 'span ' + span : '';
      if (span) card.style.setProperty('--k', k); else card.style.removeProperty('--k');
    });
  }
  window.addEventListener('resize', syncShowAll);

  subButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      format = btn.dataset.sub;
      subButtons.forEach(function(b){ b.setAttribute('aria-pressed', String(b === btn)); });
      render();
      deal();
    });
  });

  slice(document.querySelectorAll('[data-count-for]')).forEach(function(el){
    var kind = el.dataset.countFor;
    var n = cards.filter(function(c){ return c.dataset.cat === kind; }).length;
    el.textContent = el.classList.contains('grp-count') ? plural(n) : n;
  });

  slice(document.querySelectorAll('[data-label-for]')).forEach(function(el){
    var kind = el.dataset.labelFor;
    var n = cards.filter(function(c){ return c.dataset.cat === kind; }).length;
    el.textContent = 'See ' + n + ' ' + kind + ' project' + (n === 1 ? '' : 's');
  });

  slice(document.querySelectorAll('.tri')).forEach(function(tile){
    tile.addEventListener('click', function(){
      setDiscipline(tile.dataset.goto);
      var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('projects').scrollIntoView({behavior: calm ? 'auto' : 'smooth', block:'start'});
    });
  });

  render();
})();

(function(){
  var rail = document.getElementById('quotes');
  if (!rail) return;
  window.railify(
    rail,
    document.querySelector('[data-rail="prev"]'),
    document.querySelector('[data-rail="next"]'),
    {step: function(){
      var q = rail.querySelector('.quote');
      return q ? q.getBoundingClientRect().width + 24 : rail.clientWidth * 0.8;
    }}
  );
})();

(function(){
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* 1. the wordmark breathes on the typeface's own width axis as the pointer passes */
  var wm = document.querySelector('.wordmark');
  if (wm && !calm.matches && window.matchMedia('(hover: hover)').matches) {
    var BASE = 78, PEAK = 106, REACH = 210;
    var text = wm.textContent, letters = [];
    wm.textContent = '';
    for (var i = 0; i < text.length; i++) {
      var sp = document.createElement('span');
      sp.className = 'wm-l';
      sp.textContent = text[i];
      sp.style.fontVariationSettings = '"wdth" ' + BASE + ', "wght" 800';
      wm.appendChild(sp);
      letters.push({el: sp, now: BASE, want: BASE});
    }
    var raf = null, pointer = null;
    function measure(){ letters.forEach(function(l){ var r = l.el.getBoundingClientRect(); l.mid = r.left + r.width/2; }); }
    function frame(){
      var moving = false;
      letters.forEach(function(l){
        l.want = pointer === null ? BASE
          : BASE + (PEAK - BASE) * Math.max(0, 1 - Math.abs(pointer - l.mid) / REACH);
        l.now += (l.want - l.now) * 0.18;
        if (Math.abs(l.want - l.now) > 0.4) moving = true;
        l.el.style.fontVariationSettings = '"wdth" ' + l.now.toFixed(1) + ', "wght" 800';
      });
      raf = moving ? requestAnimationFrame(frame) : null;
    }
    function kick(){ if (!raf) raf = requestAnimationFrame(frame); }
    wm.addEventListener('pointermove', function(e){ pointer = e.clientX; measure(); kick(); }, {passive:true});
    wm.addEventListener('pointerleave', function(){ pointer = null; kick(); }, {passive:true});
    window.addEventListener('resize', measure);
    measure();
  }

  /* 2. the fill sweeps in from whichever edge the pointer crossed, and retreats the way it left */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.btn').forEach(function(btn){
      function edge(e){
        var r = btn.getBoundingClientRect();
        return (e.clientX - r.left) < r.width / 2 ? 'left' : 'right';
      }
      btn.addEventListener('pointerenter', function(e){ btn.dataset.from = edge(e); });
      btn.addEventListener('pointerleave', function(e){ btn.dataset.from = edge(e); });
    });
  }

  /* 3. nav marks the section you are actually in */
  var links = {};
  document.querySelectorAll('.nav-links a').forEach(function(a){
    var id = a.getAttribute('href').slice(1);
    if (document.getElementById(id)) links[id] = a;
  });
  if (Object.keys(links).length && 'IntersectionObserver' in window) {
    var seen = {};
    var spy = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ seen[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0; });
      var best = null, top = 0;
      Object.keys(links).forEach(function(id){ if ((seen[id] || 0) > top) { top = seen[id]; best = id; } });
      Object.keys(links).forEach(function(id){ links[id].classList.toggle('here', id === best); });
    }, {threshold:[0, 0.15, 0.4, 0.75, 1]});
    Object.keys(links).forEach(function(id){ spy.observe(document.getElementById(id)); });
  }

  /* 6. each web card walks through its screenshots while you are on it */
  document.querySelectorAll('.shots').forEach(function(box){
    var shots = box.querySelectorAll('img');
    if (shots.length < 2) return;
    var card = box.closest('.card'), at = 0, timer = null;
    function show(n){ shots.forEach(function(im, k){ im.classList.toggle('on', k === n); }); }
    function start(){
      if (calm.matches || timer) return;
      timer = setInterval(function(){
        // a filter can hide the card mid-hover, and no pointerleave ever arrives
        if (card.hidden || !card.isConnected) { stop(); return; }
        at = (at + 1) % shots.length; show(at);
      }, 1100);
    }
    function stop(){ clearInterval(timer); timer = null; at = 0; show(0); }
    card.addEventListener('pointerenter', start);
    card.addEventListener('pointerleave', stop);
    card.addEventListener('pointercancel', stop);
    card.addEventListener('focusin', function(){ if (card.matches(':focus-visible')) start(); });
    card.addEventListener('focusout', stop);
  });

  /* 7. the rail needs enough copies to outrun the viewport, or it runs dry mid-loop */
  var railTrack = document.querySelector('.tools-track');
  if (railTrack) {
    var proto = railTrack.querySelector('.tools-row');
    var relayout = function(){
      while (railTrack.children.length > 1) railTrack.removeChild(railTrack.lastChild);
      var w = proto.getBoundingClientRect().width;
      if (!w) return;
      var copies = Math.max(2, Math.ceil(window.innerWidth / w) + 1);
      for (var i = 1; i < copies; i++) {
        var clone = proto.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('.sr').forEach(function(el){ el.remove(); });
        railTrack.appendChild(clone);
      }
      railTrack.style.setProperty('--shift', w + 'px');
    };
    relayout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    var railTimer;
    window.addEventListener('resize', function(){
      clearTimeout(railTimer); railTimer = setTimeout(relayout, 180);
    });
  }

  /* 5. a way back up once the page has run on a while */
  var toTop = document.querySelector('.to-top');
  if (toTop) {
    var sync = function(){ toTop.classList.toggle('show', window.scrollY > window.innerHeight * 0.6); };
    window.addEventListener('scroll', sync, {passive:true});
    window.addEventListener('resize', sync);
    sync();
    toTop.addEventListener('click', function(){
      window.scrollTo({top:0, behavior: calm.matches ? 'auto' : 'smooth'});
    });
  }

  /* 4. the results figures count up the first time they are reached */
  var stats = document.querySelector('.stats');
  if (stats && !calm.matches && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries, obs){
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      stats.querySelectorAll('b').forEach(function(b){
        var truth = b.textContent.trim();
        var m = /^([^\d-]*)(-?[\d.]+)(.*)$/.exec(truth);
        if (!m) return;
        var pre = m[1], target = parseFloat(m[2]), post = m[3];
        var dec = (m[2].split('.')[1] || '').length, t0 = null;
        // whatever happens to the frame loop, the real figure is what ends up on screen
        var settle = setTimeout(function(){ b.textContent = truth; }, 1400);
        function step(ts){
          if (!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / 900);
          if (k >= 1) { clearTimeout(settle); b.textContent = truth; return; }
          b.textContent = pre + (target * (1 - Math.pow(1 - k, 3))).toFixed(dec) + post;
          requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, {threshold:0.4});
    io.observe(stats);
  }
})();


/* ---------- hover-to-play reels ---------- */
/* every clip is its own hover target: the one under the pointer plays and loops,
   its neighbours sit back, so a card holding two edits reads as two edits */
(function(){
  var slots = Array.prototype.slice.call(document.querySelectorAll('.reel-slot'));
  if (!slots.length) return;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canHover = window.matchMedia('(hover: hover)').matches;

  // nothing is fetched until the pointer reaches the card the clip lives on, so the
  // page still loads on posters alone but a clip is buffering before it is hovered
  var warmed = new WeakSet();
  function warm(card){
    if (!card || warmed.has(card)) return;
    warmed.add(card);
    card.querySelectorAll('.reel-vid').forEach(function(v){ v.preload = 'auto'; v.load(); });
  }

  /* Sound is off to begin with because no browser will autoplay audio without a
     gesture, and a clip that starts on hover has none. The speaker on each clip is
     that gesture: it flips one shared setting, so nobody unmutes six clips by hand. */
  var KEY = 'ec-reel-sound';
  var soundOn = false;
  try { soundOn = localStorage.getItem(KEY) === 'on'; } catch (e) {}
  var buttons = [];
  var sounding = null;   // only ever one clip is audible

  var SPEAKER = '<path d="M11 5 6 9H2v6h4l5 4z"/>';
  var ICON_OFF = '<svg class="icon-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SPEAKER + '<path d="M22 9l-6 6M16 9l6 6"/></svg>';
  var ICON_ON  = '<svg class="icon-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SPEAKER + '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

  function paintSound(){
    buttons.forEach(function(b){
      b.classList.toggle('is-on', soundOn);
      b.setAttribute('aria-pressed', String(soundOn));
      b.setAttribute('aria-label', soundOn ? 'Play clips without sound' : 'Play clips with sound');
    });
  }
  function silence(){ soundOn = false; paintSound(); }

  slots.forEach(function(slot){
    var v = slot.querySelector('.reel-vid');
    if (!v) return;
    var card = slot.closest('.card');
    if (card) card.addEventListener('pointerenter', function(){ warm(card); }, {passive:true});
    // a missing or unplayable file leaves the poster standing rather than a black box
    v.addEventListener('error', function(){ slot.classList.add('dead'); }, {once:true});
    v.loop = true;
    v.muted = true;

    // The poster is also laid over the video as an image, shown whenever the clip is not
    // actually playing. A <video> drops its own poster as soon as it seeks or plays, and
    // then shows whatever frame it is on - black, for an edit that opens on a dark intro.
    var still = document.createElement('img');
    still.className = 'reel-still';
    still.alt = '';
    still.setAttribute('aria-hidden', 'true');
    still.decoding = 'async';
    if (v.getAttribute('poster')) still.src = v.getAttribute('poster');
    v.insertAdjacentElement('afterend', still);
    v.addEventListener('playing', function(){ slot.classList.add('is-playing'); });
    v.addEventListener('pause', function(){ slot.classList.remove('is-playing'); });

    function start(){
      if (calm.matches) return;
      // every hover shows the edit from its first frame, whatever frame it was resting on
      if (v.currentTime) { try { v.currentTime = 0; } catch (e) {} }
      if (soundOn && sounding && sounding !== v) sounding.muted = true;
      v.muted = !soundOn;
      if (soundOn) sounding = v;
      var p = v.play();
      if (p && p.catch) p.catch(function(){
        // a restored preference has no gesture behind it, so sound can still be
        // refused on a fresh load: drop back to silent rather than play nothing
        if (!v.muted) { v.muted = true; silence(); v.play().catch(function(){}); }
      });
    }
    function stop(){
      v.pause();
      slot.classList.remove('is-playing');     // the still covers the clip again straight away
      try { v.currentTime = 0; } catch (e) {}
    }

    var sound = document.createElement('button');
    sound.type = 'button';
    sound.className = 'reel-sound';
    sound.innerHTML = ICON_OFF + ICON_ON;
    slot.appendChild(sound);
    buttons.push(sound);
    sound.addEventListener('click', function(e){
      e.preventDefault();               // the whole slot is a link to Instagram
      e.stopPropagation();
      soundOn = !soundOn;
      try { localStorage.setItem(KEY, soundOn ? 'on' : 'off'); } catch (err) {}
      paintSound();
      if (soundOn) start();             // the click is the gesture, so let it be heard
      else { v.muted = true; sounding = null; }
    });

    if (canHover) {
      slot.addEventListener('pointerenter', start);
      slot.addEventListener('pointerleave', stop);
      slot.addEventListener('pointercancel', stop);
      // a filter can hide the card mid-hover, and no pointerleave ever arrives
      if (card) card.addEventListener('pointerleave', stop);
      slot.addEventListener('focusin', function(){
        if (slot.querySelector('.reel-link:focus-visible')) start();
      });
      slot.addEventListener('focusout', stop);
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(entries){
        entries.forEach(function(en){ en.isIntersecting ? start() : stop(); });
      }, {threshold:0.6}).observe(slot);
    }
  });

  paintSound();
})();

/* ---------- views chart ---------- */
/* each bar is its own hover/focus target; the tooltip adds the post count and platform,
   and every value it shows is also on the bar tip and in the table view */
(function(){
  var chart = document.querySelector('.vchart');
  if (!chart) return;
  var plot = chart.querySelector('.vchart-plot');
  var tip = chart.querySelector('.vchart-tip');
  var rows = Array.prototype.slice.call(chart.querySelectorAll('.vchart-row'));
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  function show(row){
    var bar = row.querySelector('.vchart-bar');
    tip.textContent = '';
    var v = document.createElement('b');
    v.textContent = row.dataset.label + ' views';
    var d = document.createElement('span');
    d.textContent = row.dataset.detail;
    tip.appendChild(v);
    tip.appendChild(d);
    tip.hidden = false;
    var pr = plot.getBoundingClientRect(), br = bar.getBoundingClientRect(), rr = row.getBoundingClientRect();
    var x = Math.max(0, Math.min(br.right - pr.left - 14, pr.width - tip.offsetWidth));
    var y = rr.top - pr.top - tip.offsetHeight - 4;
    tip.style.left = x + 'px';
    tip.style.top = Math.max(-tip.offsetHeight, y) + 'px';
  }
  function hide(){ tip.hidden = true; }

  rows.forEach(function(row){
    row.addEventListener('pointerenter', function(){ show(row); });
    row.addEventListener('pointerleave', hide);
    row.addEventListener('focus', function(){ if (row.matches(':focus-visible')) show(row); });
    row.addEventListener('blur', hide);
  });

  // grow the bars in once, the first time the chart is actually seen
  if (!calm.matches && 'IntersectionObserver' in window) {
    chart.classList.add('is-armed');
    var io = new IntersectionObserver(function(entries, obs){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        chart.classList.remove('is-armed');
        obs.disconnect();
      });
    }, {threshold:0.35});
    io.observe(chart);
  }
})();

/* ---------- contact: message form, booking panel, copy-email ---------- */
/* Settings live in two <meta> tags in <head> (contact-form-key, booking-url). Every button
   keeps a real href, so with no JS - or a browser without <dialog> - it still goes somewhere. */
(function(){
  function setting(name){
    var m = document.querySelector('meta[name="' + name + '"]');
    return m ? m.content.trim() : '';
  }
  var FORM_KEY = setting('contact-form-key');
  var BOOKING = setting('booking-url');
  // assembled here rather than written out, so nothing in the published files matches the
  // name@domain pattern that address-harvesting bots scan for
  var EMAIL = ['edgarcruzstudio', 'gmail.com'].join('@');
  Array.prototype.forEach.call(document.querySelectorAll('[data-mail]'), function(el){
    el.textContent = EMAIL;
    if (el.tagName === 'A') el.href = 'mailto:' + EMAIL;
  });

  /* copy-email works everywhere, dialog or not */
  function copyText(text){
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function(ok, fail){
      var t = document.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (e) {}
      t.remove();
      if (copied) ok(); else fail();
    });
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('.copy-mail');
    if (!b) return;
    var hint = b.querySelector('.copy-hint');
    copyText(b.dataset.email || EMAIL).then(function(){
      b.classList.add('is-copied');
      if (hint) hint.textContent = 'Copied';
      clearTimeout(b._t);
      b._t = setTimeout(function(){ b.classList.remove('is-copied'); if (hint) hint.textContent = 'Copy'; }, 2200);
    }, function(){
      // clipboard refused: fall back to the visitor's mail app
      window.location.href = 'mailto:' + (b.dataset.email || EMAIL);
    });
  });

  var msgSheet = document.getElementById('message-sheet');
  var bookSheet = document.getElementById('booking-sheet');
  if (!msgSheet || typeof msgSheet.showModal !== 'function') return;

  var root = document.documentElement;
  // the scroll lock follows the dialogs' own open state, so it lifts however a panel
  // closes (button, backdrop, Esc) - the close event alone is not reliable for this
  function syncLock(){ root.classList.toggle('sheet-open', !!document.querySelector('dialog.sheet[open]')); }
  function openSheet(sheet){
    if (sheet.open) return;
    sheet.showModal();
    syncLock();
  }
  [msgSheet, bookSheet].forEach(function(sheet){
    if (!sheet) return;
    new MutationObserver(syncLock).observe(sheet, {attributes: true, attributeFilter: ['open']});
    // a click on the dimmed backdrop lands on the <dialog> itself
    sheet.addEventListener('click', function(e){
      if (e.target === sheet || e.target.closest('[data-close]')) sheet.close();
    });
  });

  /* ---- message form ---- */
  var form = msgSheet.querySelector('.msg-form');
  var done = msgSheet.querySelector('.msg-done');
  var status = form.querySelector('.form-status');
  var submit = form.querySelector('[type="submit"]');
  var submitLabel = submit.querySelector('span');

  var openedAt = 0;
  var MIN_FILL_MS = 2000;   // nobody reads, types and sends in under two seconds; scripted bots do
  function openMessage(preset){
    if (!done.hidden) { form.reset(); done.hidden = true; form.hidden = false; }
    openedAt = Date.now();
    if (preset && !form.message.value) form.message.value = preset;
    openSheet(msgSheet);
    form.elements.name.focus();
  }

  function fieldError(input, text){
    var f = input.closest('.field');
    f.classList.toggle('is-invalid', !!text);
    f.querySelector('.field-err').textContent = text || '';
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
  }
  function validate(){
    var el = form.elements, bad = [];
    var name = el.name.value.trim(), email = el.email.value.trim(), msg = el.message.value.trim();
    fieldError(el.name, name ? '' : 'Add your name so I know who to reply to.');
    if (!name) bad.push(el.name);
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    fieldError(el.email, email ? (emailOk ? '' : 'That email address looks incomplete.') : 'Add an email I can reply to.');
    if (!emailOk) bad.push(el.email);
    fieldError(el.message, msg ? '' : 'A line or two about the project is enough.');
    if (!msg) bad.push(el.message);
    if (bad.length) bad[0].focus();
    return !bad.length;
  }
  // clear a field's error as soon as it is fixed
  ['name', 'email', 'message'].forEach(function(n){
    var input = form.elements[n];
    input.addEventListener('input', function(){
      if (input.closest('.field').classList.contains('is-invalid')) fieldError(input, '');
    });
  });

  function setStatus(text, isError){
    status.textContent = text;
    status.classList.toggle('is-error', !!isError);
  }
  function needs(){
    return Array.prototype.slice.call(form.querySelectorAll('input[name="needs"]:checked'))
      .map(function(i){ return i.value; }).join(', ');
  }
  function finished(){
    done.querySelector('.done-email').textContent = form.elements.email.value.trim();
    form.hidden = true;
    done.hidden = false;
    done.querySelector('h3').focus();
  }
  function mailFallback(){
    var el = form.elements;
    var body = el.message.value.trim() + '\n\n' + (needs() ? 'Looking for: ' + needs() + '\n' : '') +
               '- ' + el.name.value.trim() + ' (' + el.email.value.trim() + ')';
    window.location.href = 'mailto:' + EMAIL +
      '?subject=' + encodeURIComponent('Project enquiry from ' + el.name.value.trim()) +
      '&body=' + encodeURIComponent(body);
    setStatus('Your email app should open with this message written out. If nothing happens, copy my address below and paste it in.');
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    setStatus('');
    if (!validate()) return;
    var el = form.elements;
    // a bot ticked the hidden box, or filled the whole form faster than a person can:
    // show it the normal success screen and send nothing
    if (el.botcheck.checked || Date.now() - openedAt < MIN_FILL_MS) { finished(); return; }
    if (!FORM_KEY) { mailFallback(); return; }

    var name = el.name.value.trim();
    var payload = {
      access_key: FORM_KEY,
      subject: 'New project enquiry from ' + name,
      from_name: 'Edgar Cruz portfolio',
      replyto: el.email.value.trim(),
      name: name.slice(0, 80),
      email: el.email.value.trim().slice(0, 120),
      needs: needs() || 'Not specified',
      message: el.message.value.trim().slice(0, 3000)
    };
    submit.disabled = true;
    submitLabel.textContent = 'Sending…';
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function(){ if (ctrl) ctrl.abort(); }, 15000);

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function(r){
      return r.json().catch(function(){ return {}; }).then(function(j){ return r.ok && j.success !== false; });
    }).catch(function(){ return false; }).then(function(ok){
      clearTimeout(timer);
      submit.disabled = false;
      submitLabel.textContent = 'Send message';
      if (ok) finished();
      else setStatus('That did not go through, but your message is still here. Try again, or copy my address below and email it.', true);
    });
  });

  /* ---- booking ---- */
  var frame = bookSheet && bookSheet.querySelector('iframe');
  function embedUrl(url){
    try {
      var u = new URL(url);
      if (/calendly\.com$/.test(u.hostname)) {
        u.searchParams.set('embed_domain', location.hostname || 'localhost');
        u.searchParams.set('embed_type', 'Inline');
        u.searchParams.set('hide_gdpr_banner', '1');
      }
      return u.toString();
    } catch (e) { return url; }
  }
  function openBooking(){
    if (!BOOKING || !bookSheet) {
      // no scheduler linked yet: open the message form, already asking for a call
      openMessage('I would like to book a 20-minute call.');
      return;
    }
    if (!frame.getAttribute('src')) frame.src = embedUrl(BOOKING);   // the third-party page loads only on first open
    bookSheet.querySelector('.sheet-link').href = BOOKING;
    openSheet(bookSheet);
  }

  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-open]');
    if (!t) return;
    e.preventDefault();
    if (t.dataset.open === 'booking') openBooking();
    else openMessage();
  });
})();
