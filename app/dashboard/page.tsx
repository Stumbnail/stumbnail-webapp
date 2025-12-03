'use client';

import { useState } from 'react';
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
  icon: React.ReactNode;
  active: boolean;
}

export default function DashboardPage() {
  const [promptText, setPromptText] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('Style');
  const [selectedRecraft, setSelectedRecraft] = useState('Recraft');

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <img src="/assets/dashboard/icons/home-05-stroke-rounded 2-sidebar.svg" alt="" width="30" height="30" />, active: true },
    { id: 'projects', label: 'Projects', icon: <img src="/assets/dashboard/icons/image-02-stroke-rounded 1-sidebar.svg" alt="" width="34" height="34" />, active: false },
    { id: 'community', label: 'Community', icon: <img src="/assets/dashboard/icons/ai-cloud-stroke-rounded 1-sidebar.svg" alt="" width="34" height="34" />, active: false },
    { id: 'favourites', label: 'Favourites', icon: <img src="/assets/dashboard/icons/play-list-favourite-02-stroke-rounded 1-sidebar.svg" alt="" width="34" height="34" />, active: false },
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
          <img
            src="/assets/dashboard/profile.png"
            alt="User avatar"
            className={styles.userAvatar}
          />
          <div className={styles.userInfo}>
            <p className={styles.userName}>Amelia Alex</p>
            <p className={styles.userEmail}>Amelia Alex123@gmail.com</p>
          </div>
          <button className={styles.userMenu} aria-label="User menu">
            <svg width="8" height="33" viewBox="0 0 8 33" fill="none">
              <path d="M7.5 0.5V32.5" stroke="#141414" strokeWidth="0.5"/>
              <path d="M3.5 16.5L7.5 12.5" stroke="#141414" strokeWidth="0.5"/>
              <path d="M3.5 16.5L7.5 20.5" stroke="#141414" strokeWidth="0.5"/>
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${item.active ? styles.navItemActive : ''}`}
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Progress Section */}
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <img src="/assets/dashboard/icons/credits.svg" alt="" width="24" height="24" className={styles.progressIcon} />
            <p className={styles.progressText}>
              <span className={styles.progressCurrent}>7</span> / 10
            </p>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: '74.8%' }} />
          </div>
        </div>

        {/* Upgrade Plan Button */}
        <button className={styles.upgradeButton}>
          <img src="/assets/dashboard/icons/crown-stroke-rounded 1-sidebar.svg" alt="" width="33" height="33" />
          <span>Upgrade Plan</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          {/* Search Bar */}
          <div className={styles.searchBar}>
            <img src="/assets/dashboard/icons/search.svg" alt="" width="24" height="24" className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search projects or templates..."
              className={styles.searchInput}
              aria-label="Search projects or templates"
            />
          </div>

          {/* Create New Project Button */}
          <button className={styles.createButton}>
            <img src="/assets/dashboard/icons/create-new-project-icon.svg" alt="" width="30" height="30" />
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
                <img
                  src="/assets/dashboard/icons/project-section-youtube-with-sparkles.svg"
                  alt="YouTube play icon"
                  width="95"
                  height="95"
                />
              </div>
              <p className={styles.emptyText}>
                No projects yet — let's create your first one!
              </p>
              <button className={styles.startButton}>
                <img
                  src="/assets/dashboard/icons/star-for-start-creating-button.svg"
                  alt="Star icon"
                  width="27"
                  height="27"
                />
                <span>Start Creating</span>
              </button>
            </div>
          </section>

          {/* Create With Prompt Section */}
          <section className={styles.createSection}>
            <div className={styles.createHeader}>
              <h2 className={styles.sectionTitle}>
                Create With <span className={styles.titleAccent}>Prompt</span>
              </h2>
              <div className={styles.orDividerWrapper}>
                <p className={styles.orDivider}>OR</p>
              </div>
              <h2 className={styles.sectionTitle}>
                Paste a <span className={styles.titleAccent}>Youtube Link</span>
              </h2>
            </div>

            <div className={styles.createRow}>
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
                  <button className={styles.dropdown}>
                    <img src="/assets/dashboard/icons/credits.svg" alt="" width="24" height="24" />
                    <span>{selectedStyle}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  <button className={styles.dropdown}>
                    <img src="/assets/dashboard/icons/credits.svg" alt="" width="20" height="20" />
                    <span>{selectedRecraft}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  <button className={styles.addButton} aria-label="Add option">
                    <img src="/assets/dashboard/icons/add-image.svg" alt="" width="28" height="28" />
                  </button>
                </div>

                <button
                  className={styles.generateButton}
                  onClick={handlePromptSubmit}
                  aria-label="Generate thumbnail from prompt"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 8L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              <div className={styles.youtubeInput}>
                <img src="/assets/dashboard/icons/attachment-02-stroke-rounded 1.svg" alt="" width="41" height="41" className={styles.youtubeIcon} />
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
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 8L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </section>

          {/* Templates Section */}
          <section className={styles.templatesSection}>
            <div className={styles.templatesHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Jumpstart your creativity</h2>
                <p className={styles.templatesSubtitle}>YouTube's "Recommended</p>
              </div>
              <a href="#" className={styles.seeAll}>See all</a>
            </div>

            <div className={styles.templatesGrid}>
              {templates.map((template) => (
                <div key={template.id} className={styles.templateCard}>
                  <div className={styles.templateImage}>
                    <img
                      src={template.image}
                      alt={template.title}
                    />
                    <button className={styles.favoriteButton} aria-label="Add to favourites">
                      <img
                        src="/assets/dashboard/icons/heart-outline.svg"
                        alt=""
                        width="32"
                        height="32"
                      />
                    </button>
                    <button className={styles.aiButton} aria-label="Generate with AI">
                      <img
                        src="/assets/dashboard/icons/credits.svg"
                        alt=""
                        width="32"
                        height="32"
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
