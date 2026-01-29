import { ExamResult, IExamResult, ExamMode } from '../models';

interface ExamHistoryFilter {
    userId: string;
    mode?: ExamMode;
}

/**
 * Get paginated exam history
 */
export const getExamHistory = async (
    userId: string,
    mode?: ExamMode,
    page: number = 1,
    limit: number = 10
): Promise<{ exams: IExamResult[]; total: number; pages: number }> => {
    const filter: ExamHistoryFilter = { userId };
    if (mode) {
        filter.mode = mode;
    }

    const skip = (page - 1) * limit;

    const [exams, total] = await Promise.all([
        ExamResult.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            // Select only necessary fields for the list view to optimize bandwidth
            .select('mode score totalObtainable isPassed subjects createdAt durationSeconds'),
        ExamResult.countDocuments(filter),
    ]);

    return {
        exams,
        total,
        pages: Math.ceil(total / limit),
    };
};

/**
 * Get single exam detail
 */
export const getExamValidDetail = async (examId: string, userId: string): Promise<IExamResult | null> => {
    return ExamResult.findOne({ _id: examId, userId });
};

/**
 * Generate simple AI feedback (stub for now, can be expanded with real AI)
 */
export const generateFeedback = (score: number, total: number): string => {
    const percentage = (score / total) * 100;

    if (percentage >= 80) return "Excellent work! You've mastered this subject. Keep it up!";
    if (percentage >= 60) return "Good job! You have a solid understanding, but there's room for improvement in some areas.";
    if (percentage >= 50) return "You passed, but barely. Review the topics you missed to strengthen your knowledge.";
    if (percentage >= 40) return "You're close to passing. Focus on your weak areas and try again.";
    return "Don't give up. Identify your weak subjects and dedicate more time to study them before the next attempt.";
};
