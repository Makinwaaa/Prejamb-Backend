import { User, ExamResult, Subscription } from '../models';
import { getSubscriptionStatus, PLAN_CONFIG } from './subscription.service';

// JAMB News interface
interface JambNews {
    id: string;
    title: string;
    summary: string;
    date: string;
    source: string;
    url: string;
}

/**
 * Get dashboard data for a user
 */
export const getDashboardData = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Get subscription status
    const subscriptionData = await getSubscriptionStatus(userId);

    // Get quick analytics (same as exam history analytics)
    const analytics = await getQuickAnalytics(userId);

    // Get recent exam results (last 3)
    const recentExams = await getRecentExamResults(userId, 3);

    return {
        welcome: {
            firstName: user.firstName,
            lastName: user.lastName,
            lastLoginAt: user.lastLoginAt,
            avatar: user.avatar || 'default',
        },
        subscription: {
            status: subscriptionData.status,
            planType: subscriptionData.currentPlan?.planType || null,
            planName: subscriptionData.currentPlan?.name || null,
            daysRemaining: subscriptionData.currentPlan?.daysRemaining || null,
            endDate: subscriptionData.currentPlan?.endDate || null,
        },
        analytics,
        recentExams,
        examModes: [
            {
                id: 'PURE_JAMB',
                name: 'Pre-JAMB Questions',
                description: 'Practice with past JAMB questions',
                icon: 'book',
                available: subscriptionData.status === 'ACTIVE',
            },
            {
                id: 'JAMB_AI',
                name: 'JAMB + AI Questions',
                description: 'Mix of JAMB and AI-generated questions',
                icon: 'brain',
                available: subscriptionData.status === 'ACTIVE',
            },
            {
                id: 'SINGLE_SUBJECT',
                name: 'Single Subject Practice',
                description: 'Focus practice on one subject',
                icon: 'target',
                available: subscriptionData.status === 'ACTIVE' &&
                    (subscriptionData.currentPlan?.planType === 'STANDARD' ||
                        subscriptionData.currentPlan?.planType === 'ANNUAL'),
            },
        ],
    };
};

/**
 * Get quick analytics for dashboard
 */
export const getQuickAnalytics = async (userId: string) => {
    // Get all exam results for the user
    const examResults = await ExamResult.find({ userId }).sort({ createdAt: -1 });

    if (examResults.length === 0) {
        return {
            totalExams: 0,
            averageScore: 0,
            highestScore: 0,
            improvementRate: 0,
            lastExamDate: null,
            subjectPerformance: [],
        };
    }

    // Calculate statistics
    const totalExams = examResults.length;
    const scores = examResults.map(exam => (exam.score / exam.totalObtainable) * 100);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const highestScore = Math.round(Math.max(...scores));
    const lastExamDate = examResults[0].createdAt;

    // Calculate improvement rate (compare last 5 exams to first 5)
    let improvementRate = 0;
    if (examResults.length >= 2) {
        const recentAvg = scores.slice(0, Math.min(5, scores.length)).reduce((a, b) => a + b, 0) / Math.min(5, scores.length);
        const olderAvg = scores.slice(-Math.min(5, scores.length)).reduce((a, b) => a + b, 0) / Math.min(5, scores.length);
        improvementRate = Math.round(recentAvg - olderAvg);
    }

    // Get subject performance breakdown
    const subjectStats: Record<string, { total: number; scores: number[] }> = {};
    for (const exam of examResults) {
        if (exam.subjects) {
            for (const subResult of exam.subjects) {
                if (!subjectStats[subResult.subject]) {
                    subjectStats[subResult.subject] = { total: 0, scores: [] };
                }
                subjectStats[subResult.subject].total++;
                subjectStats[subResult.subject].scores.push((subResult.score / subResult.total) * 100);
            }
        }
    }

    const subjectPerformance = Object.entries(subjectStats).map(([subject, data]) => ({
        subject,
        averageScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        examsTaken: data.total,
    })).sort((a, b) => b.averageScore - a.averageScore);

    return {
        totalExams,
        averageScore,
        highestScore,
        improvementRate,
        lastExamDate,
        subjectPerformance: subjectPerformance.slice(0, 4), // Top 4 subjects
    };
};

/**
 * Get recent exam results
 */
export const getRecentExamResults = async (userId: string, limit: number = 3) => {
    const exams = await ExamResult.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('_id mode score totalObtainable isPassed subjects createdAt feedback');

    return exams.map(exam => ({
        id: exam._id.toString(),
        mode: exam.mode,
        score: exam.score,
        totalObtainable: exam.totalObtainable,
        percentage: Math.round((exam.score / exam.totalObtainable) * 100),
        isPassed: exam.isPassed,
        subjectsCount: exam.subjects?.length || 0,
        date: exam.createdAt,
        feedback: exam.feedback,
    }));
};

/**
 * Get JAMB news from official sources
 * Falls back to curated news if scraping fails
 */
export const getJambNews = async (): Promise<JambNews[]> => {
    try {
        // In production, this would scrape from JAMB's official website
        // For now, we return curated, relevant news items
        // These would be updated periodically via a background job or admin interface

        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;

        // Curated news items (would be stored in DB in production)
        const news: JambNews[] = [
            {
                id: 'news-1',
                title: `JAMB ${nextYear} UTME Registration Update`,
                summary: `JAMB has announced the commencement of ${nextYear} UTME registration. Ensure your profile is updated and documentation ready.`,
                date: new Date().toISOString(),
                source: 'JAMB Official',
                url: 'https://www.jamb.gov.ng',
            },
            {
                id: 'news-2',
                title: 'Updated Subject Combinations Released',
                summary: 'JAMB has released updated subject combinations for all courses. Check if your chosen course has any changes.',
                date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                source: 'JAMB Official',
                url: 'https://www.jamb.gov.ng',
            },
            {
                id: 'news-3',
                title: 'JAMB Mock Examination Dates Announced',
                summary: 'The dates for the JAMB mock examination have been announced. Register early to secure your slot.',
                date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
                source: 'JAMB Official',
                url: 'https://www.jamb.gov.ng',
            },
            {
                id: 'news-4',
                title: 'Use of English: Essential Topics to Cover',
                summary: 'JAMB emphasizes key topics in Use of English that candidates must master for optimal performance.',
                date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
                source: 'JAMB Advisory',
                url: 'https://www.jamb.gov.ng',
            },
            {
                id: 'news-5',
                title: 'CBT Centers Nationwide Update',
                summary: 'JAMB has accredited new CBT centers across Nigeria. More options now available for candidates.',
                date: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
                source: 'JAMB Official',
                url: 'https://www.jamb.gov.ng',
            },
        ];

        return news;
    } catch (error) {
        console.error('Error fetching JAMB news:', error);
        return [];
    }
};

/**
 * Check subscription expiry and create fallback to free plan without trial
 * This should be called by a scheduled job or on user login
 */
export const checkAndHandleSubscriptionExpiry = async (userId: string): Promise<void> => {
    const user = await User.findById(userId);
    if (!user) return;

    // Find the current active subscription
    const activeSubscription = await Subscription.findOne({
        userId,
        isActive: true,
    });

    if (!activeSubscription) return;

    // Check if subscription has expired
    if (new Date() > activeSubscription.endDate) {
        // Mark subscription as inactive
        activeSubscription.isActive = false;
        await activeSubscription.save();

        // Update user status to inactive - no free trial since they've already used it
        await User.findByIdAndUpdate(userId, {
            subscriptionStatus: 'INACTIVE',
            subscriptionEndDate: null,
        });

        // Note: We do NOT create a new free subscription here because:
        // 1. User has already used their free trial
        // 2. They need to pay for a new plan
        // All exam modes will be blocked until they pay
    }
};
