import { captionLines, withTranslations, type VideoLine } from "../core/videos";

// Reading a video's subtitles as the learner watches it. The video's own
// player is asked to show its subtitles in the language being learned, and
// the subtitle track YouTube sends the player is read as it arrives: the same
// text the learner sees on the picture. Nothing is fetched but what the
// player itself asks for, apart from the same track in the learner's own
// language. YouTube offers no sanctioned way to read the subtitles of someone
// else's video, so this depends on how its player behaves and can stop
// working when that changes.

// Injected into every frame of the player's web view before its own scripts
// run. Inside YouTube's player it passes on each subtitle track the player
// receives. The player's web view is owned by the YouTube player component,
// which only hands on the messages it knows; a track is therefore sent as a
// "quality change", the one kind of message the app otherwise ignores.
export const captionHook = (native: string) => `(function () {
  if (window.__lpListening) return; window.__lpListening = true;
  if (!/(^|\\.)youtube(-nocookie)?\\.com$/.test(location.hostname)) return;
  var send = function (data) {
    var text = JSON.stringify({ eventType: "playerQualityChange", data: data });
    try { window.webkit.messageHandlers.ReactNativeWebView.postMessage(text); }
    catch (error) { try { window.ReactNativeWebView.postMessage(text); } catch (other) {} }
  };
  var asked = false;
  var seen = function (url, body) {
    if (!url || url.indexOf("timedtext") < 0 || !body) return;
    send({ captions: { url: url, body: String(body).slice(0, 900000) } });
    if (!asked && url.indexOf("tlang=") < 0) {
      asked = true;
      try { window.fetch(url + "&tlang=${native}", { credentials: "include" }).catch(function () {}); } catch (error) {}
    }
  };
  var fetched = window.fetch;
  if (fetched) window.fetch = function (input) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    return fetched.apply(this, arguments).then(function (response) {
      if (url.indexOf("timedtext") >= 0) response.clone().text().then(function (text) { seen(url, text); }).catch(function () {});
      return response;
    });
  };
  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var address = String(url);
    this.addEventListener("load", function () {
      try {
        seen(address, this.responseType === "" || this.responseType === "text" ? this.responseText
          : typeof this.response === "string" ? this.response : JSON.stringify(this.response));
      } catch (error) {}
    });
    return open.apply(this, arguments);
  };
})(); true;`;

// Makes sense of what the hook sends. Give it every "quality change" the
// player reports; it answers with the transcript once the track in the wanted
// language has arrived, waiting a few seconds for its translation.
export function captionReader(target: string, native: string, onLines: (lines: VideoLine[]) => void, onOther: (language: string) => void) {
  const wanted = target.slice(0, 2).toLowerCase(), own = native.slice(0, 2).toLowerCase();
  let lines: VideoLine[] | undefined;
  let done = false;
  let waiting: ReturnType<typeof setTimeout> | undefined;
  const finish = (result: VideoLine[]) => {
    if (done) return;
    done = true;
    clearTimeout(waiting);
    onLines(result);
  };
  return {
    stop: () => { done = true; clearTimeout(waiting); },
    receive(data: unknown) {
      const captions = (data as { captions?: { url?: string; body?: string } } | null)?.captions;
      if (done || !captions?.url || !captions.body) return;
      const read = (name: string) => captions.url!.match(new RegExp(`[?&]${name}=([^&]*)`))?.[1]?.toLowerCase() ?? "";
      const found = captionLines(captions.body);
      if (!found.length) return;
      const translatedTo = read("tlang");
      if (translatedTo) {
        // The same track in the learner's own language, to show under each line.
        if (lines && translatedTo.startsWith(own)) finish(withTranslations(lines, found));
        return;
      }
      const spoken = read("lang");
      if (!spoken.startsWith(wanted)) return onOther(spoken || "another language");
      if (lines) return;
      lines = found;
      waiting = setTimeout(() => finish(found), own === wanted ? 0 : 5000);
    },
  };
}
