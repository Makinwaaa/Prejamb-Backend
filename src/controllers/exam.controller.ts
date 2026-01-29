import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as examService from '../services/exam.service';
import { sendSuccess, sendError, sendNotFound } from '../utils/response.utils';
import { ExamMode } from '../models';

/**
 * Get exam history list
 */
export const getHistory = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user!._id.toString();
    const mode = req.query.mode as ExamMode | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await examService.getExamHistory(userId, mode, page, limit);

    sendSuccess(res, 'Exam history retrieved successfully', result);
};

/**
 * Get specific exam details
 */
export const getExamDetail = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user!._id.toString();
    const examId = req.params.id;

    const exam = await examService.getExamValidDetail(examId, userId);

    if (!exam) {
        sendNotFound(res, 'Exam result not found');
        return;
    }

    // Generate feedback on the fly if not present (backward compatibility)
    let feedback = exam.feedback;
    if (!feedback) {
        feedback = examService.generateFeedback(exam.score, exam.totalObtainable);
    }

    sendSuccess(res, 'Exam details retrieved successfully', { ...exam.toObject(), feedback });
};

/**
 * Endpoint for "Retake Exam" - basically just validates it exists and returns config
 * In a full implementation, this might setup a new session.
 */
export const retakeExam = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user!._id.toString();
    const examId = req.params.id;

    const exam = await examService.getExamValidDetail(examId, userId);

    if (!exam) {
        sendNotFound(res, 'Exam to retake not found');
        return;
    }

    // Extract necessary info to start a new exam
    const retakeConfig = {
        mode: exam.mode,
        subjects: exam.subjects.map(s => s.subject),
    };

    sendSuccess(res, 'Exam retake configuration retrieved', retakeConfig);
};
