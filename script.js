// Add this at the beginning of your script.js
function detectBrowserLanguage() {
    const userLang = navigator.language || navigator.userLanguage;
    if (userLang.startsWith('zh')) return 'zh';
    return 'en'; // default
}

function loadLanguage(lang) {
    console.log(lang);
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

async function auth(encrypted, client) {
    const gotcha = await fetch(`keys/encrypted/${client}-msg.enc`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.text();
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
    // console.log(gotcha);
    // if (encrypted === gotcha) return true;
    // else return false;
    return gotcha;
}

function loadPage(page, lang) {
    // Extract the base page name without parameters

    const basePage = page ? (page.replace("#", '').split(/[?#]/)[0] || 'home') : 'home';
    const query = window.location.search.replace("?", "");
    
    // Update active nav link (use basePage for selector)
    $('.nav-link').removeClass('active');
    $(`.nav-link[href="#${basePage}"]`).addClass('active');
    if (basePage == "settings-modal") return;
    // Load content using basePage
    $.get(`templates/${basePage}.html`, function(data) {
        $("#page-content").empty();
        // Log URL parameters if they exist
        const params = new URLSearchParams(query);
        // TODO: http://127.0.0.1:5500/Web/5F/index.html?access=001&key=U1Esb/ZURCOropZGqbMCYEJwHWsLG7gQlQuJ3Dfk8a2o56sSpq7P8v3/Ou2St+OBhodGSnkSk3tUMBMoioBNLbI6x7YVFQ01BA36DUqmwgjRTuVDPboKJYSOdoVGdRQxmVB5fX+RAjxx++OkJCvHGR2oubaLHua5Ja3WMnJ6eCq8kp+aPgIKZM5StlrTJrN1GD6Puyri6MGlPFB7fZPrPLxA7afTBc5vLkQoOOV8HrWma+T63BUpRL3AT0RrmUF5FDuOzmg2n2+zHsF2nE4rgtTLzPT6cKmN9al0IABhzrbk42TKNtUijKqm+Pyw84RrJFX4GOtHVJAZe6xqNt4Shw==&email=109120&client=albert&numc=5f04#ebooks

        if (basePage == "ebooks") {
            let errored = false;
            if (!(params.has("access") && params.has("key") && params.has("client") && params.has("numc") && params.has("email"))) {
                if (params.size != 0) errored = true;
            }
            if (errored) {
                $('#page-content').html('<h2>Error parsing authorization link. 驗證連結出錯。</h2>');
            } else {
                let ebooksd = `
                    <section class="welcome-section">
                        <div class="boxxx" id="auth-box">
                            <h2 data-i18n="authenticate-book" style="margin-bottom: -5px">Authorize Book</h2>
                            <h3 style="display: inline-block; font-size: 1.65em;" data-i18n="auth-client">Hello</h3>&nbsp;&nbsp;<h3 style="display: inline-block; font-size: 1.65em;">${params.get("client").charAt(0).toUpperCase() + params.get("client").slice(1)}</h3><h3 style="display: inline-block; font-size: 1.65em;">&nbsp;${params.get("numc").toUpperCase()}!</h3><br>
                            <h3 style="display: inline-block" data-i18n="auth-bookid">Book Id</h3>&nbsp;&nbsp;<h3 style="display: inline-block">${params.get("access")}</h3><br>
                            <h3 style="display: inline-block" data-i18n="auth-email">Email</h3>&nbsp;&nbsp;<h3 style="display: inline-block">${params.get("email")}@wgps.tp.edu.tw</h3><br>
                            <button style="display: inline-block" id="cancel-auth" data-i18n="auth-cancel">Cancel</button><button style="display: inline-block" id="confirm-auth" data-i18n="auth-confirm" data-access="${params.get("access")}" data-key="${params.get("key")}" data-client="${params.get("client")}" data-numc="${params.get("numc")}" data-email="${params.get("email")}">Confirm</button>
                        </div>
                    </section>
                `;
                $('#page-content').html(ebooksd);
                $(document).on('click', 'button#cancel-auth', function() {
                    $("#auth-box").fadeOut();
                    history.pushState(null, "", location.href.split("?")[0] + "#home");
                    window.location.reload();
                });
                $(document).on('click', 'button#confirm-auth', async function() {
                    // $("#auth-box").fadeOut();
                    const auth_obj = {
                        "key": $(this).data("key"),
                        "client": $(this).data("client"),
                        "numc": $(this).data("numc"),
                        "email": $(this).data("email"),
                        "access": $(this).data("access")
                    };
                    const sec = await auth(auth_obj["key"], auth_obj["client"]);
                    if (JSON.parse(localStorage.getItem("accessed")).includes($(this).data("access"))) {
                        alert('Already authorized. 請不要重複驗證。');
                        $("#auth-box").fadeOut();
                    } else if (sec == (auth_obj["access"] + "///" + auth_obj["key"])) {
                        localStorage.setItem("client", $(this).data("client"));
                        localStorage.setItem("numc", $(this).data("numc"));
                        localStorage.setItem("email", $(this).data("email"));
                        let static = JSON.stringify([$(this).data("access")]);
                        let appended = localStorage.getItem("accessed") ? JSON.stringify(JSON.parse(localStorage.getItem("accessed"))).slice(0, -1) + `, "${$(this).data("access")}"]` : undefined;
                        localStorage.setItem("accessed", localStorage.getItem("accessed") ? appended : static);
                        $("#auth-box").fadeOut();
                    } else {
                        alert("Authorization failure. 驗證失敗。");
                        $("#auth-box").fadeOut();
                    }
                });
            }
        }
        $('#page-content').append(data);
        // Update translations for new content
        loadLanguage(lang);
        // Scroll to top
        window.scrollTo(0, 0);
    }).fail(function() {
        $('#page-content').html('<h2>Page not found. 不存在的頁面。</h2>');
    });
    
    // Update URL without reload
    const temp_par = new URLSearchParams('?' + query);
    history.pushState(null, null, (temp_par.size == 0 ? '' : `?${query}`) + `#${basePage}`);
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


$(document).ready(function() {
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