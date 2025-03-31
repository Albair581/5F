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

function loadPage(page, lang) {
    // Extract the base page name without parameters
    // Handle cases where page might be "home?happy=true" or "#home?happy=true"
    const basePage = page.replace(/^#/, '').split(/[?#]/)[0] || 'home';
    const query = window.location.search.replace("?", "");
    
    // Update active nav link (use basePage for selector)
    $('.nav-link').removeClass('active');
    $(`.nav-link[href="#${basePage}"]`).addClass('active');
    
    // Load content using basePage
    $.get(`templates/${basePage}.html`, function(data) {
        $('#page-content').html(data);
        
        // Log URL parameters if they exist
        const params = new URLSearchParams(query);
        
        if (basePage == "ebooks") {
            let errored = false;
            if (!(params.has("access") && params.has("key") && params.has("accessed") && params.has("client") && params.has("numc") && params.has("email"))) {
                if (params.size != 0) errored = true;
            }
            if (errored) {
                $('#page-content').html('<h2>Error parsing authorization link. 驗證連結出錯。</h2>');
            } else {
                let ebooksd = `
                    <section class="welcome-section">
                        <div class="boxxx">
                            <h2 data-i18n="authenticate-book" style="margin-bottom: -5px">Authorize Book</h2>
                            <h3 style="display: inline-block; font-size: 1.65em;" data-i18n="auth-client">Hello</h3>&nbsp;&nbsp;<h3 style="display: inline-block; font-size: 1.65em;">${params.get("client").charAt(0).toUpperCase() + params.get("client").slice(1)}</h3><h3 style="display: inline-block; font-size: 1.65em;">&nbsp;${params.get("numc").toUpperCase()}!</h3><br>
                            <h3 style="display: inline-block" data-i18n="auth-bookid">Book Id</h3>&nbsp;&nbsp;<h3 style="display: inline-block">${params.get("access")}</h3><br>
                            <h3 style="display: inline-block" data-i18n="auth-bookkey">Access Key</h3>&nbsp;&nbsp;<h3 style="display: inline-block">${params.get("key")}</h3>
                        </div>
                    </section>
                `;
                $('#page-content').html(ebooksd);
            }
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

    const hash = window.location.href.split("#")[1];
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