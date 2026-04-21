import { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export interface StatCardData {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  changeType?: 'increase' | 'decrease';
}

export interface RecentActivityItem {
  id: string;
  user: {
    name: string;
    avatarUrl: string;
  };
  action: string;
  target: string;
  timestamp: string;
}

export interface SettingsCategory {
  title: string;
  items: {
    title: string;
    description: string;
    href: string;
  }[];
}

export interface SubscriptionPlan {
  name: string;
  price: string;
  features: string[];
  isCurrent: boolean;
}
