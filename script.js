if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}


// Add this at the beginning of your script.js
function detectBrowserLanguage() {
    const userLang = navigator.language || navigator.userLanguage;
    if (userLang.startsWith('zh')) return 'zh';
    else if (userLang.startsWith('jp')) return 'jp';
    return 'en'; // default
}

/**
 * Loads the language preference and updates all translatable elements on the page.
 * @param {string} lang - The language code to load (e.g. 'en', 'zh', 'jp').
 */
function loadLanguage(lang) {
    // Update all translatable elements
    $('[data-i18n]').each(function() {
        const key = $(this).data('i18n');
        $(this).text(translations[lang][key]);
    });
    
    // Update select dropdown
    $('#language-select').val(lang);
    
    // Save preference
    localStorage.setItem('language', lang);
    
    // Update HTML lang attribute
    $('html').attr('lang', lang);
    
    // Adjust font family for Chinese/Japanese
    if (lang === 'zh') {
        $('body').css('font-family', "'Noto Sans TC', sans-serif");
    } else {
        $('body').css('font-family', "'Noto Sans', sans-serif");
    }
}

// NOTE:
// ---------------------------------------------------------------------------------//
const opened_books = ["000", "001", "003", "004", "005", "008", "009", "saytoben", "summer2025", "010", "011", "012", "teachers2025"];
const beta_books = [];
// ---------------------------------------------------------------------------------//

/**
 * Loads all available books and displays them in the #books-list element.
 * Each book is clickable and will open the corresponding book page when clicked.
 * If the book is not publicly accessible, a prompt will appear asking for a
 * username and password. If the entered credentials are valid, the book page
 * will be opened. If not, nothing will happen.
 */
function loadBooks() {
    $("#books-list").empty();
    if (opened_books.length == 0) {
        $("#books-list").append("呃... 沒有東西... Nothing to see here!");
    } else {
        for (let i = 0; i < opened_books.length; i++) {
            $.ajax({
                url: `templates/Thumbnails/${opened_books[i]}.html`,
                success: function(data) {
                    $("#books-list").append(data);
                },
                async: false
            });
        }
        if (localStorage.getItem("betaticket") && Number(localStorage.getItem("betaticket").quantity) > 0) {
            for (let i = 0; i < beta_books.length; i++) {
                $.ajax({
                    url: `templates/Thumbnails/${beta_books[i]}.html`,
                    success: function(data) {
                        $("#books-list").append(data);
                    },
                    async: false
                });
            }
        }
        loadLanguage(localStorage.getItem('language') || detectBrowserLanguage());
        $("#books-list").on("click", ".book", function() {
            // open book iframe logic here
            const lang = localStorage.getItem('language') || detectBrowserLanguage();
            loadPage("book", lang, $(this).data("ebook"));
        });        
    }
}

// ----------
/*
========================================================================================
 Banning Process Overview (Front-end IndexedDB helpers)
 ---------------------------------------------------------------------------------------
 1. When a user submits feedback, their public IP is fetched and stored in localStorage
    as "lastip" for admin convenience.
 2. Before accepting feedback, submitFeedback() checks if the IP is in the local ban list
    (IndexedDB: "happy_ebook_bans", store: "banned_ips", keyPath: "ip").
    - If banned, the feedback is silently blocked (no alert shown to user).
 3. On every page load (in $(document).ready()), the script fetches the user's IP.
    - If the IP is banned, an alert is shown, and the main content is replaced with an
      "Access denied" message. No further page loading occurs for banned IPs.
 4. Admins can ban or unban IPs using helper functions (window._bans) or by calling
    banLastIP() from the console (which bans the last feedback submitter).
 5. The ban list is local to the user's browser. For global bans, server-side enforcement
    is required.
========================================================================================
*/
// ---------- IndexedDB helpers for banned IPs (front-end only) ----------
// database: "happy_ebook_bans"; store: "banned_ips"; keyPath: "ip"
function openBansDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('happy_ebook_bans', 1);
    req.onupgradeneeded = function (ev) {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains('banned_ips')) {
        const store = db.createObjectStore('banned_ips', { keyPath: 'ip' });
        store.createIndex('created_at', 'created_at');
      }
    };
    req.onsuccess = function (ev) {
      resolve(ev.target.result);
    };
    req.onerror = function (ev) {
      reject(ev.target.error);
    };
  });
}

async function addBannedIP(ip, reason = '') {
  if (!ip) return false;
  const db = await openBansDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('banned_ips', 'readwrite');
    const store = tx.objectStore('banned_ips');
    const record = { ip: ip, reason: reason, created_at: new Date().toISOString() };
    const r = store.put(record);
    r.onsuccess = () => { resolve(true); };
    r.onerror = (e) => { reject(e.target.error); };
  });
}

async function removeBannedIP(ip) {
  const db = await openBansDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('banned_ips', 'readwrite');
    const store = tx.objectStore('banned_ips');
    const r = store.delete(ip);
    r.onsuccess = () => resolve(true);
    r.onerror = (e) => reject(e.target.error);
  });
}

async function isIPBanned(ip) {
  if (!ip) return false;
  try {
    const db = await openBansDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('banned_ips', 'readonly');
      const store = tx.objectStore('banned_ips');
      const r = store.get(ip);
      r.onsuccess = () => resolve(!!r.result);
      r.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    // If IndexedDB is not available for some reason, be conservative and treat as not banned
    console.error('isIPBanned error', e);
    return false;
  }
}

// helper to list banned IPs (useful for admin view in console)
async function listBannedIPs() {
  const db = await openBansDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('banned_ips', 'readonly');
    const store = tx.objectStore('banned_ips');
    const items = [];
    store.openCursor().onsuccess = function (ev) {
      const cursor = ev.target.result;
      if (cursor) {
        items.push(cursor.value);
        cursor.continue();
      } else {
        resolve(items);
      }
    };
  });
}

// utility: ban the last IP that was saved in localStorage (set by submitFeedback)
window.banLastIP = async function(reason = '') {
  const ip = localStorage.getItem('lastip');
  if (!ip) {
    alert('No last IP found in localStorage. Submit a comment first or provide an IP.');
    return;
  }
  await addBannedIP(ip, reason);
  alert('Banned IP: ' + ip);
};

// utility: expose functions to window for quick admin use from console
window._bans = {
  add: addBannedIP,
  remove: removeBannedIP,
  isBanned: isIPBanned,
  list: listBannedIPs
};

// --------- Admin helper functions for manual use from console ---------
// Usage: window.adminBan.banIP(ip, reason), window.adminBan.unbanIP(ip), ...
window.adminBan = {
  /**
   * Ban an IP address with an optional reason.
   * @param {string} ip
   * @param {string} reason
   */
  banIP: async function(ip, reason = '') {
    if (!ip) {
      console.error("banIP: Please provide a valid IP address.");
      alert("banIP: Please provide a valid IP address.");
      return;
    }
    try {
      await addBannedIP(ip, reason);
      const msg = `Banned IP: ${ip}` + (reason ? ` (Reason: ${reason})` : "");
      console.log(msg);
      alert(msg);
    } catch (e) {
      console.error("banIP error:", e);
      alert("Failed to ban IP: " + ip);
    }
  },
  /**
   * Unban a previously banned IP address.
   * @param {string} ip
   */
  unbanIP: async function(ip) {
    if (!ip) {
      console.error("unbanIP: Please provide a valid IP address.");
      alert("unbanIP: Please provide a valid IP address.");
      return;
    }
    try {
      await removeBannedIP(ip);
      const msg = `Unbanned IP: ${ip}`;
      console.log(msg);
      alert(msg);
    } catch (e) {
      console.error("unbanIP error:", e);
      alert("Failed to unban IP: " + ip);
    }
  },
  /**
   * Check if an IP is currently banned.
   * @param {string} ip
   */
  checkIP: async function(ip) {
    if (!ip) {
      console.error("checkIP: Please provide a valid IP address.");
      alert("checkIP: Please provide a valid IP address.");
      return;
    }
    try {
      const banned = await isIPBanned(ip);
      const msg = banned
        ? `IP ${ip} is currently BANNED.`
        : `IP ${ip} is NOT banned.`;
      console.log(msg);
      alert(msg);
      return banned;
    } catch (e) {
      console.error("checkIP error:", e);
      alert("Failed to check IP: " + ip);
      return false;
    }
  },
  /**
   * Show all currently banned IPs in the console.
   */
  showBans: async function() {
    try {
      const bans = await listBannedIPs();
      if (bans.length === 0) {
        console.log("No banned IPs found.");
        alert("No banned IPs found.");
      } else {
        console.log("Banned IPs:", bans);
        alert("Listed " + bans.length + " banned IP(s) in the console.");
      }
      return bans;
    } catch (e) {
      console.error("showBans error:", e);
      alert("Failed to list banned IPs.");
      return [];
    }
  }
};
// --------- End adminBan helpers ---------

// ---------- end IndexedDB helpers ----------

// ------- Replacement submitFeedback function (checks bans before sending) -------
async function submitFeedback() {
    const emailgex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailgex.test($("#feedback-email").val()) == false) {
        alert("請輸入有效的電子郵件地址。Please enter a valid email address.");
        return;
    }

    // Try to get IP (best effort)
    let ip = null;
    try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        ip = data.ip;
        // store for later admin banning convenience
        localStorage.setItem("lastip", ip);
    } catch (e) {
        console.warn('Could not fetch IP:', e);
        ip = localStorage.getItem('lastip') || 'Unknown';
    }

    // Check if this IP is banned
    try {
        const banned = await isIPBanned(ip);
        if (banned) {
            // Silently block: do not alert, just return
            return;
        }
    } catch (e) {
        console.error('Error checking ban list:', e);
        // proceed but log — failing open is reasonable for availability
    }

    try {
        // Build params and send email
        let params = {
            company: "Happy eBook Team",
            email: $("#feedback-email").val(),
            name: $("#feedback-name").val(),
            message: $("#feedback-message").val(),
            item: "Book" + $("#feedback-form").data("book"),
            subject: "Happy eBook Feedback",
            time: new Date().toLocaleString(),
            supere: $("#enable-super").is(":checked") ? "Enabled, Prior" : ($("#enable-prior").is(":checked") ? "Prior" : "Disabled"),
            color: $("#feedback-color").val(),
            ipaddr: ip || 'Unknown'
        };

        // consume super/prior quantities same as before
        if ($("#enable-super").is(":checked")) {
            const curquant = JSON.parse(localStorage.getItem("supercomment") ? localStorage.getItem("supercomment") : "{quantity: 0}").quantity;
            if (curquant == 1) {
                localStorage.removeItem("supercomment");
            } else if (curquant > 1) {
                const newquant = curquant - 1;
                let cursup = JSON.parse(localStorage.getItem("supercomment"));
                cursup.quantity = newquant;
                localStorage.setItem("supercomment", JSON.stringify(cursup));
            }
        }

        if ($("#enable-prior").is(":checked") && !$("#enable-super").is(":checked")) {
            const curquant = JSON.parse(localStorage.getItem("priorreply") ? localStorage.getItem("priorreply") : "{quantity: 0}").quantity;
            if (curquant == 1) {
                localStorage.removeItem("priorreply");
            } else if (curquant > 1) {
                const newquant = curquant - 1;
                let cursup = JSON.parse(localStorage.getItem("priorreply"));
                cursup.quantity = newquant;
                localStorage.setItem("priorreply", JSON.stringify(cursup));
            }
        }

        await emailjs.send("service_0vk5fnt", "template_lu711p6", params);

        alert("感謝您寶貴的意見! Thanks for your precious feedback!");
        $("#feedback-message").val("");
        $("#enable-super").prop("checked", false);
        $("#enable-prior").prop("checked", false);

        if (localStorage.getItem("supercomment") == null) {
            $("#enable-super").prop("checked", false);
            $("#enable-super").prop("disabled", true);
            $("#enable-super").css("cursor", "not-allowed");
            $("#feedback-color").val("#FFFFFF");
            $("#feedback-color").prop("disabled", true);
            $("#feedback-color").css("cursor", "not-allowed");
        }

        if (localStorage.getItem("priorreply") == null) {
            $("#enable-prior").prop("checked", false);
            $("#enable-prior").prop("disabled", true);
            $("#enable-prior").css("cursor", "not-allowed");
        }

    } catch (error) {
        console.error("Error sending feedback:", error);
        alert('無法送出回饋，請稍後再試。Failed to send feedback.');
    }
}

$(document).on("submit", "#feedback-form", function(event) {
    event.preventDefault();
    submitFeedback();
});

/**
 * Loads a specified page and updates the navigation state.
 * 
 * This function determines the base page name from the given parameters,
 * updates the active navigation link, and dynamically loads the
 * corresponding HTML content into the page. It also handles loading
 * specific book and feedback content when the "book" page is requested.
 * The function updates the browser's URL without reloading the page and
 * ensures that the translations and content are properly loaded.
 * 
 * @param {string} page - The page identifier or URL hash fragment.
 * @param {string} lang - The language code for translating content.
 * @param {string} book - The book identifier for loading specific book content.
 */

function loadPage(page, lang, book) {
    // Extract the base page name without parameters
    let basePage = page ? (page.replace("#", '').split(/[?#]/)[0] || 'home') : 'home';
    if (page.startsWith("book_")) {
        book = page.replace("book_", "");
        basePage = "book";
    }
    if (page == "book" && !book) basePage = 'ebooks';
    const query = window.location.search.replace("?", "");
    
    // Update active nav link (use basePage for selector)
    $('.nav-link').removeClass('active');
    if (basePage != "book") {
        $(`.nav-link[href="#${basePage}"]`).addClass('active');
    }
    if (basePage == "settings-modal") return;
    // Load content using basePage
    $.get(`templates/${basePage}.html`, function(data) {
        $("#page-content").empty();
        $('#page-content').append(data);
        if (basePage == 'ebooks') {
            loadBooks();
        }
        if (basePage == 'book') {
            $.get(`templates/Books/${book}.html`, function(bookd) {
                const remil = `<h3>Please RESPECT the copyrights. 請尊重版權。著作権を尊重してください。</h3>`;
                const blueq = `<br><h3>If you see a blue question mark, reloading the page should fix the issue.<br>若出現藍色背景上的問號，重新加載即可解決問題。<br>青い背景に疑問符が表示された場合は、ページを再読み込みしてください。</h3>`;
                if (book == "saytoben") {
                    $("#bookview-board").html(remil + blueq.toString() + '<br><br>' + bookd);
                } else if (book == "teachers2025") {
                    $("#bookview-board").html(remil + blueq.toString() + '<br><br>' + bookd + $("#bookview-board").html());
                    $("#feedback-form").attr("data-book", book);
                    $.get(`templates/Feedbacks/${book}.html`, function(feedbacks) {
                        $("#other-feedbacks").empty();
                        $("#other-feedbacks").append(feedbacks);
                    });
                } else {
                    $("#bookview-board").html(remil + blueq.toString() + '<br><br>' + bookd + $("#bookview-board").html());
                    $("#feedback-form").attr("data-book", book);
                    $.get(`templates/Feedbacks/${book}.html`, function(feedbacks) {
                        $("#other-feedbacks").empty();
                        $("#other-feedbacks").append(feedbacks);
                    });
                }                
            });
        }
        // Update translations for new content
        loadLanguage(lang);
        // Scroll to top
        window.scrollTo(0, 0);
    }).fail(function() {
        $('#page-content').html('<h2>Page not found. 不存在的頁面。</h2>');
    });
    
    // Update URL without reload
    const temp_par = new URLSearchParams('?' + query);
    history.pushState(null, null, (temp_par.size == 0 ? '' : `?${query}`) + `#${basePage}` + (book ? `_${book}` : ''));
}

// Handle navigation clicks
$(document).on('click', '.nav-link:not(#settings-link)', function(e) {
    e.preventDefault();
    const page = $(this).attr('href').replace('#', '');
    const lang = localStorage.getItem('language') || detectBrowserLanguage();
    loadPage(page, lang);
});

// Handle browser back/forward
window.addEventListener('popstate', function() {
    const page = window.location.href.split("#")[1] || 'home';
    const lang = localStorage.getItem('language') || detectBrowserLanguage();
    loadPage(page, lang);
});


$(document).ready(async function() {
    // Wait for IP fetch to complete
    let data = null;
    try {
        const response = await fetch("https://api.ipify.org?format=json");
        data = await response.json();
        console.log("Fetched IP address:", data.ip);
        // localStorage.setItem("lastip", data.ip);
        if (await isIPBanned(data.ip)) {
            // Redirect banned users to a dedicated banner page
            window.location.href = 'banned.html';
            return;
        }
    } catch (e) {
        // If IP fetch fails, proceed as normal (do not block)
        console.warn('Could not fetch IP for ban check:', e);
    }

    // Initialize language
    let currentLang = localStorage.getItem('language') || detectBrowserLanguage();
    loadLanguage(currentLang);

    const hash = window.location.href.split("#")[1] || "home";
    loadPage(hash, currentLang);

    // Mobile menu toggle
    $('.navbar-toggler').click(function() {
        $('.navbar-collapse').toggleClass('show');
    });
    
    // Close mobile menu when clicking a link
    $('.nav-link').click(function() {
        $('.navbar-collapse').removeClass('show');
    });
    
    // Settings modal
    $('#settings-link').click(function(e) {
        e.preventDefault();
        $('#settings-modal').fadeIn();
    });
    
    $('.close-modal').click(function() {
        $('#settings-modal').fadeOut();
    });
    
    // Click outside modal to close
    $(window).click(function(e) {
        if (e.target === $('#settings-modal')[0]) {
            $('#settings-modal').fadeOut();
        }
    });
    
    // Dark mode toggle
    $('#dark-mode-toggle').change(function() {
        $('body').toggleClass('dark-mode');
        localStorage.setItem('darkMode', $(this).is(':checked'));
    });
    
    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        $('#dark-mode-toggle').prop('checked', true);
        $('body').addClass('dark-mode');
    }

    // Language selector change handler
    $('#language-select').change(function() {
        const newLang = $(this).val();
        loadLanguage(newLang);
    });
});