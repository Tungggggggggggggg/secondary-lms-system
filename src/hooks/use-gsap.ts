'use client';

import { useEffect, useRef } from 'react';

type GSAPType = typeof import('gsap').gsap;
type ScrollTriggerType = typeof import('gsap/ScrollTrigger').ScrollTrigger;

let gsap: GSAPType | null = null;
let ScrollTrigger: ScrollTriggerType | null = null;
let gsapLoadAttempted = false;

// Hàm load GSAP động
async function loadGSAP() {
    if (gsapLoadAttempted) return { gsap, ScrollTrigger };
    gsapLoadAttempted = true;

    try {
        if (typeof window === 'undefined') return { gsap: null, ScrollTrigger: null };

        // Dynamic import thay vì require
        const gsapModule = await import('gsap');
        const scrollTriggerModule = await import('gsap/ScrollTrigger');
        
        gsap = gsapModule.gsap;
        ScrollTrigger = scrollTriggerModule.ScrollTrigger;
        
        if (gsap && ScrollTrigger) {
            gsap.registerPlugin(ScrollTrigger);
            console.log('[GSAP] Loaded successfully');
        }
        
        return { gsap, ScrollTrigger };
    } catch (err) {
        console.warn('[GSAP] Failed to load:', err);
        return { gsap: null, ScrollTrigger: null };
    }
}

export const useGsapInit = () => {
    const hasRun = useRef(false);
    const cleanupFns = useRef<Array<() => void>>([]);

    useEffect(() => {
        // Prevent double execution in strict mode
        if (hasRun.current) return;
        hasRun.current = true;

        // Hàm hiển thị nội dung ngay lập tức (fallback)
        const showContentImmediately = () => {
            const elements = document.querySelectorAll(
                '.hero-content h1, .hero-content p, .hero-cta, .hero-stats, .hero-mockup, ' +
                '.floating-card-1, .floating-card-2, .subject-card, .feature-item, .role-card'
            );
            
            elements.forEach((el) => {
                const element = el as HTMLElement;
                element.style.opacity = '1';
                element.style.transform = 'none';
                element.style.visibility = 'visible';
            });
        };

        // Load GSAP và chạy animations
        const initAnimations = async () => {
            const { gsap: loadedGsap, ScrollTrigger: loadedST } = await loadGSAP();
            
            // Nếu không load được GSAP, hiển thị nội dung ngay
            if (!loadedGsap) {
                console.warn('[GSAP] Library not found, showing content without animations');
                showContentImmediately();
                return;
            }

            try {
                // Hero section animations với fallback
                const tl = loadedGsap.timeline({
                    defaults: { ease: 'power3.out' }
                });

                // Kiểm tra element tồn tại trước khi animate
                const heroH1 = document.querySelector('.hero-content h1');
                const heroP = document.querySelector('.hero-content p');
                const heroCta = document.querySelector('.hero-cta');
                const heroStats = document.querySelector('.hero-stats');
                const heroMockup = document.querySelector('.hero-mockup');

                if (heroH1) {
                    tl.from(heroH1, { y: 50, opacity: 0, duration: 0.8 });
                }
                if (heroP) {
                    tl.from(heroP, { y: 30, opacity: 0, duration: 0.6 }, '-=0.4');
                }
                if (heroCta) {
                    tl.from(heroCta, { y: 30, opacity: 0, duration: 0.6 }, '-=0.3');
                }
                if (heroStats) {
                    tl.from(heroStats, { y: 30, opacity: 0, duration: 0.6 }, '-=0.3');
                }
                if (heroMockup) {
                    tl.from(heroMockup, { x: 50, opacity: 0, duration: 1 }, '-=0.8');
                }

                // Floating cards animation
                const floatingCard1 = document.querySelector('.floating-card-1');
                const floatingCard2 = document.querySelector('.floating-card-2');

                if (floatingCard1) {
                    loadedGsap.to(floatingCard1, { 
                        y: -20, 
                        duration: 2, 
                        ease: 'power1.inOut', 
                        yoyo: true, 
                        repeat: -1 
                    });
                }
                
                if (floatingCard2) {
                    loadedGsap.to(floatingCard2, { 
                        y: -20, 
                        duration: 2.5, 
                        ease: 'power1.inOut', 
                        yoyo: true, 
                        repeat: -1, 
                        delay: 0.5 
                    });
                }

                // Scroll-triggered animations với ScrollTrigger
                if (loadedST) {
                    // Subject cards
                    const subjectCards = loadedGsap.utils.toArray('.subject-card');
                    subjectCards.forEach((card, i) => {
                        loadedGsap.from(card as Element, {
                            scrollTrigger: {
                                trigger: card as Element,
                                start: 'top 80%',
                                toggleActions: 'play none none reverse'
                            },
                            y: 50,
                            opacity: 0,
                            duration: 0.6,
                            delay: i * 0.2,
                            ease: 'power3.out'
                        });
                    });

                    // Feature items
                    const featureItems = loadedGsap.utils.toArray('.feature-item');
                    featureItems.forEach((feature, i) => {
                        loadedGsap.from(feature as Element, {
                            scrollTrigger: {
                                trigger: feature as Element,
                                start: 'top 85%',
                                toggleActions: 'play none none reverse'
                            },
                            y: 30,
                            opacity: 0,
                            duration: 0.5,
                            delay: i * 0.1,
                            ease: 'power2.out'
                        });
                    });

                    // Role cards
                    const roleCards = loadedGsap.utils.toArray('.role-card');
                    roleCards.forEach((role, i) => {
                        loadedGsap.from(role as Element, {
                            scrollTrigger: {
                                trigger: role as Element,
                                start: 'top 80%',
                                toggleActions: 'play none none reverse'
                            },
                            y: 40,
                            opacity: 0,
                            duration: 0.6,
                            delay: i * 0.2,
                            ease: 'back.out(1.2)'
                        });
                    });
                }

                // Cleanup function
                cleanupFns.current.push(() => {
                    try {
                        if (loadedST) {
                            loadedST.getAll().forEach((t) => t.kill());
                        }
                        loadedGsap.killTweensOf('*');
                    } catch (cleanupErr) {
                        console.warn('[GSAP] Cleanup warning:', cleanupErr);
                    }
                });

            } catch (err) {
                console.error('[GSAP] Animation failed, showing content anyway:', err);
                showContentImmediately();
            }
        };

        // Khởi chạy animations
        initAnimations();

        // Cleanup on unmount
        return () => {
            cleanupFns.current.forEach(fn => fn());
        };
    }, []);
};

export const useNavbarScroll = () => {
    useEffect(() => {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        const handleScroll = () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
};

export const useSmoothScroll = () => {
    useEffect(() => {
        const handleClick = (e: Event) => {
            e.preventDefault();
            const anchor = e.currentTarget as HTMLAnchorElement;
            const targetId = anchor.getAttribute('href');
            if (!targetId) return;
            
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        };

        const anchors = document.querySelectorAll('a[href^="#"]');
        anchors.forEach(anchor => {
            anchor.addEventListener('click', handleClick);
        });

        return () => {
            anchors.forEach(anchor => {
                anchor.removeEventListener('click', handleClick);
            });
        };
    }, []);
};

export const useProgressBarAnimation = () => {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const progressFills = entry.target.querySelectorAll('.progress-fill');
                    progressFills.forEach(fill => {
                        const fillEl = fill as HTMLElement;
                        const width = fillEl.style.width;
                        fillEl.style.width = '0%';
                        setTimeout(() => {
                            fillEl.style.width = width;
                        }, 100);
                    });
                }
            });
        }, { threshold: 0.5 });

        const heroMockup = document.querySelector('.hero-mockup');
        if (heroMockup) {
            observer.observe(heroMockup);
        }

        return () => observer.disconnect();
    }, []);
};

export const useMobileMenu = () => {
    useEffect(() => {
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const navLinks = document.querySelector('.nav-links');
        const navCta = document.querySelector('.nav-cta');

        const toggleMenu = async () => {
            if (!navLinks || !navCta) return;
            
            const isOpen = navLinks.classList.contains('flex');
            
            if (!isOpen) {
                navLinks.classList.remove('hidden');
                navLinks.classList.add('flex');
                navCta.classList.remove('hidden');
                navCta.classList.add('flex');

                // Nếu có GSAP, dùng animation
                const { gsap: loadedGsap } = await loadGSAP();
                if (loadedGsap) {
                    loadedGsap.fromTo([navLinks, navCta], 
                        { opacity: 0, y: -20 },
                        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
                    );
                }
            } else {
                const { gsap: loadedGsap } = await loadGSAP();
                if (loadedGsap) {
                    loadedGsap.to([navLinks, navCta], {
                        opacity: 0,
                        y: -20,
                        duration: 0.3,
                        ease: 'power2.in',
                        onComplete: () => {
                            navLinks.classList.remove('flex');
                            navLinks.classList.add('hidden');
                            navCta.classList.remove('flex');
                            navCta.classList.add('hidden');
                        }
                    });
                } else {
                    navLinks.classList.remove('flex');
                    navLinks.classList.add('hidden');
                    navCta.classList.remove('flex');
                    navCta.classList.add('hidden');
                }
            }
        };

        mobileMenuBtn?.addEventListener('click', toggleMenu);
        return () => mobileMenuBtn?.removeEventListener('click', toggleMenu);
    }, []);
};