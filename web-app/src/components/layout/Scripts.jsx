import React, { useEffect } from 'react';

const Scripts = () => {
    useEffect(() => {
        const scripts = [
            '/js/jquery-migrate-3.0.1.min.js',
            '/js/jquery.easing.1.3.js',
            '/js/jquery.waypoints.min.js',
            '/js/jquery.stellar.min.js',
            '/js/owl.carousel.min.js',
            '/js/jquery.magnific-popup.min.js',
            '/js/aos.js',
            '/js/jquery.animateNumber.min.js',
            '/js/bootstrap-datepicker.js',
            '/js/jquery.timepicker.min.js',
            '/js/scrollax.min.js',
            '/js/main.js'
        ];

        // Hàm tải script tuần tự
        const loadScript = (index) => {
            if (index >= scripts.length) return;

            const src = scripts[index];
            // Kiểm tra xem script đã tồn tại chưa
            if (!document.querySelector(`script[src="${src}"]`)) {
                const script = document.createElement('script');
                script.src = src;
                script.async = false; // Tải đồng bộ để đảm bảo thứ tự
                script.onload = () => loadScript(index + 1); // Tải script tiếp theo sau khi hoàn tất
                script.onerror = () => console.error(`Failed to load script: ${src}`);
                document.body.appendChild(script);
            } else {
                loadScript(index + 1); // Bỏ qua nếu script đã tồn tại
            }
        };

        // Bắt đầu tải script từ đầu
        loadScript(0);

        // Expose a safe global re-init for SPA route changes
        window.__reInitTheme = () => {
            const $ = window.jQuery;
            if (!$) return;
            try {
                // Ensure global loader overlay is hidden in SPA
                const loaderEl = document.getElementById('ftco-loader');
                if (loaderEl) {
                    loaderEl.classList.remove('show');
                    loaderEl.style.display = 'none';
                }

                // Recompute full-height sections
                const setFullHeight = () => {
                    $('.js-fullheight').css('height', $(window).height());
                };
                setFullHeight();

                // Bind resize once
                if (!window.__fullHeightBound) {
                    $(window).on('resize.ftcoFullHeight', setFullHeight);
                    window.__fullHeightBound = true;
                }

                // Re-init Owl Carousel on elements present in current view
                if ($.fn.owlCarousel && $('.home-slider').length) {
                    $('.home-slider').each(function () {
                        const $el = $(this);
                        // If already initialized, just refresh to avoid destroy errors
                        if ($el.hasClass('owl-loaded')) {
                            try { $el.trigger('refresh.owl.carousel'); } catch (_) { }
                            return;
                        }
                        $el.owlCarousel({
                            loop: true,
                            autoplay: true,
                            margin: 0,
                            animateOut: 'fadeOut',
                            animateIn: 'fadeIn',
                            nav: false,
                            autoplayHoverPause: false,
                            items: 1,
                            navText: [
                                "<span class='ion-md-arrow-back'></span>",
                                "<span class='ion-chevron-right'></span>",
                            ],
                            responsive: {
                                0: { items: 1, nav: false },
                                600: { items: 1, nav: false },
                                1000: { items: 1, nav: false },
                            },
                        });
                    });
                }

                // Re-init any work carousels if present
                if ($.fn.owlCarousel && $('.carousel-work').length) {
                    $('.carousel-work').each(function () {
                        const $el = $(this);
                        if ($el.hasClass('owl-loaded')) {
                            try { $el.trigger('refresh.owl.carousel'); } catch (_) { }
                            return;
                        }
                        $el.owlCarousel({
                            autoplay: true,
                            center: true,
                            loop: true,
                            items: 1,
                            margin: 30,
                            stagePadding: 0,
                            nav: true,
                            navText: [
                                '<span class="ion-ios-arrow-back">',
                                '<span class="ion-ios-arrow-forward">',
                            ],
                            responsive: {
                                0: { items: 1, stagePadding: 0 },
                                600: { items: 2, stagePadding: 50 },
                                1000: { items: 3, stagePadding: 100 },
                            },
                        });
                    });
                }

                // Refresh AOS animations
                if (window.AOS && typeof window.AOS.refreshHard === 'function') {
                    window.AOS.refreshHard();
                }

                // Re-run Scrollax if available
                if (window.jQuery && window.jQuery.Scrollax) {
                    window.jQuery.Scrollax();
                }

                // Re-attach date/time pickers for dynamically rendered inputs
                if (window.jQuery && window.jQuery.fn) {
                    if (window.jQuery.fn.datepicker) {
                        window.jQuery('.appointment_date').datepicker({ format: 'm/d/yyyy', autoclose: true });
                    }
                    if (window.jQuery.fn.timepicker) {
                        window.jQuery('.appointment_time').timepicker();
                    }
                }

                // Rebind scroll behavior for navbar (namespaced to avoid duplicates)
                if (!window.__scrollBound) {
                    $(window).on('scroll.ftcoScroll', function () {
                        const $w = $(this);
                        const st = $w.scrollTop();
                        const navbar = $('.ftco_navbar');
                        const sd = $('.js-scroll-wrap');
                        if (st > 150) {
                            if (!navbar.hasClass('scrolled')) navbar.addClass('scrolled');
                        }
                        if (st < 150) {
                            if (navbar.hasClass('scrolled')) navbar.removeClass('scrolled sleep');
                        }
                        if (st > 350) {
                            if (!navbar.hasClass('awake')) navbar.addClass('awake');
                            if (sd.length > 0) sd.addClass('sleep');
                        }
                        if (st < 350) {
                            if (navbar.hasClass('awake')) {
                                navbar.removeClass('awake');
                                navbar.addClass('sleep');
                            }
                            if (sd.length > 0) sd.removeClass('sleep');
                        }
                    });
                    window.__scrollBound = true;
                }

                // Waypoints: content animation
                if ($.fn.waypoint) {
                    $('.ftco-animate').waypoint(function (direction) {
                        if (direction === 'down' && !$(this.element).hasClass('ftco-animated')) {
                            $(this.element).addClass('item-animate');
                            setTimeout(function () {
                                $('body .ftco-animate.item-animate').each(function (k) {
                                    const el = $(this);
                                    setTimeout(function () {
                                        const effect = el.data('animate-effect');
                                        if (effect === 'fadeIn') el.addClass('fadeIn ftco-animated');
                                        else if (effect === 'fadeInLeft') el.addClass('fadeInLeft ftco-animated');
                                        else if (effect === 'fadeInRight') el.addClass('fadeInRight ftco-animated');
                                        else el.addClass('fadeInUp ftco-animated');
                                        el.removeClass('item-animate');
                                    }, k * 50, 'easeInOutExpo');
                                });
                            }, 100);
                        }
                    }, { offset: '95%' });

                    // Counter
                    $('#section-counter').waypoint(function (direction) {
                        if (direction === 'down' && !$(this.element).hasClass('ftco-animated')) {
                            const commaStep = $.animateNumber && $.animateNumber.numberStepFactories ? $.animateNumber.numberStepFactories.separator(',') : undefined;
                            $('.number').each(function () {
                                const $num = $(this);
                                const num = $num.data('number');
                                if ($.fn.animateNumber) {
                                    $num.animateNumber({ number: num, numberStep: commaStep }, 7000);
                                } else {
                                    $num.text(num);
                                }
                            });
                        }
                    }, { offset: '95%' });
                }

                // Magnific Popup
                if ($.fn.magnificPopup) {
                    $('.image-popup').each(function () {
                        const $el = $(this);
                        if (!$el.data('magnificPopup')) {
                            $el.magnificPopup({
                                type: 'image',
                                closeOnContentClick: true,
                                closeBtnInside: true,
                                fixedContentPos: true,
                                mainClass: 'mfp-no-margins mfp-with-zoom',
                                gallery: { enabled: true, navigateByImgClick: true, preload: [0, 1] },
                                image: { verticalFit: true },
                                zoom: { enabled: true, duration: 300 },
                            });
                        }
                    });
                    $('.popup-youtube, .popup-vimeo, .popup-gmaps').each(function () {
                        const $el = $(this);
                        if (!$el.data('magnificPopup')) {
                            $el.magnificPopup({
                                disableOn: 700,
                                type: 'iframe',
                                mainClass: 'mfp-fade',
                                removalDelay: 160,
                                preloader: false,
                                fixedContentPos: false,
                            });
                        }
                    });
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Theme re-init failed:', err);
            }
        };

        // Cleanup function
        return () => {
            // do not remove scripts on unmount of this component in SPA layout
            // keeping vendor scripts avoids duplicate loads and broken state
            // If you need a hard reset, remove below lines, but default is to keep scripts
            /*
            scripts.forEach(src => {
                const existingScript = document.querySelector(`script[src="${src}"]`);
                if (existingScript) {
                    existingScript.remove();
                }
            });
            */
        };
    }, []);

    return null; // Component không render gì
};

export default Scripts;