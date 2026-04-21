import { StatCardData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function StatCard({ title, value, icon: Icon, change, changeType }: StatCardData) {
  const changeColor = changeType === 'increase' ? 'text-green-600' : 'text-red-600';
  const ChangeIcon = changeType === 'increase' ? ArrowUp : ArrowDown;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {change && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${changeColor}`}>
            <ChangeIcon className="h-3 w-3" />
            <span>{change}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
