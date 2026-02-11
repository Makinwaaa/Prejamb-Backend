import { User, ExamResult, Subscription } from '../models';
import { getSubscriptionStatus, PLAN_CONFIG } from './subscription.service';
import { formatRelativeTime } from '../utils/date.utils';

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
            lastLoginAt: formatRelativeTime(user.lastLoginAt),
            avatar: user.avatar || 'default',
            plan: user.subscriptionPlan || 'FREE',
        },
        subscription: {
            status: subscriptionData.status,
            planType: subscriptionData.currentPlan?.planType || null,
            planName: subscriptionData.currentPlan?.name || null,
            daysRemaining: subscriptionData.currentPlan?.daysLeft || null,
            endDate: subscriptionData.currentPlan?.endDate || null,
            createdAt: subscriptionData.currentPlan?.createdAt || null,
            startDate: subscriptionData.currentPlan?.startDate || null,
            dateActivated: subscriptionData.currentPlan?.dateActivated || null,
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
/**
 * Get JAMB news from official sources
 * Scrapes news from JAMB official website
 */
export const getJambNews = async (): Promise<JambNews[]> => {
    try {
        // Try to fetch from JAMB news page
        const response = await fetch('https://www.jamb.gov.ng/news');
        const html = await response.text();

        const news: JambNews[] = [];
        // Regex to extract news items from the structure found in jamb_news.html
        // Structure: <div class="txt"><h4><a href="...">Title</a></h4><p>Summary... <a href="...">read more...</a></p>...<span class="info">DATE</span>

        // We use a simplified regex approach to be more robust against minor HTML variations
        const newsItemsRegex = /<div class="txt">\s*<h4><a href="([^"]+)">([^<]+)<\/a><\/h4>\s*<p>([\s\S]*?)<\/p>\s*<span class="read">\s*<\/span>\s*<span class="info">([^<]+)\|/g;

        let match;
        let idCounter = 1;

        while ((match = newsItemsRegex.exec(html)) !== null && news.length < 3) {
            const [_, relativeUrl, title, rawSummary, dateStr] = match;

            // Clean up summary
            let summary = rawSummary.replace(/<a[^>]*>.*?<\/a>/g, '').replace(/read more\.\.\./i, '').trim();
            // Remove excessive whitespace
            summary = summary.replace(/\s+/g, ' ');
            if (summary.length > 150) summary = summary.substring(0, 150) + '...';

            // Resolve URL
            const url = relativeUrl.startsWith('http')
                ? relativeUrl
                : `https://www.jamb.gov.ng/${relativeUrl}`;

            // Parse date (approximate)
            let date = new Date().toISOString();
            // dateStr is like "MAY, 2025 "
            try {
                const cleanDateStr = dateStr.trim();
                const parsedDate = new Date(cleanDateStr);
                if (!isNaN(parsedDate.getTime())) {
                    date = parsedDate.toISOString();
                }
            } catch (e) {
                // Keep default date
            }

            news.push({
                id: `news-${idCounter++}`,
                title: title.trim(),
                summary,
                date,
                source: 'JAMB Official',
                url
            });
        }

        if (news.length > 0) {
            return news;
        }

        // Fallback to hardcoded news if scraping finds nothing (e.g. structure changed)
        console.log('Scraping found no items, falling back to static data');
        return getFallbackNews();

    } catch (error) {
        console.error('Error fetching JAMB news:', error);
        return getFallbackNews();
    }
};

/**
 * Fallback news data
 */
const getFallbackNews = (): JambNews[] => {
    const nextYear = new Date().getFullYear() + 1;
    return [
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
            date: new Date(Date.now() - 86400000).toISOString(),
            source: 'JAMB Official',
            url: 'https://www.jamb.gov.ng',
        },
        {
            id: 'news-3',
            title: 'JAMB Mock Examination Dates Announced',
            summary: 'The dates for the JAMB mock examination have been announced. Register early to secure your slot.',
            date: new Date(Date.now() - 172800000).toISOString(),
            source: 'JAMB Official',
            url: 'https://www.jamb.gov.ng',
        }
    ];
};


/**
 * Check subscription expiry and fallback to free plan.
 * This ensures users always have an active plan.
 * Called on user login or via scheduled job.
 */
export const checkAndHandleSubscriptionExpiry = async (userId: string): Promise<void> => {
    const user = await User.findById(userId);
    if (!user) return;

    // Find the current active subscription
    const activeSubscription = await Subscription.findOne({
        userId,
        isActive: true,
    });

    if (!activeSubscription) {
        // No active subscription at all — create free plan
        const { ensureActiveSubscription } = await import('./subscription.service');
        await ensureActiveSubscription(userId);
        return;
    }

    // Check if paid subscription has expired
    if (activeSubscription.planType !== 'FREE' && new Date() > activeSubscription.endDate) {
        // Mark expired subscription as inactive
        activeSubscription.isActive = false;
        await activeSubscription.save();

        // Automatically fallback to free plan
        const { createFreeSubscription } = await import('./subscription.service');
        await createFreeSubscription(userId);
    }
};

