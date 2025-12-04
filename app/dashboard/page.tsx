'use client';

import { useState } from 'react';
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
            width={42}
            height={42}
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
                width={22}
                height={22}
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
            width={24}
            height={24}
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
                <div className={styles.createPrompt}>
                  <input
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
                        width={18}
                        height={18}
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
                        width={18}
                        height={18}
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
                <div className={styles.youtubeInput}>
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
                      <Image
                        src="/assets/dashboard/icons/heart-outline.svg"
                        alt=""
                        width={24}
                        height={24}
                        aria-hidden="true"
                      />
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
