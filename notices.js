(() => {
  "use strict";

  const jsonUrl = new URL("notices.json", document.currentScript.src);
  const storageKey = id => `app-menu:notice:dismissed:${id}`;

  function isDismissed(id) {
    try {
      return localStorage.getItem(storageKey(id)) === "1";
    } catch {
      return false;
    }
  }

  function showNotice(notice) {
    return new Promise(resolve => {
      const dialog = document.createElement("dialog");
      dialog.className = "app-menu-notice";
      dialog.setAttribute("aria-labelledby", "app-menu-notice-title");
      dialog.setAttribute("aria-describedby", "app-menu-notice-message");
      dialog.innerHTML = `
        <h2 id="app-menu-notice-title"></h2>
        <p id="app-menu-notice-message"></p>
        <label><input type="checkbox"> 今後このお知らせを表示しない</label>
        <button type="button" autofocus>閉じる</button>
      `;

      dialog.querySelector("h2").textContent = notice.title || "お知らせ";
      dialog.querySelector("p").textContent = notice.message;

      const dismiss = dialog.querySelector("input");

      function close() {
        if (dismiss.checked) {
          try {
            localStorage.setItem(storageKey(notice.id), "1");
          } catch {
            console.warn("お知らせの非表示設定を保存できませんでした。");
          }
        }
        dialog.close();
      }

      dialog.querySelector("button").addEventListener("click", close);
      dialog.addEventListener("cancel", event => {
        event.preventDefault();
        close();
      });
      dialog.addEventListener("close", () => {
        dialog.remove();
        resolve();
      }, { once: true });

      document.body.append(dialog);
      try {
        dialog.showModal();
      } catch (error) {
        dialog.remove();
        throw error;
      }
    });
  }

  async function loadNotices() {
    try {
      const response = await fetch(jsonUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data?.notices)) return;

      const now = Date.now();
      const ids = new Set();

      const activeNotices = data.notices.filter(notice => {
        if (typeof notice?.id !== "string" || !notice.id.trim() ||
            typeof notice.message !== "string" || !notice.message.trim()) {
          return false;
        }

        const start = notice.start ? Date.parse(notice.start) : -Infinity;
        const end = notice.end ? Date.parse(notice.end) : Infinity;

        if (!(now >= start && now < end) || ids.has(notice.id)) return false;

        ids.add(notice.id);
        return !isDismissed(notice.id);
      });

      if (!activeNotices.length) return;

      const style = document.createElement("style");
      style.textContent = `
        dialog.app-menu-notice {
          position: fixed;
          inset: 0;
          box-sizing: border-box;
          width: min(440px, calc(100% - 32px));
          max-height: calc(100% - 32px);
          margin: auto;
          padding: 22px;
          border: 1px solid #d7e1da;
          border-radius: 16px;
          background: #fff;
          color: #192e26;
          overflow: auto;
          font: 1rem/1.6 system-ui, sans-serif;
        }

        dialog.app-menu-notice::backdrop {
          background: rgb(0 0 0 / 48%);
        }

        .app-menu-notice h2 {
          margin: 0 0 10px;
          font-size: 1.2rem;
        }

        .app-menu-notice p {
          margin: 0 0 18px;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .app-menu-notice label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .app-menu-notice input {
          margin: 0;
          width: 18px;
          height: 18px;
          flex: 0 0 auto;
        }

        .app-menu-notice button {
          display: block;
          width: 100%;
          min-height: 44px;
          margin-top: 16px;
          border: 0;
          border-radius: 9px;
          background: #22533f;
          color: white;
          font: inherit;
          cursor: pointer;
        }
      `;

      document.head.append(style);

      for (const notice of activeNotices) {
        if (!isDismissed(notice.id)) await showNotice(notice);
      }
    } catch (error) {
      console.warn("お知らせを表示できませんでした。", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadNotices, { once: true });
  } else {
    loadNotices();
  }
})();