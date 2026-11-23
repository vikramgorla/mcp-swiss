/* Behaviour for the mcp-swiss site. SwissSearch and CATALOGUE come from the
   inline script that build-site.mjs generates from the real server code. */
(function () {
  "use strict";

  // ── Question board: the server's own swiss_search_tools ranking ──────────
  var ask = document.getElementById("ask");
  var rows = document.getElementById("board-rows");
  var clock = document.getElementById("clock");

  function render() {
    var query = ask.value.trim();
    rows.textContent = "";
    if (!query) {
      var empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "Type what you want to know, in plain words.";
      rows.appendChild(empty);
      return;
    }
    var result = JSON.parse(window.SwissSearch.searchTools(window.CATALOGUE, { query: query, limit: 5 }));
    if (!result.tools.length) {
      var none = document.createElement("li");
      none.className = "empty";
      none.textContent = "No tool matches. Try other words, or browse the tools below.";
      rows.appendChild(none);
      return;
    }
    result.tools.forEach(function (tool, i) {
      var li = document.createElement("li");
      var rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = String(i + 1);
      var name = document.createElement("span");
      name.className = "row-name";
      name.textContent = tool.name;
      var mod = document.createElement("span");
      mod.className = "row-mod";
      mod.textContent = tool.module;
      var desc = document.createElement("span");
      desc.className = "row-desc";
      desc.textContent = tool.description;
      li.append(rank, name, mod, desc);
      rows.appendChild(li);
    });
  }

  if (ask && window.SwissSearch) {
    ask.addEventListener("input", render);
    document.querySelectorAll(".board-examples button").forEach(function (button) {
      button.addEventListener("click", function () {
        ask.value = button.textContent;
        render();
        ask.focus();
      });
    });
    render();
  }

  function tick() {
    var now = new Date();
    clock.textContent = now.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" });
  }
  if (clock) { tick(); setInterval(tick, 15000); }

  // ── Copy buttons ─────────────────────────────────────────────────────────
  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var text = document.getElementById(button.getAttribute("data-copy")).textContent;
      navigator.clipboard.writeText(text).then(function () {
        button.textContent = "Copied";
        setTimeout(function () { button.textContent = "Copy"; }, 1600);
      }, function () {
        button.textContent = "Select and copy";
      });
    });
  });

  // ── Install tabs (arrow keys move between them) ──────────────────────────
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (tab, i) {
    tab.tabIndex = i === 0 ? 0 : -1;
    tab.addEventListener("click", function () { select(tab); });
    tab.addEventListener("keydown", function (e) {
      var next = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!next) return;
      var target = tabs[(i + next + tabs.length) % tabs.length];
      select(target);
      target.focus();
    });
  });

  // ── Catalogue filter ─────────────────────────────────────────────────────
  var filter = document.getElementById("filter");
  var emptyNote = document.getElementById("filter-empty");
  if (filter) {
    filter.addEventListener("input", function () {
      var words = filter.value.toLowerCase().split(/\s+/).filter(Boolean);
      var shown = 0;
      document.querySelectorAll(".module").forEach(function (mod) {
        // Match on each tool's own text plus the module name, so "river" shows
        // the water tools, not every weather tool.
        var modText = mod.querySelector(".mod-name").textContent.toLowerCase();
        var anyTool = false;
        mod.querySelectorAll(".tool").forEach(function (tool) {
          var text = modText + " " + tool.textContent.toLowerCase();
          var match = words.every(function (w) { return text.indexOf(w) !== -1; });
          tool.hidden = !match;
          if (match) anyTool = true;
        });
        mod.hidden = !anyTool;
        mod.open = words.length > 0 && anyTool;
        if (anyTool) shown++;
      });
      emptyNote.hidden = shown > 0;
    });
  }
})();
