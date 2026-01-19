'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import FeedbackToast from './FeedbackToast';
import type { Theme, UserData, SatisfactionTrigger, PlanType } from '@/types';
import {
    submitSatisfactionFeedback,
    shouldShowSatisfactionPrompt,
    dismissSatisfactionPrompt,
} from '@/lib/services/feedbackService';
import {
    trackSatisfactionPromptShown,
    trackSatisfactionSubmitted,
    trackSatisfactionDismissed,
} from '@/lib/analytics';

interface FeedbackManagerProps {
    user: User | null;
    userData: UserData | null;
    theme: Theme;
}

interface MilestoneEvent extends CustomEvent {
    detail: {
        type: SatisfactionTrigger;
        user: User;
        userData: UserData;
        timestamp: number;
    };
}

// Helper to get user plan
function getUserPlan(userData: UserData | null): PlanType {
    if (!userData) return 'free';

    const totalCredits =
        (userData.subscriptionCredits || 0) +
        (userData.toppedUpBalance || 0);

    // Determine plan based on subscription credits
    if (userData.subscriptionCredits >= 500) return 'automation';
    if (userData.subscriptionCredits >= 100) return 'creator';
    return 'free';
}

// Helper to calculate days since account creation
function getDaysSinceCreation(userData: UserData | null): number {
    if (!userData || !userData.createdAt) return 0;

    try {
        const createdDate = new Date(userData.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    } catch (error) {
        console.error('Error calculating user age:', error);
        return 0;
    }
}

export default function FeedbackManager({ user, userData, theme }: FeedbackManagerProps) {
    const [activeTrigger, setActiveTrigger] = useState<SatisfactionTrigger | null>(null);
    const [isToastOpen, setIsToastOpen] = useState(false);

    useEffect(() => {
        if (!user || !userData) return;

        const handleMilestone = async (event: Event) => {
            const milestoneEvent = event as MilestoneEvent;
            const { type, user: eventUser, userData: eventUserData } = milestoneEvent.detail;

            // Check if we should show satisfaction prompt
            const shouldShow = await shouldShowSatisfactionPrompt(type, eventUser.uid);

            if (shouldShow) {
                setActiveTrigger(type);
                setIsToastOpen(true);

                // Track that prompt was shown
                const userPlan = getUserPlan(eventUserData);
                trackSatisfactionPromptShown(type, userPlan);
            }
        };

        // Listen for milestone events
        window.addEventListener('stumbnail:milestone', handleMilestone);

        return () => {
            window.removeEventListener('stumbnail:milestone', handleMilestone);
        };
    }, [user, userData]);

    const handleToastClose = async () => {
        if (!user || !userData || !activeTrigger) return;

        setIsToastOpen(false);

        // Track dismissal
        const userPlan = getUserPlan(userData);
        trackSatisfactionDismissed(activeTrigger, false, userPlan);

        // Update Firestore to track dismissal (but not permanent)
        try {
            await dismissSatisfactionPrompt(activeTrigger, user.uid, false);
        } catch (error) {
            console.error('Error tracking dismissal:', error);
        }

        // Clear active trigger after animation
        setTimeout(() => {
            setActiveTrigger(null);
        }, 300);
    };

    const handleToastSubmit = async (
        score: number,
        text: string,
        permanentDismiss: boolean
    ) => {
        if (!user || !userData || !activeTrigger) return;

        try {
            const userPlan = getUserPlan(userData);
            const userAge = getDaysSinceCreation(userData);

            // Get milestone counts from userData
            const milestones = (userData as any).milestones || {};
            const generationCount = milestones.generationCount || 0;
            const projectCount = milestones.projectCount || 0;

            // Submit satisfaction feedback
            await submitSatisfactionFeedback(
                user.uid,
                user.email || '',
                user.displayName || '',
                score,
                text,
                activeTrigger,
                userPlan,
                userAge,
                generationCount,
                projectCount
            );

            // Track submission
            trackSatisfactionSubmitted(score, activeTrigger, text.length > 0, userPlan);

            // If permanent dismiss, track it
            if (permanentDismiss) {
                await dismissSatisfactionPrompt(activeTrigger, user.uid, true);
                trackSatisfactionDismissed(activeTrigger, true, userPlan);
            }

            // Show success message (you can add a toast notification here)
            console.log('Thank you for your feedback!');

            // Close toast
            setIsToastOpen(false);

            // Clear active trigger after animation
            setTimeout(() => {
                setActiveTrigger(null);
            }, 300);
        } catch (error) {
            console.error('Error submitting satisfaction feedback:', error);
            // You can show an error toast here
        }
    };

    if (!user || !userData) return null;

    return (
        <FeedbackToast
            isOpen={isToastOpen}
            onClose={handleToastClose}
            onSubmit={handleToastSubmit}
            theme={theme}
            trigger={activeTrigger || ''}
        />
    );
}
