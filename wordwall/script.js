(function () {
  "use strict";

  // ============================================================
  // Sample data (fallback when no URL is set or URL fails)
  // ============================================================
  var SAMPLE = {
    title: "Spanish Basics",
    source: "English → Spanish",
    items: [
      { word: "hello",     answer: "hola" },
      { word: "goodbye",   answer: "adios" },
      { word: "thank you", answer: "gracias" },
      { word: "please",    answer: "por favor" },
      { word: "yes",       answer: "si" },
      { word: "no",        answer: "no" },
      { word: "water",     answer: "agua" },
      { word: "bread",     answer: "pan" },
      { word: "house",     answer: "casa" },
      { word: "book",      answer: "libro" },
      { word: "friend",    answer: "amigo" },
      { word: "love",      answer: "amor" },
      { word: "morning",   answer: "manana" },
      { word: "night",     answer: "noche" },
      { word: "sun",       answer: "sol" },
      { word: "moon",      answer: "luna" },
      { word: "dog",       answer: "perro" },
      { word: "cat",       answer: "gato" },
      { word: "school",    answer: "escuela" },
      { word: "teacher",   answer: "maestro" }
    ]
  };

  // ============================================================
  // State
  // ============================================================
  var deck = null;
  var dataUrl = localStorage.getItem("wordstudy.url") || "";

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

  // ============================================================
  // Data loading
  // ============================================================
  function normalizeDeck(raw) {
    if (!raw) return null;
    var items = null, title = null, source = null;
    if (Array.isArray(raw)) {
      items = raw;
    } else if (typeof raw === "object") {
      items = raw.items || raw.cards || raw.words || raw.data;
      title  = raw.title  || raw.name;
      source = raw.source || raw.subtitle;
    }
    if (!Array.isArray(items)) return null;

    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || typeof it !== "object") continue;
      var word   = it.word   != null ? it.word   : it.q != null ? it.q : it.question != null ? it.question : it.term  != null ? it.term  : it.front;
      var answer = it.answer != null ? it.answer : it.a != null ? it.a : it.translation != null ? it.translation : it.definition != null ? it.definition : it.back;
      if (word == null || answer == null) continue;
      var aliases = Array.isArray(it.aliases) ? it.aliases : (it.alt ? [].concat(it.alt) : []);
      out.push({ word: String(word), answer: String(answer), aliases: aliases.map(String) });
    }
    if (!out.length) return null;

    return { title: title || "Word study", source: source || null, items: out };
  }

  async function loadDeck() {
    if (dataUrl) {
      try {
        var res = await fetch(dataUrl, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        var json = await res.json();
        var d = normalizeDeck(json);
        if (!d) throw new Error("no items found");
        deck = d;
        return { usingSample: false };
      } catch (err) {
        console.warn("Custom URL failed, using sample:", err);
        deck = normalizeDeck(SAMPLE);
        return { usingSample: true, error: err.message };
      }
    }
    deck = normalizeDeck(SAMPLE);
    return { usingSample: true };
  }



  // ============================================================
  // Toast
  // ============================================================
  function showToast(score, total, onRestart) {
    var pct = Math.round((score / total) * 100);
    var verdict =
      pct >= 90 ? "Excellent." :
      pct >= 70 ? "Nice work." :
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
  // Page: HOME
  // ============================================================
  function reloadDeck() {
    $("goType").disabled = true;
    $("goQuiz").disabled = true;
    setStatus("loading…");

    loadDeck().then(function (result) {

      var meta = $("deckMeta");
     

      if (result.error) {
        setStatus("URL failed: " + result.error + " — using sample", "err");
      } else if (result.usingSample) {
        setStatus("fallback \xb7 embedded sample");
      } else {
        setStatus("loaded ✓", "ok");
      }

      $("goType").disabled = false;
      $("goQuiz").disabled = false;
    });
  }

  function initHome() {
    $("urlInput").value = dataUrl;
    showResetBtn(!!dataUrl);

    // Navigation — wired once, never duplicated
    $("goType").addEventListener("click", function () {
      window.location.href = "type.html";
    });
    $("goQuiz").addEventListener("click", function () {
      window.location.href = "quiz.html";
    });

    $("loadBtn").addEventListener("click", function () {
      dataUrl = $("urlInput").value.trim();
      localStorage.setItem("wordstudy.url", dataUrl);
      showResetBtn(!!dataUrl);
      reloadDeck();
    });

    $("resetBtn").addEventListener("click", function () {
      dataUrl = "";
      $("urlInput").value = "";
      localStorage.removeItem("wordstudy.url");
      showResetBtn(false);
      reloadDeck();
    });

    $("urlInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); $("loadBtn").click(); }
    });

    reloadDeck();
  }

  function setStatus(text, kind) {
    var el = $("sourceStatus");
    if (!el) return;
    el.className = "source-status" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function showResetBtn(show) {
    $("resetBtn").style.display = show ? "" : "none";
  }

  // ============================================================
  // Page: TYPE THE ANSWER
  // ============================================================
  var typeState     = null;
  var activeTypeDeck = null;

  function initType() {
    $("backToTypeCategories").addEventListener("click", function () { showTypeScreen("categories"); });
    $("backToTypeDecks").addEventListener("click",      function () { showTypeScreen("decks"); });

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

    fetch("libs/type/index.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var groups = {};
        data.decks.forEach(function (d) {
          if (!groups[d.category]) groups[d.category] = [];
          groups[d.category].push(d);
        });
        renderTypeCategories(groups);
        showTypeScreen("categories");
      })
      .catch(function (err) { console.error("Failed to load type index:", err); });
  }

  function showTypeScreen(name) {
    $("screen-type-categories").style.display = name === "categories" ? "" : "none";
    $("screen-type-decks").style.display      = name === "decks"      ? "" : "none";
    $("screen-type-session").style.display    = name === "session"    ? "" : "none";
    window.scrollTo(0, 0);
  }

  function renderTypeCategories(groups) {
    var grid = $("typeCategoryGrid");
    grid.innerHTML = "";
    Object.keys(groups).forEach(function (cat, i) {
      var list = groups[cat];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-card";
      btn.innerHTML =
        '<div class="num">0' + (i + 1) + ' / ' + escapeHtml(cat.toLowerCase()) + '</div>' +
        '<h3>' + escapeHtml(cat) + '</h3>' +
        '<p>' + list.length + ' deck' + (list.length !== 1 ? 's' : '') + ' available</p>' +
        '<div class="go">Browse ' + SVG_ARROW + '</div>';
      btn.addEventListener("click", function () {
        $("typeCategoryEyebrow").textContent = "Category \xb7 " + cat;
        renderTypeDeckList(list);
        showTypeScreen("decks");
      });
      grid.appendChild(btn);
    });
  }

  function renderTypeDeckList(decks) {
    var grid = $("typeDeckGrid");
    grid.innerHTML = "";
    decks.forEach(function (meta) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-card";
      btn.innerHTML =
        '<div class="num">' + (meta.itemCount || 0) + ' words</div>' +
        '<h3>' + escapeHtml(meta.title) + '</h3>' +
        '<div class="go">Start ' + SVG_ARROW + '</div>';
      btn.addEventListener("click", function () {
        fetch("libs/type/" + meta.file)
          .then(function (r) { return r.json(); })
          .then(function (data) {
            activeTypeDeck = normalizeDeck(data);
            showTypeScreen("session");
            startTypeSession();
          })
          .catch(function (err) { console.error("Failed to load deck:", err); });
      });
      grid.appendChild(btn);
    });
  }

  function startTypeSession() {
    typeState = {
      order:    shuffle(activeTypeDeck.items.map(function (_, i) { return i; })),
      i:        0,
      score:    0,
      status:   "idle",
      showHint: false,
      done:     false
    };
    $("typeTotal").textContent = typeState.order.length;
    renderType();
  }

  function renderType() {
    var s = typeState;
    var card = $("typeCard");
    var input = $("typeInput");
    var current = activeTypeDeck.items[s.order[s.i]];

    $("typeI").textContent     = pad2(s.i + 1);
    $("typeN").textContent     = pad2(s.order.length);
    $("typeScore").textContent = s.score;
    $("typeWord").textContent  = current.word;
    $("typeProgress").style.width = ((s.done ? s.order.length : s.i) / s.order.length * 100) + "%";

    input.value = "";
    input.disabled = false;
    input.className = "answer-input";
    $("typeReveal").innerHTML = "";
    $("typeCheckBtn").disabled = true;
    $("typeCheckBtn").style.display = "";
    $("typeNextBtn").style.display  = "none";
    $("typeHintBtn").style.display  = "";
    $("typeHintBtn").textContent    = "show hint";

    card.classList.remove("flash-good", "flash-bad");
    setTimeout(function () { input.focus(); }, 0);
  }

  function typeCheck() {
    var s = typeState;
    if (s.status !== "idle" || s.done) return;
    var input = $("typeInput");
    var guess = normalize(input.value);
    if (!guess) return;

    var current = activeTypeDeck.items[s.order[s.i]];
    var candidates = [current.answer].concat(current.aliases || []).map(normalize);
    var ok = candidates.indexOf(guess) !== -1;

    var card = $("typeCard");
    if (ok) {
      s.status = "correct";
      s.score += 1;
      $("typeScore").textContent = s.score;
      input.classList.add("is-correct");
      $("typeReveal").innerHTML = '<span class="ok">Correct.</span> &nbsp;<b>' + escapeHtml(current.answer) + '</b>';
      card.classList.remove("flash-bad");
      card.classList.add("flash-good");
    } else {
      s.status = "wrong";
      input.classList.add("is-wrong");
      $("typeReveal").innerHTML = '<span class="x">Not quite.</span> &nbsp;Answer: <b>' + escapeHtml(current.answer) + '</b>';
      card.classList.remove("flash-good");
      card.classList.add("flash-bad");
    }
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
    renderType();
  }

  function typeToggleHint() {
    var s = typeState;
    s.showHint = !s.showHint;
    $("typeHintBtn").textContent = s.showHint ? "hide hint" : "show hint";
    if (s.showHint) {
      var current = activeTypeDeck.items[s.order[s.i]];
      var mask = current.answer.replace(/[^ ]/g, "•");
      $("typeReveal").innerHTML = '<span class="hint-text">' + escapeHtml(mask) + '</span>';
    } else {
      $("typeReveal").innerHTML = "";
    }
  }

  // ============================================================
  // Page: QUIZ (category → quiz → questions)
  // ============================================================
  var libQuizState = null;
  var activeQuizData = null;

  var SVG_ARROW = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
  var SVG_MOON  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var SVG_SUN   = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll(".theme-btn").forEach(function (btn) {
      btn.innerHTML = theme === "dark" ? SVG_SUN : SVG_MOON;
      btn.title = theme === "dark" ? "Switch to light" : "Switch to dark";
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

  function showQuizScreen(name) {
    $("screen-categories").style.display = name === "categories" ? "" : "none";
    $("screen-quizzes").style.display    = name === "quizzes"    ? "" : "none";
    $("screen-quiz").style.display       = name === "quiz"       ? "" : "none";
    window.scrollTo(0, 0);
  }

  function initQuiz() {
    $("backToCategories").addEventListener("click", function () { showQuizScreen("categories"); });
    $("backToQuizzes").addEventListener("click", function () { showQuizScreen("quizzes"); });
    $("quizNextBtn").addEventListener("click", libQuizNext);
    $("quizPrevBtn").addEventListener("click", libQuizPrev);

    window.addEventListener("keydown", function (e) {
      if ($("screen-quiz").style.display === "none") return;
      if (!libQuizState || libQuizState.done) return;
      var s = libQuizState;

      if (s.viewing < s.i || s.answers[s.i] !== undefined) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); libQuizNext(); }
        return;
      }

      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= s.shuffledOptions.length) {
        var btns = $("quizChoices").querySelectorAll(".choice");
        if (btns[n - 1] && !btns[n - 1].disabled) pickLibAnswer(n - 1, btns[n - 1]);
      }
    });

    fetch("libs/quiz/index.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var groups = {};
        data.quizzes.forEach(function (q) {
          if (!groups[q.category]) groups[q.category] = [];
          groups[q.category].push(q);
        });
        renderCategories(groups);
        showQuizScreen("categories");
      })
      .catch(function (err) {
        console.error("Failed to load quiz index:", err);
      });
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
        showQuizScreen("quizzes");
      });
      grid.appendChild(btn);
    });
  }

  function renderQuizList(quizzes) {
    var grid = $("quizGrid");
    grid.innerHTML = "";
    quizzes.forEach(function (meta) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-card";
      btn.innerHTML =
        '<div class="num">' + (meta.questionCount || 0) + ' questions</div>' +
        '<h3>' + escapeHtml(meta.title) + '</h3>' +
        '<div class="go">Start ' + SVG_ARROW + '</div>';
      btn.addEventListener("click", function () {
        fetch("libs/quiz/" + meta.file)
          .then(function (r) { return r.json(); })
          .then(function (data) {
            activeQuizData = data;
            showQuizScreen("quiz");
            startLibQuiz(data);
          })
          .catch(function (err) { console.error("Failed to load quiz:", err); });
      });
      grid.appendChild(btn);
    });
  }

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
    var s   = libQuizState;
    var pos = s.viewing;
    var a   = s.answers[pos];
    var q   = activeQuizData.questions[s.order[pos]];
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

      if (q.explanation) {
        $("quizReveal").innerHTML =
          '<span class="' + (ok ? "ok" : "x") + '">' + (ok ? "Correct." : "Incorrect.") + '</span>' +
          '  ' + escapeHtml(q.explanation);
      } else {
        $("quizReveal").innerHTML = ok
          ? '<span class="ok">Correct.</span>'
          : '<span class="x">Incorrect.</span> &nbsp;Answer: <b>' + escapeHtml(a.shuffledOptions[a.shuffledAnswer]) + '</b>';
      }

      var atEnd = pos === s.order.length - 1;
      $("quizNextBtn").innerHTML = (atEnd ? "Finish" : "Next") + " " + SVG_ARROW;
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
    if (idx === a.shuffledAnswer) {
      s.score += 1;
    }
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

  // ============================================================
  // Boot — detect which page we're on
  // ============================================================
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    if ($("goType"))                       initHome();
    else if ($("screen-type-categories")) initType();
    else if ($("screen-categories"))       initQuiz();
  });

})();
