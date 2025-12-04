'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import styles from './dashboard.module.css';

interface Template {
  id: number;
  title: string;
  description: string;
  image: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  active: boolean;
}

export default function DashboardPage() {
  const [promptText, setPromptText] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const promptInputRef = useRef<HTMLInputElement>(null);
  const youtubeLinkInputRef = useRef<HTMLInputElement>(null);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '/assets/dashboard/icons/home-05-stroke-rounded 2-sidebar.svg', active: true },
    { id: 'projects', label: 'Projects', icon: '/assets/dashboard/icons/image-02-stroke-rounded 1-sidebar.svg', active: false },
    { id: 'community', label: 'Community', icon: '/assets/dashboard/icons/ai-cloud-stroke-rounded 1-sidebar.svg', active: false },
    { id: 'favourites', label: 'Favourites', icon: '/assets/dashboard/icons/play-list-favourite-02-stroke-rounded 1-sidebar.svg', active: false },
  ];

  const templates: Template[] = [
    {
      id: 1,
      title: 'Tech Review Template',
      description: 'Generate instantly with AI',
      image: '/assets/dashboard/template1.png'
    },
    {
      id: 2,
      title: 'Travel Vlog Template',
      description: 'Generate instantly with AI',
      image: '/assets/dashboard/template2.png'
    },
    {
      id: 3,
      title: 'Gaming Reaction Template',
      description: 'Generate instantly with AI',
      image: '/assets/dashboard/template3.png'
    },
    {
      id: 4,
      title: 'Cinematic Look',
      description: 'Generate instantly with AI',
      image: '/assets/dashboard/template4.png'
    },
  ];

  const handlePromptSubmit = () => {
    console.log('Generating with prompt:', promptText);
  };

  const handleYoutubeLinkSubmit = () => {
    console.log('Generating from YouTube:', youtubeLink);
  };

  return (
    <div className={styles.container}>
      {/* Decorative blur elements */}
      <div className={styles.blurTopRight} />
      <div className={styles.blurBottom} />
      <div className={styles.blurSidebarBottom} />

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <span className={styles.logoText}>Logo</span>
          </div>
          <h1 className={styles.logoTitle}>
            <span className={styles.logoAccent}>Stumb</span>nail
          </h1>
        </div>

        {/* User Profile */}
        <div className={styles.userProfile}>
          <Image
            src="/assets/dashboard/profile.png"
            alt="User avatar"
            width={51}
            height={51}
            className={styles.userAvatar}
          />
          <div className={styles.userInfo}>
            <p className={styles.userName}>Amelia Alex</p>
            <p className={styles.userEmail}>Amelia Alex123@gmail.com</p>
          </div>
          <button className={styles.userMenu} aria-label="User menu options">
            <span className={styles.userMenuDot} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${item.active ? styles.navItemActive : ''}`}
              aria-current={item.active ? 'page' : undefined}
            >
              <Image
                src={item.icon}
                alt=""
                width={29}
                height={29}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Progress Section */}
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <Image
              src="/assets/dashboard/icons/credits.svg"
              alt=""
              width={20}
              height={20}
              className={styles.progressIcon}
              aria-hidden="true"
            />
            <p className={styles.progressText}>
              <span className={styles.progressCurrent}>7</span> / 10
            </p>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: '70%' }} />
          </div>
        </div>

        {/* Upgrade Plan Button */}
        <button className={styles.upgradeButton}>
          <Image
            src="/assets/dashboard/icons/crown-stroke-rounded 1-sidebar.svg"
            alt=""
            width={32}
            height={32}
            aria-hidden="true"
          />
          <span>Upgrade Plan</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          {/* Search Bar */}
          <div className={styles.searchBar}>
            <Image
              src="/assets/dashboard/icons/search.svg"
              alt=""
              width={18}
              height={18}
              className={styles.searchIcon}
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search projects or templates..."
              className={styles.searchInput}
              aria-label="Search projects or templates"
            />
          </div>

          {/* Create New Project Button */}
          <button className={styles.createButton}>
            <Image
              src="/assets/dashboard/icons/create-new-project-icon.svg"
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
            />
            <span>Create New Project</span>
          </button>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {/* My Projects Section */}
          <section className={styles.projectsSection}>
            <h2 className={styles.sectionTitle}>
              My <span className={styles.titleAccent}>Projects</span>
            </h2>

            {/* Empty State */}
            <div className={styles.emptyState}>
              <div className={styles.emptyIconWrapper}>
                <Image
                  src="/assets/dashboard/icons/project-section-youtube-with-sparkles.svg"
                  alt="No projects illustration"
                  width={80}
                  height={80}
                />
              </div>
              <p className={styles.emptyText}>
                No projects yet — let&apos;s create your first one!
              </p>
              <button className={styles.startButton}>
                <Image
                  src="/assets/dashboard/icons/star-for-start-creating-button.svg"
                  alt=""
                  width={20}
                  height={20}
                  aria-hidden="true"
                />
                <span>Start Creating</span>
              </button>
            </div>
          </section>

          {/* Create With Prompt Section */}
          <section className={styles.createSection}>
            <div className={styles.createRow}>
              <div className={styles.createPromptWrapper}>
                <h2 className={styles.sectionTitle}>
                  Create With <span className={styles.titleAccent}>Prompt</span>
                </h2>
                <div className={styles.createPrompt} onClick={() => promptInputRef.current?.focus()}>
                  <input
                    ref={promptInputRef}
                    type="text"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Describe your thumbnail"
                    className={styles.promptInput}
                    aria-label="Describe your thumbnail"
                  />

                  <div className={styles.promptOptions}>
                    <button className={styles.dropdown} aria-label="Select style">
                      <Image
                        src="/assets/dashboard/icons/style.svg"
                        alt=""
                        width={24}
                        height={24}
                        aria-hidden="true"
                      />
                      <span>Style</span>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    <button className={styles.dropdown} aria-label="Select model">
                      <Image
                        src="/assets/dashboard/icons/model.svg"
                        alt=""
                        width={24}
                        height={24}
                        aria-hidden="true"
                      />
                      <span>Recraft</span>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    <button className={styles.addButton} aria-label="Add image reference">
                      <Image
                        src="/assets/dashboard/icons/add-image.svg"
                        alt=""
                        width={20}
                        height={20}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <button
                    className={styles.generateButton}
                    onClick={handlePromptSubmit}
                    aria-label="Generate thumbnail from prompt"
                  >
                    <Image
                      src="/assets/dashboard/icons/send.svg"
                      alt=""
                      width={20}
                      height={20}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              <div className={styles.orDividerWrapper}>
                <p className={styles.orDivider}>OR</p>
              </div>

              <div className={styles.youtubeInputWrapper}>
                <h2 className={styles.sectionTitle}>
                  Paste a <span className={styles.titleAccent}>Youtube Link</span>
                </h2>
                <div className={styles.youtubeInput} onClick={() => youtubeLinkInputRef.current?.focus()}>
                  <div className={styles.youtubeIconWrapper}>
                    <Image
                      src="/assets/dashboard/icons/attachment-02-stroke-rounded 1.svg"
                      alt=""
                      width={18}
                      height={18}
                      className={styles.youtubeIcon}
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    ref={youtubeLinkInputRef}
                    type="text"
                    value={youtubeLink}
                    onChange={(e) => setYoutubeLink(e.target.value)}
                    placeholder="Paste a YouTube link to generate thumbnail"
                    className={styles.linkInput}
                    aria-label="Paste YouTube link"
                  />
                  <button
                    className={styles.generateButton}
                    onClick={handleYoutubeLinkSubmit}
                    aria-label="Generate thumbnail from YouTube link"
                  >
                    <Image
                      src="/assets/dashboard/icons/send.svg"
                      alt=""
                      width={20}
                      height={20}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Templates Section */}
          <section className={styles.templatesSection}>
            <div className={styles.templatesHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Jumpstart your creativity</h2>
                <p className={styles.templatesSubtitle}>YouTube&apos;s &quot;Recommended</p>
              </div>
              <a href="#" className={styles.seeAll}>See all</a>
            </div>

            <div className={styles.templatesGrid}>
              {templates.map((template) => (
                <div key={template.id} className={styles.templateCard}>
                  <div className={styles.templateImage}>
                    <Image
                      src={template.image}
                      alt={template.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      style={{ objectFit: 'cover' }}
                    />
                    <button className={styles.favoriteButton} aria-label={`Add ${template.title} to favourites`}>
                      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <circle cx="15.719" cy="15.719" r="15.219" fill="white" fillOpacity="0.7" stroke="white"/>
                        <path d="M10.1198 8.40026C9.29655 8.68744 8.59773 9.14694 8.05207 9.75004C6.11834 11.904 6.44382 15.2736 8.90406 18.5284C9.50716 19.323 11.393 21.228 12.3886 22.0417C12.8768 22.4438 13.815 23.1713 14.4947 23.6595L15.7104 24.5498L16.3422 24.1094C20.0661 21.4673 22.5551 18.9496 23.7038 16.6521C25.3025 13.4739 24.8239 10.5446 22.4498 8.96506C21.5499 8.36196 20.7554 8.16093 19.5109 8.2088C18.5632 8.24709 18.41 8.27581 17.7399 8.60129C17.2229 8.84061 16.7922 9.14694 16.3518 9.57773L15.7104 10.1904L15.1456 9.61602C14.7436 9.21395 14.3319 8.91719 13.7671 8.63958C12.9726 8.24709 12.9343 8.23751 11.8525 8.2088C10.9048 8.18965 10.6559 8.21837 10.1198 8.40026Z" fill="#FF6F61"/>
                      </svg>
                    </button>
                  </div>
                  <h3 className={styles.templateTitle}>{template.title}</h3>
                  <p className={styles.templateDescription}>{template.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
