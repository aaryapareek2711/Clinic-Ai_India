import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface Props {
  completed: boolean;
  percentage?: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export default function CarePrepStatusBadge({
  completed,
  percentage = 0,
  size = 'md',
  showPercentage = false
}: Props) {
  if (completed) {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-300">
        <CheckCircle className="w-3 h-3 mr-1" />
        CarePrep Complete
      </Badge>
    );
  }

  if (percentage > 0) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
        <Clock className="w-3 h-3 mr-1" />
        {showPercentage ? `CarePrep ${percentage}%` : 'CarePrep In Progress'}
      </Badge>
    );
  }

  return (
    <Badge className="bg-gray-100 text-gray-700 border-gray-300">
      <XCircle className="w-3 h-3 mr-1" />
      CarePrep Not Started
    </Badge>
  );
}
