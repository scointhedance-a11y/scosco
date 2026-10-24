// ブラウザ内蔵の音声合成でリスニング問題を読み上げる
(function (root) {
  "use strict";

  var synth = root.speechSynthesis;
  var ACCENTS = ["en-US", "en-GB", "en-AU", "en-CA"];
  var ACCENT_LABEL = { "en-US": "米", "en-GB": "英", "en-AU": "豪", "en-CA": "加" };
  var FEMALE = /female|woman|samantha|karen|moira|tessa|victoria|zira|susan|serena|fiona|allison|ava|jenny|aria|libby|sonia|natasha|catherine|kate|hazel|clara|emma|olivia|amy|joanna|salli|kendra|kimberly|ivy|nicole|linda|heather/i;
  var MALE = /\bmale|man\b|daniel|alex|fred|david|mark|guy|ryan|thomas|lee|george|arthur|oliver|william|james|brian|matthew|joey|justin|russell|liam|eric|tom|aaron/i;

  var voices = [];
  var token = 0;

  function refresh() {
    if (!synth) return;
    voices = synth.getVoices().filter(function (v) { return /^en[-_]/i.test(v.lang); });
  }
  if (synth) {
    refresh();
    if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", refresh);
    else synth.onvoiceschanged = refresh;
  }

  function norm(lang) { return lang.replace("_", "-").toLowerCase(); }

  function gender(v) {
    if (FEMALE.test(v.name)) return "W";
    if (MALE.test(v.name)) return "M";
    return null;
  }

  // accent に合う声を選ぶ。話者の性別が判別できればそれを優先する
  function pick(accent, speaker) {
    if (!voices.length) refresh();
    var pool = voices.filter(function (v) { return norm(v.lang) === norm(accent); });
    if (!pool.length) pool = voices.filter(function (v) { return norm(v.lang).indexOf("en-us") === 0; });
    if (!pool.length) pool = voices;
    if (!pool.length) return null;
    if (speaker === "M" || speaker === "W") {
      var g = pool.filter(function (v) { return gender(v) === speaker; });
      if (g.length) return g[0];
      // 判別できなければ、男女で別の声を割り当てる
      return pool[speaker === "M" && pool.length > 1 ? 1 : 0];
    }
    return pool[0];
  }

  function accentFor(id, setting) {
    if (setting && setting !== "mix") return setting;
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return ACCENTS[h % ACCENTS.length];
  }

  function stop() {
    token++;
    if (synth) synth.cancel();
  }

  // segments: [{ text, accent, speaker, pause }]. 1つずつ順に読み上げる
  function play(segments, rate, onDone) {
    stop();
    if (!synth) { if (onDone) onDone(false); return; }
    var my = token;
    var i = 0;
    function next() {
      if (my !== token) return;
      if (i >= segments.length) { if (onDone) onDone(true); return; }
      var seg = segments[i++];
      var u = new SpeechSynthesisUtterance(seg.text);
      var v = pick(seg.accent || "en-US", seg.speaker);
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = seg.accent || "en-US"; }
      u.rate = rate || 1;
      // 同じ声しかない環境でも男女の区別がつくよう高さを変える
      u.pitch = seg.speaker === "M" ? 0.85 : seg.speaker === "W" ? 1.15 : 1;
      var advanced = false;
      function go() {
        if (advanced) return;
        advanced = true;
        setTimeout(next, seg.pause == null ? 350 : seg.pause);
      }
      u.onend = go;
      u.onerror = go;
      synth.speak(u);
    }
    next();
  }

  root.TOEIC_SPEECH = {
    available: !!synth,
    ACCENTS: ACCENTS, ACCENT_LABEL: ACCENT_LABEL,
    accentFor: accentFor, play: play, stop: stop,
    hasVoices: function () { refresh(); return voices.length > 0; }
  };
})(window);
