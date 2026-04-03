import React from 'react';
import { Mail, Phone, Calendar, MessageSquare, ArrowRight, Clock } from 'lucide-react';

const ActivityTimeline = ({ activities = [] }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'call':
        return <Phone className="w-4 h-4" />;
      case 'meeting':
        return <Calendar className="w-4 h-4" />;
      case 'note':
        return <MessageSquare className="w-4 h-4" />;
      case 'conversion':
        return <ArrowRight className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'email':
        return 'bg-blue-50 border-blue-200';
      case 'call':
        return 'bg-green-50 border-green-200';
      case 'meeting':
        return 'bg-purple-50 border-purple-200';
      case 'note':
        return 'bg-yellow-50 border-yellow-200';
      case 'conversion':
        return 'bg-pink-50 border-pink-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getActivityBadgeColor = (type) => {
    switch (type) {
      case 'email':
        return 'bg-blue-100 text-blue-800';
      case 'call':
        return 'bg-green-100 text-green-800';
      case 'meeting':
        return 'bg-purple-100 text-purple-800';
      case 'note':
        return 'bg-yellow-100 text-yellow-800';
      case 'conversion':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className={`border rounded-lg p-4 ${getActivityColor(activity.activity_type)}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded mt-1 ${getActivityBadgeColor(activity.activity_type)}`}>
                {getActivityIcon(activity.activity_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm capitalize">
                    {activity.activity_type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(activity.created_at)}
                  </span>
                </div>
                {activity.subject && (
                  <p className="font-medium text-sm mb-1">{activity.subject}</p>
                )}
                {activity.description && (
                  <p className="text-sm text-gray-700 break-words">{activity.description}</p>
                )}
                {activity.created_by && (
                  <p className="text-xs text-gray-500 mt-2">by {activity.created_by}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;
