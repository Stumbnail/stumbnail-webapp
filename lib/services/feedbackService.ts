// Feedback service - handles all feedback-related Firestore operations
// SECURITY: Users can only submit feedback with their own UID

import { getFirestore } from '@/lib/firebase';
import { getStorage } from '@/lib/firebase';
import type {
    FeedbackSubmission,
    FeedbackState,
    FeedbackTriggerState,
    SatisfactionTrigger,
    SatisfactionCategory,
    UserMilestones,
    PlanType,
} from '@/types';

const COOLDOWN_DAYS = 14; // 14 days between satisfaction prompts
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/**
 * Calculate satisfaction category based on score
 * 9-10 = Promoter, 7-8 = Passive, 1-6 = Detractor
 */
function calculateSatisfactionCategory(score: number): SatisfactionCategory {
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
}

/**
 * Detect device type from user agent
 */
function getDeviceType(): 'desktop' | 'mobile' {
    if (typeof window === 'undefined') return 'desktop';
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad|ipod/.test(userAgent);
    return isMobile ? 'mobile' : 'desktop';
}

/**
 * Get browser name from user agent
 */
function getBrowser(): string {
    if (typeof window === 'undefined') return 'Unknown';
    const userAgent = window.navigator.userAgent;
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
}

/**
 * Submit satisfaction feedback
 * @param uid - User ID
 * @param email - User email
 * @param displayName - User display name
 * @param score - Satisfaction score (1-10)
 * @param text - Optional follow-up text
 * @param trigger - What triggered this feedback
 * @param userPlan - User's subscription plan
 * @param userAge - Days since account creation
 * @param generationCount - Total generations
 * @param projectCount - Total projects
 */
export async function submitSatisfactionFeedback(
    uid: string,
    email: string,
    displayName: string,
    score: number,
    text: string,
    trigger: SatisfactionTrigger,
    userPlan: PlanType,
    userAge: number,
    generationCount: number,
    projectCount: number
): Promise<void> {
    if (!uid) {
        throw new Error('UID is required');
    }

    try {
        const { collection, addDoc, doc, setDoc, Timestamp, serverTimestamp } = await import('firebase/firestore');
        const db = await getFirestore();

        const category = calculateSatisfactionCategory(score);
        const device = getDeviceType();
        const browser = getBrowser();

        // Create feedback document
        const feedbackData: Partial<FeedbackSubmission> = {
            uid,
            email,
            displayName,
            type: 'satisfaction',
            trigger,
            responded: true,
            satisfactionScore: score,
            satisfactionCategory: category,
            satisfactionText: text || undefined,
            userPlan,
            userAge,
            generationCount,
            projectCount,
            device,
            browser,
            status: 'new',
        };

        // Add to feedback collection
        await addDoc(collection(db, 'feedback'), {
            ...feedbackData,
            createdAt: serverTimestamp(),
        });

        // Update user's feedback state
        const now = new Date();
        const feedbackStateRef = doc(db, 'users', uid, 'feedbackState', 'state');

        await setDoc(
            feedbackStateRef,
            {
                lastSatisfactionShown: Timestamp.fromDate(now),
                satisfactionPromptCount: (await getFeedbackState(uid))?.satisfactionPromptCount + 1 || 1,
                submittedCount: (await getFeedbackState(uid))?.submittedCount + 1 || 1,
                [`triggers.${trigger}.shown`]: true,
                [`triggers.${trigger}.respondedAt`]: Timestamp.fromDate(now),
                lastSatisfactionScore: score,
                lastSatisfactionDate: Timestamp.fromDate(now),
            },
            { merge: true }
        );

        console.log('Satisfaction feedback submitted successfully');
    } catch (error) {
        console.error('Error submitting satisfaction feedback:', error);
        throw error;
    }
}

/**
 * Submit user-initiated feedback (feature request, bug report, general)
 * @param uid - User ID
 * @param email - User email
 * @param displayName - User display name
 * @param feedbackData - Type-specific feedback data
 */
export async function submitUserFeedback(
    uid: string,
    email: string,
    displayName: string,
    feedbackData: {
        type: 'feature_request' | 'bug_report' | 'general';
        featureDescription?: string;
        featureWhy?: string;
        featurePriority?: 'nice_to_have' | 'important' | 'must_have';
        bugDescription?: string;
        bugContext?: string;
        bugScreenshotUrl?: string;
        bugSeverity?: 'minor' | 'major' | 'critical';
        generalText?: string;
        generalScore?: number;
    },
    userPlan: PlanType,
    userAge: number,
    generationCount: number,
    projectCount: number
): Promise<void> {
    if (!uid) {
        throw new Error('UID is required');
    }

    try {
        const { collection, addDoc, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const db = await getFirestore();

        const device = getDeviceType();
        const browser = getBrowser();

        // Create feedback document
        const submission: Partial<FeedbackSubmission> = {
            uid,
            email,
            displayName,
            type: feedbackData.type,
            trigger: 'manual_button',
            responded: true,
            ...feedbackData,
            userPlan,
            userAge,
            generationCount,
            projectCount,
            device,
            browser,
            status: 'new',
        };

        // Add to feedback collection
        await addDoc(collection(db, 'feedback'), {
            ...submission,
            createdAt: serverTimestamp(),
        });

        // Update submitted count
        const feedbackStateRef = doc(db, 'users', uid, 'feedbackState', 'state');
        await setDoc(
            feedbackStateRef,
            {
                submittedCount: (await getFeedbackState(uid))?.submittedCount + 1 || 1,
            },
            { merge: true }
        );

        console.log(`${feedbackData.type} feedback submitted successfully`);
    } catch (error) {
        console.error('Error submitting user feedback:', error);
        throw error;
    }
}

/**
 * Get user's feedback state from Firestore
 */
async function getFeedbackState(uid: string): Promise<FeedbackState | null> {
    try {
        const { doc, getDoc } = await import('firebase/firestore');
        const db = await getFirestore();

        const feedbackStateRef = doc(db, 'users', uid, 'feedbackState', 'state');
        const feedbackStateSnap = await getDoc(feedbackStateRef);

        if (!feedbackStateSnap.exists()) {
            return null;
        }

        const data = feedbackStateSnap.data();

        return {
            lastSatisfactionShown: data.lastSatisfactionShown?.toDate(),
            satisfactionPromptCount: data.satisfactionPromptCount || 0,
            submittedCount: data.submittedCount || 0,
            dismissedCount: data.dismissedCount || 0,
            permanentlyDismissed: data.permanentlyDismissed || false,
            triggers: data.triggers || {},
            lastSatisfactionScore: data.lastSatisfactionScore,
            lastSatisfactionDate: data.lastSatisfactionDate?.toDate(),
        };
    } catch (error) {
        console.error('Error fetching feedback state:', error);
        return null;
    }
}

/**
 * Check if satisfaction prompt should be shown for a trigger
 * @param trigger - The trigger type
 * @param uid - User ID
 */
export async function shouldShowSatisfactionPrompt(
    trigger: SatisfactionTrigger,
    uid: string
): Promise<boolean> {
    if (!uid) return false;

    try {
        const state = await getFeedbackState(uid);

        // If no state exists, show the prompt
        if (!state) return true;

        // Check if user permanently dismissed
        if (state.permanentlyDismissed) return false;

        // Check if this specific trigger has already been shown
        const triggerState = state.triggers[trigger];
        if (triggerState && triggerState.shown) return false;

        // Check global cooldown (14 days between any satisfaction prompts)
        if (state.lastSatisfactionShown) {
            const timeSinceLastPrompt = Date.now() - state.lastSatisfactionShown.getTime();
            if (timeSinceLastPrompt < COOLDOWN_MS) return false;
        }

        return true;
    } catch (error) {
        console.error('Error checking satisfaction prompt eligibility:', error);
        return false;
    }
}

/**
 * Dismiss satisfaction prompt (user clicked "Skip" or closed)
 * @param trigger - The trigger that was dismissed
 * @param uid - User ID
 * @param permanentDismiss - Whether user checked "Don't show feedback again"
 */
export async function dismissSatisfactionPrompt(
    trigger: SatisfactionTrigger,
    uid: string,
    permanentDismiss: boolean
): Promise<void> {
    if (!uid) {
        throw new Error('UID is required');
    }

    try {
        const { doc, setDoc, Timestamp } = await import('firebase/firestore');
        const db = await getFirestore();

        const now = new Date();
        const feedbackStateRef = doc(db, 'users', uid, 'feedbackState', 'state');

        const updates: any = {
            lastSatisfactionShown: Timestamp.fromDate(now),
            dismissedCount: (await getFeedbackState(uid))?.dismissedCount + 1 || 1,
            [`triggers.${trigger}.shown`]: true,
        };

        if (permanentDismiss) {
            updates.permanentlyDismissed = true;
        }

        await setDoc(feedbackStateRef, updates, { merge: true });

        console.log('Satisfaction prompt dismissed');
    } catch (error) {
        console.error('Error dismissing satisfaction prompt:', error);
        throw error;
    }
}

/**
 * Update user milestone
 * @param uid - User ID
 * @param milestone - Milestone data to update
 */
export async function updateMilestone(
    uid: string,
    milestone: Partial<UserMilestones>
): Promise<void> {
    if (!uid) {
        throw new Error('UID is required');
    }

    try {
        const { doc, setDoc, Timestamp } = await import('firebase/firestore');
        const db = await getFirestore();

        const userDocRef = doc(db, 'users', uid);

        // Convert dates to Timestamps
        const milestoneData: any = {};
        for (const [key, value] of Object.entries(milestone)) {
            if (value instanceof Date) {
                milestoneData[`milestones.${key}`] = Timestamp.fromDate(value);
            } else {
                milestoneData[`milestones.${key}`] = value;
            }
        }

        await setDoc(userDocRef, milestoneData, { merge: true });

        console.log('Milestone updated successfully');
    } catch (error) {
        console.error('Error updating milestone:', error);
        throw error;
    }
}

/**
 * Upload screenshot for bug report
 * @param file - Screenshot file
 * @param uid - User ID
 * @param feedbackId - Feedback document ID
 * @returns Download URL
 */
export async function uploadScreenshot(
    file: File,
    uid: string,
    feedbackId: string
): Promise<string> {
    if (!uid || !feedbackId) {
        throw new Error('UID and feedbackId are required');
    }

    try {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const storage = await getStorage();

        const path = `feedback-screenshots/${uid}/${feedbackId}/${file.name}`;
        const storageRef = ref(storage, path);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        console.log('Screenshot uploaded successfully');
        return url;
    } catch (error) {
        console.error('Error uploading screenshot:', error);
        throw error;
    }
}
