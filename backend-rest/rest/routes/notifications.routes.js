import express from 'express';
import controller from '../controllers/notifications.controller.js';
// TODO: Import JWT verifyToken

const router = express.Router();

// Get user's notifications
router.get('/my', controller.getMyNotifications);

// Get unread notifications count
router.get('/unread/count', controller.getUnreadNotificationsCount);

// Get notification by ID
router.get('/:id', controller.getNotificationById);

// Create new notification (admin only)
router.post('/', controller.createNotification);

// Update notification (mark as read)
router.put('/:id', controller.updateNotification);

// Mark all notifications as read
router.put('/mark-all-read', controller.markAllNotificationsAsRead);

// Delete notification
router.delete('/:id', controller.deleteNotification);

export default router; 