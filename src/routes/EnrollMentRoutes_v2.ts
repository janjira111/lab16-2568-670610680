import { Router, type Request, type Response } from "express";
import dotenv from "dotenv";
dotenv.config();

// import database
import { students, reset_enrollments, enrollments } from "../db/db.js";
import { authenticateToken } from "../middlewares/authenMiddleware.js";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminMiddleware.js";
import { checkRoleAdminOrOwnId } from "../middlewares/checkRoleAdminOrOwnIdMiddleware.js";
import { checkRoleStudent } from "../middlewares/checkRoleStudentMiddleware.js";
import { checkRoleStudentDeleted } from "../middlewares/checkRoleDeletedStudentMiddleware.js";
import { zStudentId, zEnrollmentBody } from "../libs/zodValidators.js";
import type { CustomRequest, Enrollment } from "../libs/types.js";
const router = Router();

// GET /api/v2/users
router.get(
  "/",
  authenticateToken,
  checkRoleAdmin,
  (req: Request, res: Response) => {
    try {
      // return all users
      const datauser = students.map((s) => ({
        studentId: s.studentId,
        courses: enrollments
          .filter((en) => en.studentId === s.studentId)
          .map((en) => ({ courseId: en.courseId })),
      }));
      return res.json({
        success: true,
        message: "Enrollments Information",
        data: datauser,
      });
    } catch (err) {
      return res.status(200).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

// POST /api/v2/enrollments/reset
router.post(
  "/reset",
  authenticateToken,
  checkRoleAdmin,
  (req: Request, res: Response) => {
    try {
      reset_enrollments();
      return res.status(200).json({
        success: true,
        message: "enrollments data has been reset",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);
router.get(
  "/:studentId",
  authenticateToken,
  checkRoleAdminOrOwnId,
  (req: CustomRequest, res: Response) => {
    try {
      const studentId = req.params.studentId;
      const result = zStudentId.safeParse(studentId);
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const studentIndex = students.findIndex(
        (student) => student.studentId === studentId
      );
      if (studentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "StudentId does not exists",
        });
      }
      return res.status(200).json({
        success: true,
        message: "Student information",
        data: students[studentIndex],
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);
router.post(
  "/:studentId",
  authenticateToken,
  checkRoleStudent,
  (req: CustomRequest, res: Response) => {
    try {
      const studentId = req.params.studentId;
      const body = req.body as Enrollment;

      const result1 = zStudentId.safeParse(studentId);
      const result2 = zEnrollmentBody.safeParse(body);

      if (!result1.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result1.error.issues[0]?.message,
        });
      }
      if (!result2.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result2.error.issues[0]?.message,
        });
      }
      if (body.studentId !== studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }
      const studentIndex = students.findIndex(
        (student) => studentId === student.studentId
      );
      if (studentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "StudentId does not exists",
        });
      }
      const findenrollment = enrollments.find(
        (enroll: Enrollment) =>
          body.studentId === enroll.studentId &&
          body.courseId === enroll.courseId
      );

      if (findenrollment) {
        return res.status(409).json({
          success: false,
          message: "Enrollment is already exists",
        });
      }

      if (studentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "StudentId does not exists",
        });
      }
      enrollments.push(body);
      const newcourse = enrollments
        .filter((enroll) => enroll.studentId === studentId)
        .map((enroll) => enroll.courseId);
        
      if (students[studentIndex]?.courses !== undefined) {
        students[studentIndex].courses = {
          ...students[studentIndex].courses,
          ...{ courses: newcourse },
        };
      }

      return res.status(200).json({
        success: true,
        message: `Student ${studentId} && Course ${body.courseId} has been added successfully`,
        data: body,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);
router.delete(
  "/:studentId",
  authenticateToken,
  checkRoleStudentDeleted,
  (req: Request, res: Response) => {
    try {
      const studentId = req.params.studentId;
      const body = req.body;

      const result1 = zStudentId.safeParse(studentId);
      const result2 = zEnrollmentBody.safeParse(body);

      if (!result1.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result1.error.issues[0]?.message,
        });
      }
      if (!result2.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result2.error.issues[0]?.message,
        });
      }
      if (body.studentId !== studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }
      const studentIndex = students.findIndex(
        (student) => student.studentId === studentId
      );

      if (studentIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "StudentId does not exists",
        });
      }
      const enrollIndex = enrollments.findIndex(
        (enroll) =>
          enroll.studentId === studentId && enroll.courseId === body.courseId
      );
      if (enrollIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Enrollment does not exists",
        });
      }

      enrollments.splice(enrollIndex, 1);

      const newcourse = enrollments
        .filter((enroll) => enroll.studentId === studentId)
        .map((enroll) => enroll.courseId);

      if (students[studentIndex]?.courses !== undefined) {
        students[studentIndex].courses = {
          ...students[studentIndex].courses,
          ...{ courses: newcourse },
        };
      }
      return res.status(200).json({
        success: true,
        message: `Student ${studentId} && Course ${body.courseId} has been deleted successfully`,
        data: enrollments,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);
export default router;