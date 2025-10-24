'use client';

import { useGsapInit, useNavbarScroll, useSmoothScroll, useProgressBarAnimation, useMobileMenu } from '@/hooks/use-gsap';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

// Core Components
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Subjects from '@/components/landing/Subjects';
import Features from '@/components/landing/Features';
import Roles from '@/components/landing/Roles';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function Home() {
    // Initialize all animations and interactions
    useGsapInit();
    useNavbarScroll();
    useSmoothScroll();
    useProgressBarAnimation();
    useMobileMenu();

    const { data: session } = useSession();

    return (
        <main className="min-h-screen overflow-x-hidden bg-white">
            <Navbar />
            <Hero />
            <Subjects />
            <Features />
            <Roles />
            <CTA />
            <Footer />
        </main>
    );
}