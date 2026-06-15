(function () {
  "use strict";

  // ============================================================
  // Utilities
  // ============================================================
  function $(id) { return document.getElementById(id); }

  function normalize(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .replace(/[^\p{L}\p{N} ]+/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function pad2(n) { return String(n).padStart(2, "0"); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function buildReveal(ok, correctText, q) {
    var html = '<span class="' + (ok ? "ok" : "x") + '">' + (ok ? "Correct." : "Incorrect.") + '</span>';
    if (!ok) html += " &nbsp;Answer: <b>" + escapeHtml(correctText) + "</b>";
    if (q.explanation) html += '<p class="reveal-note">'    + escapeHtml(q.explanation) + "</p>";
    if (q.example)     html += '<p class="reveal-example">' + escapeHtml(q.example)     + "</p>";
    if (q.exampletranslate)     html += '<p class="reveal-example-translate">' + escapeHtml(q.exampletranslate)     + "</p>";
    return html;
  }

  // ============================================================
  // Toast
  // ============================================================
  function showToast(score, total, onRestart) {
    var pct = Math.round((score / total) * 100);
    var verdict =
      pct >= 90 ? "Excellent." :
      pct >= 70 ? "Nice work."  :
      pct >= 50 ? "Keep going." :
                  "Try again.";

    $("toastVerdict").textContent = verdict;
    $("toastScore").textContent   = " " + score + " / " + total + " \xb7 " + pct + "%";
    $("toastWrap").style.display  = "flex";

    $("toastRestart").onclick = function () { hideToast(); onRestart(); };
    $("toastHome").onclick    = function () { window.location.href = "index.html"; };
  }

  function hideToast() {
    $("toastWrap").style.display = "none";
  }

  // ============================================================
  // Theme
  // ============================================================
  var SVG_ARROW = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
  var SVG_MOON  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var SVG_SUN   = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll(".theme-btn").forEach(function (btn) {
      btn.innerHTML = theme === "dark" ? SVG_SUN : SVG_MOON;
      btn.title     = theme === "dark" ? "Switch to light" : "Switch to dark";
    });
  }

  function initTheme() {
    applyTheme(localStorage.getItem("wordstudy.theme") || "light");
    document.querySelectorAll(".theme-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(next);
        localStorage.setItem("wordstudy.theme", next);
      });
    });
  }

  // ============================================================
  // Page: STUDY  (category → quiz → mode → session)
  // ============================================================
  var libQuizState   = null;
  var activeQuizData = null;
  var typeState      = null;
  var anagramState   = null;

  var ALL_SCREENS = ["categories", "quizzes", "mode", "quiz", "type", "anagram"];

  function showScreen(name) {
    ALL_SCREENS.forEach(function (s) {
      var el = $("screen-" + s);
      if (el) el.style.display = s === name ? "" : "none";
    });
    window.scrollTo(0, 0);
  }

  function initQuiz() {
    // Navigation
    $("backToCategories").addEventListener("click",  function () { showScreen("categories"); });
    $("backModeToQuizzes").addEventListener("click", function () { showScreen("quizzes"); });
    $("backQuizToMode").addEventListener("click",    function () { showScreen("mode"); });
    $("backTypeToMode").addEventListener("click",     function () { showScreen("mode"); });
    $("backAnagramToMode").addEventListener("click",  function () { showScreen("mode"); });

    // Mode selection
    $("startMultipleChoice").addEventListener("click", function () {
      showScreen("quiz");
      startLibQuiz(activeQuizData);
    });
    $("startTypeAnswer").addEventListener("click", function () {
      showScreen("type");
      startTypeSession();
    });
    $("startAnagram").addEventListener("click", function () {
      showScreen("anagram");
      startAnagramSession();
    });

    // Multiple-choice session buttons
    $("quizNextBtn").addEventListener("click", libQuizNext);
    $("quizPrevBtn").addEventListener("click", libQuizPrev);

    // Type session buttons
    $("typeInput").addEventListener("input", function () {
      $("typeCheckBtn").disabled = !$("typeInput").value.trim();
    });
    $("typeInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (typeState && typeState.status === "idle") typeCheck();
        else typeNext();
      }
    });
    $("typeCheckBtn").addEventListener("click", typeCheck);
    $("typeNextBtn").addEventListener("click",  typeNext);
    $("typeHintBtn").addEventListener("click",  typeToggleHint);

    // Anagram session buttons
    $("anagramClearBtn").addEventListener("click",  anagramClear);
    $("anagramHintBtn").addEventListener("click",   anagramHint);
    $("anagramCheckBtn").addEventListener("click",  anagramCheck);
    $("anagramNextBtn").addEventListener("click",   anagramNext);

    // Keyboard shortcuts (1–4) for multiple-choice session
    window.addEventListener("keydown", function (e) {
      var scr = $("screen-quiz");
      if (!scr || scr.style.display === "none") return;
      if (!libQuizState || libQuizState.done) return;
      var s = libQuizState;
      if (s.viewing < s.i || s.answers[s.i] !== undefined) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); libQuizNext(); }
        return;
      }
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) {
        var btns = $("quizChoices").querySelectorAll(".choice");
        if (btns[n - 1] && !btns[n - 1].disabled) pickLibAnswer(n - 1, btns[n - 1]);
      }
    });

    // Load quiz library
    fetch("libs/index.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var groups = {};
        data.quizzes.forEach(function (q) {
          if (!groups[q.category]) groups[q.category] = [];
          groups[q.category].push(q);
        });
        renderCategories(groups);
        showScreen("categories");
      })
      .catch(function (err) { console.error("Failed to load quiz index:", err); });
  }

  function renderCategories(groups) {
    var grid = $("categoryGrid");
    grid.innerHTML = "";
    Object.keys(groups).forEach(function (cat, i) {
      var list = groups[cat];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-card";
      btn.innerHTML =
        '<div class="num">0' + (i + 1) + ' / ' + escapeHtml(cat.toLowerCase()) + '</div>' +
        '<h3>' + escapeHtml(cat) + '</h3>' +
        '<p>' + list.length + ' quiz' + (list.length !== 1 ? 'zes' : '') + ' available</p>' +
        '<div class="go">Browse ' + SVG_ARROW + '</div>';
      btn.addEventListener("click", function () {
        $("categoryEyebrow").textContent = "Category \xb7 " + cat;
        renderQuizList(list);
        showScreen("quizzes");
      });
      grid.appendChild(btn);
    });
  }

  function renderQuizList(quizzes) {
    var grid = $("quizGrid");
    grid.innerHTML = '<p style="color:var(--ink-3);font-size:14px;padding:8px 0">Loading…</p>';

    Promise.all(quizzes.map(function (meta) {
      return fetch("libs/" + meta.file)
        .then(function (r) { return r.json(); })
        .then(function (data) { return { meta: meta, data: data }; });
    })).then(function (results) {
      grid.innerHTML = "";
      results.forEach(function (result) {
        var count = result.data.questions ? result.data.questions.length : 0;
        var btn   = document.createElement("button");
        btn.type  = "button";
        btn.className = "mode-card";
        btn.innerHTML =
          '<div class="num">' + count + " question" + (count !== 1 ? "s" : "") + "</div>" +
          "<h3>" + escapeHtml(result.meta.title) + "</h3>" +
          '<div class="go">Select ' + SVG_ARROW + "</div>";
        btn.addEventListener("click", function () {
          activeQuizData = result.data;
          $("modeEyebrow").textContent = "Quiz \xb7 " + result.meta.title;
          showScreen("mode");
        });
        grid.appendChild(btn);
      });
    }).catch(function (err) {
      console.error("Failed to load quizzes:", err);
      grid.innerHTML = '<p style="color:var(--bad)">Failed to load quizzes.</p>';
    });
  }

  // ── Multiple-choice session ───────────────────────────────

  function startLibQuiz(data) {
    libQuizState = {
      order:   shuffle(data.questions.map(function (_, i) { return i; })),
      i:       0,
      viewing: 0,
      score:   0,
      done:    false,
      answers: {}
    };
    $("quizTotal").textContent = libQuizState.order.length;
    prepareQuestion(0);
    renderLibQuiz();
  }

  function prepareQuestion(pos) {
    var s = libQuizState;
    if (s.answers[pos]) return;
    var q = activeQuizData.questions[s.order[pos]];
    var correctText  = q.options[q.answer];
    var shuffledOpts = shuffle(q.options.slice());
    s.answers[pos] = {
      shuffledOptions: shuffledOpts,
      shuffledAnswer:  shuffledOpts.indexOf(correctText),
      picked:          null
    };
  }

  function renderLibQuiz() {
    var s    = libQuizState;
    var pos  = s.viewing;
    var a    = s.answers[pos];
    var q    = activeQuizData.questions[s.order[pos]];
    var card = $("quizCard");

    $("quizI").textContent     = pad2(pos + 1);
    $("quizN").textContent     = pad2(s.order.length);
    $("quizScore").textContent = s.score;
    $("quizWord").textContent  = q.question;
    $("quizProgress").style.width = ((s.done ? s.order.length : s.i) / s.order.length * 100) + "%";
    card.classList.remove("flash-good", "flash-bad");

    var box = $("quizChoices");
    box.innerHTML = "";
    $("quizReveal").innerHTML = "";

    if (a.picked !== null) {
      var ok = a.picked === a.shuffledAnswer;

      a.shuffledOptions.forEach(function (opt, idx) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice";
        btn.disabled = true;
        btn.innerHTML = '<span class="key">' + (idx + 1) + '</span><span>' + escapeHtml(opt) + '</span>';
        if (idx === a.shuffledAnswer)       btn.classList.add("is-correct");
        else if (idx === a.picked && !ok)   btn.classList.add("is-wrong");
        else                                btn.classList.add("dim");
        box.appendChild(btn);
      });

      if (ok) card.classList.add("flash-good");
      else    card.classList.add("flash-bad");

      $("quizReveal").innerHTML = buildReveal(ok, a.shuffledOptions[a.shuffledAnswer], q);

      var atEnd = pos === s.order.length - 1;
      $("quizNextBtn").innerHTML     = (atEnd ? "Finish" : "Next") + " " + SVG_ARROW;
      $("quizNextBtn").style.display = "";
      $("quizPrevBtn").style.display = pos > 0 ? "" : "none";
      $("quizNextBtn").focus();
    } else {
      a.shuffledOptions.forEach(function (opt, idx) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice";
        btn.innerHTML = '<span class="key">' + (idx + 1) + '</span><span>' + escapeHtml(opt) + '</span>';
        btn.addEventListener("click", function () { pickLibAnswer(idx, btn); });
        box.appendChild(btn);
      });

      $("quizNextBtn").style.display = "none";
      $("quizPrevBtn").style.display = pos > 0 ? "" : "none";
    }
  }

  function pickLibAnswer(idx, btn) {
    var s = libQuizState;
    var a = s.answers[s.i];
    if (a.picked !== null || s.done) return;

    a.picked = idx;
    if (idx === a.shuffledAnswer) s.score += 1;
    renderLibQuiz();
  }

  function libQuizNext() {
    var s = libQuizState;
    if (s.done) return;
    var a = s.answers[s.viewing];

    if (s.viewing === s.order.length - 1 && a && a.picked !== null) {
      s.done = true;
      $("quizProgress").style.width = "100%";
      var data = activeQuizData;
      showToast(s.score, s.order.length, function () { startLibQuiz(data); });
      return;
    }

    if (s.viewing < s.i) {
      s.viewing += 1;
      renderLibQuiz();
      return;
    }

    if (!a || a.picked === null) return;

    s.i += 1;
    s.viewing = s.i;
    prepareQuestion(s.i);
    renderLibQuiz();
  }

  function libQuizPrev() {
    var s = libQuizState;
    if (s.viewing <= 0) return;
    s.viewing -= 1;
    renderLibQuiz();
  }

  // ── Type-answer session ───────────────────────────────────

  function startTypeSession() {
    typeState = {
      order:    shuffle(activeQuizData.questions.map(function (_, i) { return i; })),
      i:        0,
      score:    0,
      status:   "idle",
      showHint: false,
      done:     false
    };
    $("typeTotal").textContent = typeState.order.length;
    renderTypeSession();
  }

  function renderTypeSession() {
    var s     = typeState;
    var input = $("typeInput");
    var q     = activeQuizData.questions[s.order[s.i]];

    $("typeI").textContent     = pad2(s.i + 1);
    $("typeN").textContent     = pad2(s.order.length);
    $("typeScore").textContent = s.score;
    $("typeWord").textContent  = q.question;
    $("typeProgress").style.width = ((s.done ? s.order.length : s.i) / s.order.length * 100) + "%";

    input.value = "";
    input.disabled = false;
    input.className = "answer-input";
    $("typeReveal").innerHTML    = "";
    $("typeCheckBtn").disabled   = true;
    $("typeCheckBtn").style.display = "";
    $("typeNextBtn").style.display  = "none";
    $("typeHintBtn").style.display  = "";
    $("typeHintBtn").textContent    = "show hint";

    $("typeCard").classList.remove("flash-good", "flash-bad");
    setTimeout(function () { input.focus(); }, 0);
  }

  function typeCheck() {
    var s = typeState;
    if (s.status !== "idle" || s.done) return;
    var input = $("typeInput");
    var guess = normalize(input.value);
    if (!guess) return;

    var q           = activeQuizData.questions[s.order[s.i]];
    var correctText = q.options[q.answer];
    var ok          = normalize(correctText) === guess;
    var card        = $("typeCard");

    if (ok) {
      s.status = "correct";
      s.score += 1;
      $("typeScore").textContent = s.score;
      input.classList.add("is-correct");
      card.classList.remove("flash-bad");
      card.classList.add("flash-good");
    } else {
      s.status = "wrong";
      input.classList.add("is-wrong");
      card.classList.remove("flash-good");
      card.classList.add("flash-bad");
    }

    $("typeReveal").innerHTML = buildReveal(ok, correctText, q);

    input.disabled = true;
    $("typeCheckBtn").style.display = "none";
    $("typeHintBtn").style.display  = "none";
    $("typeNextBtn").style.display  = "";
    $("typeNextBtn").innerHTML = (s.i + 1 >= s.order.length ? "Finish" : "Next") +
      ' <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
    $("typeNextBtn").focus();
  }

  function typeNext() {
    var s = typeState;
    if (s.i + 1 >= s.order.length) {
      s.done = true;
      $("typeProgress").style.width = "100%";
      showToast(s.score, s.order.length, startTypeSession);
      return;
    }
    s.i += 1;
    s.status = "idle";
    renderTypeSession();
  }

  function typeToggleHint() {
    var s = typeState;
    s.showHint = !s.showHint;
    $("typeHintBtn").textContent = s.showHint ? "hide hint" : "show hint";
    if (s.showHint) {
      var q    = activeQuizData.questions[s.order[s.i]];
      var mask = q.options[q.answer].replace(/[^ ]/g, "•");
      $("typeReveal").innerHTML = '<span class="hint-text">' + escapeHtml(mask) + '</span>';
    } else {
      $("typeReveal").innerHTML = "";
    }
  }

  // ── Anagram session ──────────────────────────────────────

  function startAnagramSession() {
    anagramState = {
      order: shuffle(activeQuizData.questions.map(function (_, i) { return i; })),
      i:       0,
      score:   0,
      done:    false,
      tiles:   [],
      placed:  [],
      checked: false,
      correctText: ""
    };
    $("anagramTotal").textContent = anagramState.order.length;
    renderAnagramSession();
  }

  function makeTiles(text) {
    var tiles = [];
    var id = 0;
    for (var i = 0; i < text.length; i++) {
      if (text[i] !== " ") tiles.push({ char: text[i], id: id++ });
    }
    return shuffle(tiles);
  }

  function renderAnagramSession() {
    var s = anagramState;
    var q = activeQuizData.questions[s.order[s.i]];
    s.correctText = q.options[q.answer];
    s.tiles   = makeTiles(s.correctText);
    s.placed  = [];
    s.checked = false;

    $("anagramI").textContent     = pad2(s.i + 1);
    $("anagramN").textContent     = pad2(s.order.length);
    $("anagramScore").textContent = s.score;
    $("anagramWord").textContent  = q.question;
    $("anagramProgress").style.width = ((s.done ? s.order.length : s.i) / s.order.length * 100) + "%";
    $("anagramReveal").innerHTML  = "";
    $("anagramCheckBtn").disabled = true;
    $("anagramCheckBtn").style.display = "";
    $("anagramNextBtn").style.display  = "none";
    $("anagramClearBtn").disabled = false;
    $("anagramHintBtn").disabled      = false;
    $("anagramHintBtn").style.display = "";
    $("anagramCard").classList.remove("flash-good", "flash-bad");
    renderTiles();
  }

  function renderTiles() {
    var s       = anagramState;
    var usedSet = {};
    s.placed.forEach(function (id) { usedSet[id] = true; });

    // Pool
    var pool = $("anagramTiles");
    pool.innerHTML = "";
    s.tiles.forEach(function (tile) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tile" + (usedSet[tile.id] ? " used" : "");
      btn.textContent = tile.char;
      btn.disabled = !!usedSet[tile.id] || s.checked;
      if (!usedSet[tile.id] && !s.checked) {
        btn.addEventListener("click", function () { anagramPlace(tile.id); });
      }
      pool.appendChild(btn);
    });

    // Answer area
    var answer = $("anagramAnswer");
    answer.innerHTML = "";
    s.placed.forEach(function (tid) {
      var tile = s.tiles.find(function (t) { return t.id === tid; });
      var btn  = document.createElement("button");
      btn.type = "button";
      btn.textContent = tile.char;
      if (s.checked) {
        var ok = s.placed.length === s.tiles.length &&
                 normalize(s.placed.map(function (id) {
                   return s.tiles.find(function (t) { return t.id === id; }).char;
                 }).join("")) === normalize(s.correctText.replace(/ /g, ""));
        btn.className = "tile " + (ok ? "correct" : "wrong");
        btn.disabled  = true;
      } else {
        btn.className = "tile";
        btn.addEventListener("click", function () { anagramRemove(tid); });
      }
      answer.appendChild(btn);
    });

    $("anagramCheckBtn").disabled = s.placed.length !== s.tiles.length;
  }

  function anagramPlace(id) {
    var s = anagramState;
    if (s.checked) return;
    s.placed.push(id);
    renderTiles();
  }

  function anagramRemove(id) {
    var s = anagramState;
    if (s.checked) return;
    s.placed = s.placed.filter(function (i) { return i !== id; });
    renderTiles();
  }

  function anagramClear() {
    var s = anagramState;
    if (s.checked) return;
    s.placed = [];
    renderTiles();
  }

  function anagramCheck() {
    var s = anagramState;
    if (s.placed.length !== s.tiles.length) return;
    s.checked = true;

    var built = s.placed.map(function (id) {
      return s.tiles.find(function (t) { return t.id === id; }).char;
    }).join("");
    var ok = normalize(built) === normalize(s.correctText.replace(/ /g, ""));

    var card = $("anagramCard");
    if (ok) {
      s.score += 1;
      $("anagramScore").textContent = s.score;
      card.classList.add("flash-good");
    } else {
      card.classList.add("flash-bad");
    }

    var q = activeQuizData.questions[s.order[s.i]];
    $("anagramReveal").innerHTML = buildReveal(ok, s.correctText, q);

    $("anagramClearBtn").disabled  = true;
    $("anagramHintBtn").style.display = "none";
    $("anagramCheckBtn").style.display = "none";
    $("anagramNextBtn").style.display  = "";
    $("anagramNextBtn").innerHTML =
      (s.i + 1 >= s.order.length ? "Finish" : "Next") + " " + SVG_ARROW;
    $("anagramNextBtn").focus();
    renderTiles();
  }

  function anagramNext() {
    var s = anagramState;
    if (s.i + 1 >= s.order.length) {
      s.done = true;
      $("anagramProgress").style.width = "100%";
      showToast(s.score, s.order.length, startAnagramSession);
      return;
    }
    s.i += 1;
    renderAnagramSession();
  }

  function findTileInPool(char) {
    var s = anagramState;
    var usedSet = {};
    s.placed.forEach(function (id) { usedSet[id] = true; });
    var tile = s.tiles.find(function (t) { return t.char === char && !usedSet[t.id]; });
    return tile ? tile.id : null;
  }

  function anagramHint() {
    var s = anagramState;
    if (s.checked) return;
    var correct = s.correctText.replace(/ /g, "").split("");
    for (var i = 0; i < correct.length; i++) {
      var neededChar = correct[i];
      var currentTileId = i < s.placed.length ? s.placed[i] : null;
      var currentChar   = currentTileId !== null
        ? s.tiles.find(function (t) { return t.id === currentTileId; }).char
        : null;
      if (currentChar === neededChar) continue;
      if (currentTileId === null) {
        // Position i not filled yet — append from pool
        var tid = findTileInPool(neededChar);
        if (tid !== null) s.placed.push(tid);
      } else {
        // Wrong tile at position i — swap with a later correct tile or pull from pool
        var swapIdx = -1;
        for (var j = i + 1; j < s.placed.length; j++) {
          if (s.tiles.find(function (t) { return t.id === s.placed[j]; }).char === neededChar) {
            swapIdx = j;
            break;
          }
        }
        if (swapIdx !== -1) {
          var tmp = s.placed[i];
          s.placed[i] = s.placed[swapIdx];
          s.placed[swapIdx] = tmp;
        } else {
          var tid2 = findTileInPool(neededChar);
          if (tid2 !== null) {
            s.placed.splice(i, 1);
            s.placed.splice(i, 0, tid2);
          }
        }
      }
      break;
    }
    renderTiles();
  }

  // ============================================================
  // Boot
  // ============================================================
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    if ($("screen-categories")) initQuiz();
  });

})();
