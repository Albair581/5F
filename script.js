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
const opened_books = ["000", "001"];
const authorized = [
    "staff-albert", "staff-ray", "staff-ethan", "staff-marcus", "staff-sophia", // staff
    "cont-wilbur", "cont-champ", "cont-ian", "cont-ivan", // contributors
	"cont-haru", "cont-lucas", "cont-jeffrey", "cont-jack",
    "cont-davina", "cont-chelsea", "cont-kimi", "cont-ryan",
    
    "access-raphael", "access-aaron", "access-leaf", // regular users
	"access-adrian", "access-austin", "access-declan", "access-ben",
];
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
            $.get(`templates/Thumbnails/${opened_books[i]}.html`, function(data) {
                $("#books-list").append(data);
                loadLanguage(localStorage.getItem('language') || detectBrowserLanguage());
            });
        }
        $("#books-list").on("click", ".book", function() {
            if ($(this).text().slice(0, 3) != "000") {
                const entered_password = atob(atob(prompt("請輸入密碼", ""))).split("|")
                if (entered_password.length != 2) return;
                if (!authorized.includes(entered_password[0])) return;
                if (!opened_books.includes($(this).text().slice(0, 3))) return;
                if ($(this).text().slice(0, 3) != entered_password[1]) return;
            }

            // open book iframe logic here
            const lang = localStorage.getItem('language') || detectBrowserLanguage();
            loadPage("book", lang, $(this).text().slice(0, 3));
        });        
    }
}

/**
 * Submits a feedback form using emailjs library.
 * Collects the form fields and sends them to the emailjs service, which will then send an email to the recipient.
 * After submission, the form is reset.
 * @example
 * submitFeedback();
 */
function submitFeedback() {
    let params = {
        company: "Happy eBook Team",
        email: $("#feedback-email").val(), 
        name: $("#feedback-name").val(),
        message: $("#feedback-message").val(),
        item: "Book" + $("#feedback-form").data("book"),
        subject: "Happy eBook Feedback",
        time: new Date().toLocaleString()
    }

    emailjs.send("service_0vk5fnt", "template_lu711p6", params)
        .then( 
            alert("感謝您寶貴的意見! Thanks for your precious feedback!"),
            $("#feedback-form").trigger("reset")
        )
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
    if (page == "book" && !book) basePage = 'home';
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
                $("#bookview-board").html(bookd + '<br><br>' + $("#bookview-board").html());
				$("#feedback-form").attr("data-book", book);
                $.get(`templates/Feedbacks/${book}.html`, function(feedbacks) {
                    $("#other-feedbacks").empty();
                    $("#other-feedbacks").append(feedbacks);
                });
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