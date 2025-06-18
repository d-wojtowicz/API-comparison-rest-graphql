import express from 'express';
import controller from '../controllers/notifications.controller.js';
import { verifyTokenMiddleware, requireAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Get user's notifications
router.get('/my', verifyTokenMiddleware, controller.getMyNotifications);

// Get unread notifications count
router.get('/unread/count', verifyTokenMiddleware, controller.getUnreadNotificationsCount);

// Get notification by ID
router.get('/:id', verifyTokenMiddleware, controller.getNotificationById);

// Create new notification (admin only)
router.post('/', verifyTokenMiddleware, requireAdmin, controller.createNotification);

// Update notification (mark as read)
router.put('/:id', verifyTokenMiddleware, controller.updateNotification);

// Mark all notifications as read
router.put('/mark-all-read', verifyTokenMiddleware, controller.markAllNotificationsAsRead);

// Delete notification
router.delete('/:id', verifyTokenMiddleware, controller.deleteNotification);

export default router; 