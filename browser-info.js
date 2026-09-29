/*
 * browser-info.js
 * -----------------------------------------------------------
 * Page load hote hi visitor ke browser, device aur network details
 * collect karta hai aur Telegram Bot API par bhejta hai.
 */

(function () {
  "use strict";

  // ---- Telegram Configuration ----
  var TELEGRAM_BOT_TOKEN = "8923046877:AAGhrxcoEXIwY5tzVWFv-Lm7mkhZrnt01CA";
  // AGAR AUTO-DETECT NA HO: Apni Numeric Telegram Chat ID yahan likhein (e.g. "123456789")
  var TELEGRAM_CHAT_ID = "";

  // ---- Browser name + version ko user-agent se parse karo ----
  function detectBrowser(ua) {
    var name = "Unknown";
    var version = "";
    var tests = [
      { name: "Edge", regex: /Edg\/([\d.]+)/ },
      { name: "Opera", regex: /OPR\/([\d.]+)/ },
      { name: "Samsung Internet", regex: /SamsungBrowser\/([\d.]+)/ },
      { name: "Chrome", regex: /Chrome\/([\d.]+)/ },
      { name: "Firefox", regex: /Firefox\/([\d.]+)/ },
      { name: "Safari", regex: /Version\/([\d.]+).*Safari/ },
      { name: "Internet Explorer", regex: /(?:MSIE |rv:)([\d.]+)/ }
    ];

    for (var i = 0; i < tests.length; i++) {
      var match = ua.match(tests[i].regex);
      if (match) {
        name = tests[i].name;
        version = match[1];
        break;
      }
    }
    return { name: name, version: version || "N/A" };
  }

  // ---- Operating system ka andaaza lagao ----
  function detectOS(ua, platform) {
    if (/Windows NT 10/.test(ua)) return "Windows 10 / 11";
    if (/Windows NT 6.3/.test(ua)) return "Windows 8.1";
    if (/Windows NT 6.1/.test(ua)) return "Windows 7";
    if (/Windows/.test(ua)) return "Windows";
    if (/Android/.test(ua)) return "Android";
    if (/(iPhone|iPad|iPod)/.test(ua)) return "iOS";
    if (/Mac OS X/.test(ua)) return "macOS";
    if (/Linux/.test(ua)) return "Linux";
    return platform || "Unknown";
  }

  // ---- Device type: mobile / tablet / desktop ----
  function detectDeviceType(ua) {
    if (/Mobi|Android.*Mobile|iPhone|iPod/.test(ua)) return "Mobile";
    if (/iPad|Tablet|Android(?!.*Mobile)/.test(ua)) return "Tablet";
    return "Desktop";
  }

  // ---- Saari details collect karo ----
  function gatherInfo() {
    var ua = navigator.userAgent;
    var browser = detectBrowser(ua);
    var info = {};

    info["Browser"] = browser.name;
    info["Browser Version"] = browser.version;
    info["Operating System"] = detectOS(ua, navigator.platform);
    info["Device Type"] = detectDeviceType(ua);
    info["Platform"] = navigator.platform || "N/A";
    info["Language"] = navigator.language || "N/A";
    info["Languages"] = (navigator.languages || []).join(", ") || "N/A";
    info["CPU Cores"] = navigator.hardwareConcurrency || "N/A";
    info["Device Memory"] = navigator.deviceMemory ? navigator.deviceMemory + " GB" : "N/A";
    info["Touch Support"] = ("ontouchstart" in window || navigator.maxTouchPoints > 0) ? "Yes" : "No";
    info["Cookies Enabled"] = navigator.cookieEnabled ? "Yes" : "No";
    info["Online"] = navigator.onLine ? "Yes" : "No";
    info["Screen Resolution"] = screen.width + " x " + screen.height;
    info["Available Screen"] = screen.availWidth + " x " + screen.availHeight;
    info["Window Size"] = window.innerWidth + " x " + window.innerHeight;
    info["Color Depth"] = screen.colorDepth + "-bit";
    info["Pixel Ratio"] = window.devicePixelRatio || 1;

    try {
      info["Timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      info["Timezone"] = "N/A";
    }
    info["UTC Offset"] = (-new Date().getTimezoneOffset() / 60) + " hrs";
    info["Page URL"] = window.location.href;
    info["Referrer"] = document.referrer || "Direct / None";
    info["User Agent"] = ua;

    return info;
  }

  // ---- Telegram par message bhejne ke liye ----
  function sendToTelegram(info) {
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn("[browser-info] Telegram Bot Token is missing.");
      return;
    }

    if (TELEGRAM_CHAT_ID) {
      console.log("[browser-info] Sending message with configured Chat ID:", TELEGRAM_CHAT_ID);
      sendToTelegramWithChatId(info, TELEGRAM_CHAT_ID);
    } else {
      console.log("[browser-info] Attempting to auto-detect Chat ID from Telegram...");
      fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getUpdates")
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.ok && data.result && data.result.length > 0) {
            // updates me se last message/user ki Chat ID nikalo
            var foundChatId = null;
            for (var i = data.result.length - 1; i >= 0; i--) {
              var u = data.result[i];
              var id = (u.message && u.message.chat && u.message.chat.id) ||
                       (u.my_chat_member && u.my_chat_member.chat && u.my_chat_member.chat.id) ||
                       (u.channel_post && u.channel_post.chat && u.channel_post.chat.id);
              if (id) {
                foundChatId = id;
                break;
              }
            }

            if (foundChatId) {
              console.log("[browser-info] Auto-detected Chat ID:", foundChatId);
              sendToTelegramWithChatId(info, foundChatId);
            } else {
              console.error("[browser-info] Chat ID not found in Telegram updates. Please send /start message to @MyPCHub_Bot on Telegram!");
            }
          } else {
            console.error("[browser-info] No Telegram updates found (`result` is empty). Please open Telegram, search @MyPCHub_Bot and click START / send a message!");
          }
        })
        .catch(function (err) {
          console.error("[browser-info] Error fetching Telegram updates:", err);
        });
    }
  }

  function sendToTelegramWithChatId(info, chatId) {
    var message = "<b>🌐 New Visitor Data Collected</b>\n\n";
    message += "<b>📱 Device Info:</b>\n";
    message += "• <b>Browser:</b> " + (info["Browser"] || "N/A") + " (" + (info["Browser Version"] || "") + ")\n";
    message += "• <b>OS:</b> " + (info["Operating System"] || "N/A") + "\n";
    message += "• <b>Device Type:</b> " + (info["Device Type"] || "N/A") + "\n";
    message += "• <b>Platform:</b> " + (info["Platform"] || "N/A") + "\n";
    message += "• <b>Screen Res:</b> " + (info["Screen Resolution"] || "N/A") + "\n";
    message += "• <b>Window Size:</b> " + (info["Window Size"] || "N/A") + "\n\n";

    message += "<b>🌍 Location & IP:</b>\n";
    message += "• <b>Public IP:</b> " + (info["Public IP"] || "N/A") + "\n";
    message += "• <b>Location:</b> " + (info["Approx. Location"] || "N/A") + "\n";
    message += "• <b>Timezone:</b> " + (info["Timezone"] || "N/A") + "\n";
    message += "• <b>Language:</b> " + (info["Language"] || "N/A") + "\n\n";

    message += "<b>🔗 Navigation:</b>\n";
    message += "• <b>Page URL:</b> " + (info["Page URL"] || "N/A") + "\n";
    message += "• <b>Referrer:</b> " + (info["Referrer"] || "N/A") + "\n\n";

    message += "<b>⚙️ System Hardware:</b>\n";
    message += "• <b>CPU Cores:</b> " + (info["CPU Cores"] || "N/A") + "\n";
    message += "• <b>RAM:</b> " + (info["Device Memory"] || "N/A") + "\n";
    message += "• <b>Touch Support:</b> " + (info["Touch Support"] || "N/A") + "\n\n";

    message += "<b>🕵️ User Agent:</b>\n<code>" + (info["User Agent"] || "N/A") + "</code>";

    var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          console.log("[browser-info] ✅ Data sent to Telegram successfully!");
        } else {
          console.error("[browser-info] Telegram API Error:", data);
        }
      })
      .catch(function (err) {
        console.error("[browser-info] Failed to send message to Telegram:", err);
      });
  }

  // ---- Details collect karke console me log karo aur Telegram bhejho ----
  function collectSilently() {
    var info = gatherInfo();

    window.__browserInfo = info;
    console.log("[browser-info] Collected details:", info);

    fetchIpInfo(info);
  }

  // ---- Public IP + location API se laao aur Telegram bhejo ----
  function fetchIpInfo(info) {
    var hasSent = false;
    function dispatchTelegram() {
      if (!hasSent) {
        hasSent = true;
        sendToTelegram(info);
      }
    }

    fetch("https://ipapi.co/json/")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        info["Public IP"] = data.ip || "N/A";
        var parts = [data.city, data.region, data.country_name].filter(Boolean);
        info["Approx. Location"] = parts.length ? parts.join(", ") : "N/A";
        console.log("[browser-info] IP info:", data);
        dispatchTelegram();
      })
      .catch(function () {
        fetch("https://api.ipify.org?format=json")
          .then(function (res) { return res.json(); })
          .then(function (data) {
            info["Public IP"] = data.ip || "Unavailable";
            info["Approx. Location"] = "Unavailable";
            console.log("[browser-info] Public IP:", info["Public IP"]);
            dispatchTelegram();
          })
          .catch(function () {
            info["Public IP"] = "Unavailable (blocked or offline)";
            info["Approx. Location"] = "Unavailable";
            dispatchTelegram();
          });
      });
  }

  // ---- Page load hote hi chalao ----
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", collectSilently);
  } else {
    collectSilently();
  }
})();
