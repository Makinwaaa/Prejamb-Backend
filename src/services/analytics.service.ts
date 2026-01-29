import { ExamResult, IExamResult, ExamMode } from '../models';

interface AnalyticsData {
    totalExamsWritten: number;
    examsPassed: number;
    examsFailed: number;
    performanceAverage: number;
}

/**
 * Get dashboard analytics for a user
 */
export const getUserAnalytics = async (userId: string): Promise<AnalyticsData> => {
    // Parallelize queries for better performance
    const [totalWritten, passedCount, failedCount, allResults] = await Promise.all([
        ExamResult.countDocuments({ userId }),
        ExamResult.countDocuments({ userId, isPassed: true }),
        ExamResult.countDocuments({ userId, isPassed: false }),
        ExamResult.find({ userId, isPassed: true }, { score: 1, totalObtainable: 1 }), // Only fetch necessary fields for passed exams
    ]);

    // Calculate performance average based on passed exams
    let performanceAverage = 0;
    if (allResults.length > 0) {
        const totalPercentage = allResults.reduce((sum, exam) => {
            const percentage = (exam.score / exam.totalObtainable) * 100;
            return sum + percentage;
        }, 0);
        performanceAverage = Math.round(totalPercentage / allResults.length);
    }

    return {
        totalExamsWritten: totalWritten,
        examsPassed: passedCount,
        examsFailed: failedCount,
        performanceAverage,
    };
};
