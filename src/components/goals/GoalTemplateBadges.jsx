import React from 'react';
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Settings, 
  Megaphone, 
  TrendingUp, 
  Users, 
  Target,
  MoreHorizontal 
} from 'lucide-react';

const categoryConfig = {
  financial: {
    label: 'פיננסי',
    icon: DollarSign,
    color: 'bg-green-500/20 text-green-400 border-green-500/40'
  },
  operational: {
    label: 'תפעולי',
    icon: Settings,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/40'
  },
  marketing: {
    label: 'שיווק',
    icon: Megaphone,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/40'
  },
  sales: {
    label: 'מכירות',
    icon: TrendingUp,
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/40'
  },
  hr: {
    label: 'משאבי אנוש',
    icon: Users,
    color: 'bg-pink-500/20 text-pink-400 border-pink-500/40'
  },
  strategic: {
    label: 'אסטרטגי',
    icon: Target,
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
  },
  other: {
    label: 'אחר',
    icon: MoreHorizontal,
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/40'
  }
};

export function CategoryBadge({ category, showIcon = true, className = '' }) {
  const config = categoryConfig[category] || categoryConfig.other;
  const Icon = config.icon;

  return (
    <Badge className={`text-sm px-3 py-1.5 font-semibold border ${config.color} ${className}`}>
      {showIcon && <Icon className="w-3 h-3 ml-1" />}
      {config.label}
    </Badge>
  );
}

export function PopularBadge({ usageCount }) {
  if (usageCount < 10) return null;
  
  return (
    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-xs px-2 py-1">
      ⭐ פופולרי
    </Badge>
  );
}

export { categoryConfig };