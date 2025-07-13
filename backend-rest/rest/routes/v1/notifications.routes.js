import express from 'express';
import controller from '../../controllers/v1/notifications.controller.js';
import { verifyTokenMiddleware, requireSuperAdmin } from '../../../middleware/auth.middleware.js';

const router = express.Router();

// Get user's notifications
router.get('/my', verifyTokenMiddleware, controller.getMyNotifications);

// Get unread notifications count
router.get('/unread/count', verifyTokenMiddleware, controller.getUnreadNotificationsCount);

// Get notification by ID
router.get('/:id', verifyTokenMiddleware, controller.getNotificationById);

// Create new notification (superadmin only)
router.post('/', verifyTokenMiddleware, requireSuperAdmin, controller.createNotification);

// Mark all notifications as read
router.put('/mark-all-read', verifyTokenMiddleware, controller.markAllNotificationsAsRead);

// Update notification (mark as read)
router.put('/:id', verifyTokenMiddleware, controller.updateNotification);

// Delete notification
router.delete('/:id', verifyTokenMiddleware, controller.deleteNotification);

export default router; 