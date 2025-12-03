# Stumbnail Login Page - Setup Guide

This document provides setup instructions for the fully responsive login page created from the Figma design.

## Project Structure

```
stumbnail-webapp/
├── app/
│   ├── login/
│   │   ├── page.tsx          # Login page component
│   │   └── login.module.css  # Responsive styles
│   ├── layout.tsx             # Root layout with fonts
│   ├── globals.css            # Global styles
│   └── page.tsx               # Home page (redirects to login)
├── lib/
│   └── firebase.ts            # Firebase authentication utilities
├── public/
│   └── assets/
│       ├── thumbnails/        # Background thumbnail images (15 images)
│       ├── avatars/           # User avatar images (4 images)
│       └── README.md          # Asset placement guide
└── package.json
```

## Features Implemented

### ✅ Fully Responsive Design
- **Desktop** (1024px+): Full design with large card and optimal spacing
- **Tablet** (768px - 1024px): Adjusted sizes and spacing
- **Mobile** (below 768px): Optimized for mobile viewing
- **Small Mobile** (below 480px): Compact layout for small screens

### ✅ Design Elements
- Animated thumbnail grid background
- Blurred overlay with gradient effects
- Centered login card with rounded corners
- Google sign-in button with official Google icon
- Trust indicator with user avatars
- Loading states and error handling

### ✅ Firebase Integration
- Google authentication setup
- Sign-in and sign-out functions
- Error handling and user feedback
- Environment variable configuration

## Setup Instructions

### 1. Install Dependencies

The project already has the necessary dependencies. If you need to reinstall:

```bash
npm install
```

### 2. Configure Firebase

#### Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Google authentication:
   - Go to Authentication > Sign-in method
   - Enable Google provider
   - Add your authorized domains

#### Get Firebase Configuration
1. Go to Project Settings > General
2. Scroll down to "Your apps"
3. Click "Web" icon to create a web app
4. Copy the configuration values

#### Update Environment Variables
Update your `.env.local` file with Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

### 3. Add Image Assets

#### Download from Figma
1. Open the Figma design
2. Export the following assets:

**Background Thumbnails** (15 images):
- Export each thumbnail at 2x or 3x resolution
- Save as JPG or PNG
- Place in `public/assets/thumbnails/`
- Name them: `thumb1.jpg` through `thumb15.jpg`

**User Avatars** (4 images):
- Export each avatar at 2x resolution
- Save as JPG or PNG
- Place in `public/assets/avatars/`
- Name them: `user1.jpg` through `user4.jpg`

#### Using Placeholder Images (Optional)
If you don't have the images yet, the design will show gray placeholders while maintaining the layout.

### 4. Create a Dashboard Page

After successful login, users are redirected to `/dashboard`. Create this page:

```bash
mkdir app/dashboard
```

Create `app/dashboard/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, logOut } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await logOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Welcome to Stumbnail Dashboard</h1>
      {user && (
        <div>
          <p>Logged in as: {user.email}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </div>
  );
}
```

### 5. Run the Development Server

```bash
npm run dev
```

Visit http://localhost:3000 - it will redirect to the login page at http://localhost:3000/login

## Responsive Breakpoints

The login page adapts to different screen sizes:

| Breakpoint | Width Range | Key Changes |
|------------|-------------|-------------|
| Desktop | 1024px+ | Full size, original design |
| Tablet | 768px - 1024px | Reduced card padding, smaller fonts |
| Mobile | 480px - 768px | Compact layout, adjusted spacing |
| Small Mobile | < 480px | Minimal padding, smallest fonts |

## Customization

### Changing Colors

Edit `app/login/login.module.css`:

```css
/* Brand color (Stumbnail text) */
.brandName {
  color: #ff6f61; /* Change this to your brand color */
}

/* Background overlay darkness */
.overlay {
  background-color: rgba(0, 0, 0, 0.7); /* Adjust opacity */
}
```

### Changing Fonts

Update `app/layout.tsx` to use different Google Fonts:

```tsx
<link
  href="https://fonts.googleapis.com/css2?family=YourFont:wght@400;700&display=swap"
  rel="stylesheet"
/>
```

Then update the CSS font-family properties.

### Animation Speed

Adjust the background animation speed in `login.module.css`:

```css
.gridRow {
  animation: slideRight 40s linear infinite; /* Change 40s to your preferred duration */
}
```

## Troubleshooting

### Firebase Errors

**Error: Firebase not configured**
- Make sure all environment variables are set in `.env.local`
- Restart the development server after adding environment variables

**Error: Google sign-in popup blocked**
- Check that your domain is authorized in Firebase Console
- Ensure popup blockers are disabled

### Styling Issues

**Fonts not loading**
- Check your internet connection (Google Fonts require internet)
- Verify the font names in `layout.tsx`

**Images not showing**
- Verify image paths and filenames match exactly
- Check that images are placed in the correct `public/assets/` subdirectories

### Responsive Issues

**Layout breaks on certain screen sizes**
- Check browser console for CSS errors
- Test in different browsers (Chrome, Firefox, Safari)
- Use browser DevTools to inspect element sizes

## Next Steps

1. **Protected Routes**: Add authentication checks to protect other pages
2. **User Profile**: Create a user profile page
3. **State Management**: Consider adding a state management solution (Context API, Zustand, etc.)
4. **Analytics**: Add analytics tracking for login events
5. **Error Boundaries**: Implement error boundaries for better error handling

## Browser Support

The login page is compatible with:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Optimized CSS with CSS Modules (scoped styles)
- Lazy-loaded images with background-image
- Minimal JavaScript bundle (only Firebase SDK)
- Smooth animations with CSS transforms

## Security Notes

- Never commit `.env.local` to version control
- Keep Firebase API keys secure
- Implement proper authentication checks on all protected routes
- Use Firebase Security Rules to protect your database

## Support

For issues or questions:
- Check the [Next.js documentation](https://nextjs.org/docs)
- Review [Firebase documentation](https://firebase.google.com/docs)
- Inspect the browser console for detailed error messages
