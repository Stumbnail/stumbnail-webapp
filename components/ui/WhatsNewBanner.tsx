import styles from './WhatsNewBanner.module.css';

interface WhatsNewBannerProps {
  theme: 'light' | 'dark';
  onClose: () => void;
}

export default function WhatsNewBanner({ theme, onClose }: WhatsNewBannerProps) {
  return (
    <div className={`${styles.banner} ${theme === 'dark' ? styles.dark : styles.light}`}>
      <div className={styles.content}>
        <div className={styles.badge}>What's New</div>
        <div className={styles.message}>
          <strong>We added sharing feature.</strong> Now users can share projects with their friends. They can download the thumbnails directly from the source.
        </div>
      </div>
      <button
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close announcement"
      >
        ✕
      </button>
    </div>
  );
}
