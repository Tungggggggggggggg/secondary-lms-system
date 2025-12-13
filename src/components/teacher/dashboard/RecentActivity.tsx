"use client";

import { useTeacherDashboardActivities } from "@/hooks/use-teacher-dashboard";
import { ActivityList, type ActivityItem } from "@/components/shared";
import { FileCheck, UserPlus, MessageSquare, Star, Bell } from "lucide-react";

export default function RecentActivity() {
    const { activities, isLoading, error } = useTeacherDashboardActivities();

    // Helper function để lấy config theo actorType
    const getActorConfig = (actorType: string) => {
        switch (actorType) {
            case 'STUDENT':
                return {
                    color: 'from-blue-400 to-blue-500',
                    short: 'HS'
                };
            case 'PARENT':
                return {
                    color: 'from-purple-400 to-purple-500',
                    short: 'PH'
                };
            case 'TEACHER':
                return {
                    color: 'from-green-400 to-green-500',
                    short: 'GV'
                };
            default:
                return {
                    color: 'from-gray-400 to-gray-500',
                    short: '?'
                };
        }
    };

    // Helper function để lấy icon theo type (Lucide)
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'SUBMISSION':
                return <FileCheck className="h-4 w-4" />;
            case 'JOIN':
                return <UserPlus className="h-4 w-4" />;
            case 'COMMENT':
            case 'MESSAGE':
                return <MessageSquare className="h-4 w-4" />;
            case 'LIKE':
                return <Star className="h-4 w-4" />;
            default:
                return <Bell className="h-4 w-4" />;
        }
    };

    const getHrefForActivity = (activity: any): string | undefined => {
        if (!activity) return undefined;

        switch (activity.type) {
            case 'SUBMISSION': {
                if (activity.assignmentId) {
                    return `/dashboard/teacher/assignments/${activity.assignmentId}/submissions`;
                }
                return undefined;
            }
            case 'JOIN': {
                if (activity.classroomId) {
                    return `/dashboard/teacher/classrooms/${activity.classroomId}`;
                }
                return undefined;
            }
            case 'COMMENT': {
                if (activity.classroomId && activity.announcementId) {
                    return `/dashboard/teacher/classrooms/${activity.classroomId}/announcements/${activity.announcementId}`;
                }
                return undefined;
            }
            default:
                return undefined;
        }
    };

    const items: ActivityItem[] =
        !activities || activities.length === 0
            ? []
            : activities.map((activity) => {
                  const config = getActorConfig(activity.actorType);
                  const icon = getTypeIcon(activity.type);
                  return {
                      id: activity.id,
                      color: config.color,
                      icon,
                      primaryText: `${activity.actorName} ${activity.action}`,
                      secondaryText: activity.detail,
                      href: getHrefForActivity(activity),
                  };
              });

    return (
        <ActivityList
            title="Hoạt động gần đây"
            loading={isLoading && !activities}
            error={error || null}
            items={items}
            emptyMessage="Chưa có hoạt động nào"
        />
    );
}