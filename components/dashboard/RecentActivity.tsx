import { RecentActivityItem } from '@/lib/types';
import { FileText, UserPlus, CreditCard, CheckCircle } from 'lucide-react';

const activities: RecentActivityItem[] = [
  {
    id: '1',
    user: { name: 'John Doe', avatarUrl: '/avatars/01.png' },
    action: 'added a new client',
    target: 'Sarah Smith',
    timestamp: '5m ago',
  },
  {
    id: '2',
    user: { name: 'Jane Roe', avatarUrl: '/avatars/02.png' },
    action: 'completed an appointment with',
    target: 'Michael Johnson',
    timestamp: '1h ago',
  },
  {
    id: '3',
    user: { name: 'Dr. Emily Carter', avatarUrl: '/avatars/03.png' },
    action: 'sent an invoice to',
    target: 'Emily White',
    timestamp: '3h ago',
  },
  {
    id: '4',
    user: { name: 'John Doe', avatarUrl: '/avatars/01.png' },
    action: 'updated notes for',
    target: 'David Brown',
    timestamp: '1d ago',
  },
];

const getActivityIcon = (action: string) => {
  if (action.includes('added')) return UserPlus;
  if (action.includes('completed')) return CheckCircle;
  if (action.includes('invoice')) return CreditCard;
  return FileText;
};

export default function RecentActivity() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = getActivityIcon(activity.action);
        return (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0 flex items-center justify-center">
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <span className="font-semibold">{activity.user.name}</span>{' '}
                <span className="text-gray-600">{activity.action}</span>{' '}
                <span className="font-semibold">{activity.target}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{activity.timestamp}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
