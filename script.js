// Add this at the beginning of your script.js
function detectBrowserLanguage() {
    const userLang = navigator.language || navigator.userLanguage;
    if (userLang.startsWith('zh')) return 'zh';
    return 'en'; // default
}

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
const opened_books = ["001"];
const authorized = ["albert"];
// ---------------------------------------------------------------------------------//

function loadBooks() {
    $("#books-list").empty();
    if (opened_books.length == 0) {
        $("#books-list").append("呃... 沒有東西... Nothing to see here!");
    } else {
        for (let i = 0; i < opened_books.length; i++) {
            $.get(`templates/Thumbnails/${opened_books[i]}.html`, function(data) {
                $("#books-list").append(data);
            });
        }
    }
}

$("#books-list").on("click", ".book", function() {
    const entered_password = atob(prompt("請輸入密碼", "")).split("|")
    if (entered_password.length != 2) return;
    if (!authorized.includes(entered_password[0])) return;
    if (opened_books[$(this).data("access")] != entered_password[1]) return;
    // open the book here
});

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
        $('#page-content').append(data);
        if (basePage == 'ebooks') {
            loadBooks();
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