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
const opened_books = ["000", "001", "003", "004", "005", "008", "009", "saytoben", "summer2025"];
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
            $.ajax({
                url: `templates/Thumbnails/${opened_books[i]}.html`,
                success: function(data) {
                    $("#books-list").append(data);
                },
                async: false
            });
        }
        loadLanguage(localStorage.getItem('language') || detectBrowserLanguage());
        $("#books-list").on("click", ".book", function() {
            // open book iframe logic here
            const lang = localStorage.getItem('language') || detectBrowserLanguage();
            loadPage("book", lang, $(this).data("ebook"));
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
    const emailgex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailgex.test($("#feedback-email").val()) == false) {
        alert("請輸入有效的電子郵件地址。Please enter a valid email address.");
        return;
    }

    let params = {
        company: "Happy eBook Team",
        email: $("#feedback-email").val(), 
        name: $("#feedback-name").val(),
        message: $("#feedback-message").val(),
        item: "Book" + $("#feedback-form").data("book"),
        subject: "Happy eBook Feedback", // change if prior reply
        time: new Date().toLocaleString(),
        supere: $("#enable-super").is(":checked") ? "Enabled, Prior" : ($("#enable-prior").is(":checked") ? "Prior" : "Disabled"),
        color: $("#feedback-color").val()
    }

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

    emailjs.send("service_0vk5fnt", "template_lu711p6", params)
        .then( 
            alert("感謝您寶貴的意見! Thanks for your precious feedback!"),
            $("#feedback-message").val(""),
            $("#enable-super").prop("checked", false),
            $("#enable-prior").prop("checked", false),
        )

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
        if (basePage == 'book' || basePage.startsWith('book_')) {
            $.get(`templates/Books/${book}.html`, function(bookd) {
                const remil = `<h3>Please RESPECT the copyrights. 請尊重版權。著作権を尊重してください。</h3>`;
                if (book != "002") {
                    if (book == "saytoben") {
                        $("#bookview-board").html(remil + '<br><br>' + bookd);
                    } else {
                        $("#bookview-board").html(remil + '<br><br>' + bookd + $("#bookview-board").html());
                        $("#feedback-form").attr("data-book", book);
                        $.get(`templates/Feedbacks/${book}.html`, function(feedbacks) {
                            $("#other-feedbacks").empty();
                            $("#other-feedbacks").append(feedbacks);
                        });
                    }
                } else {
                    console.log("Test!");
                    $("#bookview-board").html(remil + '<br><br>' + bookd);
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