// Notifications API Service

import { apiClient } from './client';
import type { PageResponse } from './types';
import {
  substituteNotificationVariables,
  cleanNotificationMessage,
  getNotificationFriendlyTitle
} from '../utils/notifications';


export interface NotificationResponse {
  notificationId: number;
  userId?: string;
  employeeNo?: number;
  notificationType: string;
  titleEn?: string;
  titleAr?: string;
  messageEn?: string;
  messageAr?: string;
  // Computed fields for backward compatibility
  title: string;
  message: string;
  isRead: boolean | string;
  createdDate: string;
  relatedId?: number;
  referenceId?: number;
  referenceType?: string;
  linkUrl?: string;
  priority: 'H' | 'M' | 'L' | 'HIGH' | 'MEDIUM' | 'LOW' | 'URGENT';
  sentViaEmail?: string;
  emailSentDate?: string | null;
  readDate?: string | null;
  unread?: boolean;
  highPriority?: boolean;
}

export interface NotificationSummary {
  unreadCount: number;
  recentNotifications: NotificationResponse[];
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notifyOnApproval: boolean;
  notifyOnRejection: boolean;
  notifyOnPayment: boolean;
  notifyOnSystemUpdates: boolean;
}

export const notificationsApi = {
  /**
   * Get my notifications (paginated)
   */
  async getMyNotifications(params?: { page?: number; size?: number }): Promise<PageResponse<NotificationResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());

    const query = queryParams.toString();
    const response = await apiClient.get<PageResponse<any>>(
      `/notifications/my${query ? `?${query}` : ''}`
    );

    // Map backend response to frontend format
    const mappedContent = response.content.map((notif: any) => {
      // Get title - use Arabic first, then English, then generate from notification type
      let title = notif.titleAr || notif.titleEn || '';
      if (!title || title.includes('{{')) {
        title = getNotificationFriendlyTitle(notif.notificationType);
      } else {
        title = cleanNotificationMessage(title);
      }

      const rawMessage = notif.messageAr || notif.messageEn || '';

      // Extract variables if they exist (sometimes backend puts them in a field like 'templateVariables' or 'data')
      const variables = notif.templateVariables || notif.data || {};

      // Apply variable substitution and cleanup
      const message = substituteNotificationVariables(rawMessage, variables);

      return {
        ...notif,
        title,
        message,
        isRead: typeof notif.isRead === 'string' ? notif.isRead === 'Y' : notif.isRead,
      };
    });

    return {
      ...response,
      content: mappedContent,
    };
  },

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<number>('/notifications/unread-count');
    return response;
  },

  async markAsRead(notificationId: number): Promise<void> {
    await apiClient.put<void>(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.put<void>('/notifications/mark-all-read');
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: number): Promise<void> {
    await apiClient.delete<void>(`/notifications/${notificationId}`);
  },

  /**
   * Get notification summary (unread count + recent)
   */
  async getSummary(): Promise<NotificationSummary> {
    const [unreadCount, recent] = await Promise.all([
      this.getUnreadCount(),
      this.getMyNotifications({ page: 0, size: 5 }),
    ]);

    return {
      unreadCount,
      recentNotifications: recent.content as NotificationResponse[],
    };
  },

  /**
   * Get notification settings
   */
  async getSettings(): Promise<NotificationSettings> {
    // Mock response for now as backend might not have this yet
    // return apiClient.get<ApiResponse<NotificationSettings>>('/notifications/settings');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnPayment: true,
          notifyOnSystemUpdates: true,
        });
      }, 500);
    });
  },

  /**
   * Update notification settings
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateSettings(_settings: NotificationSettings): Promise<void> {
    // Mock response for now
    // await apiClient.put<ApiResponse<void>>('/notifications/settings', settings);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 500);
    });
  },
};

