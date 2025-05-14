// frontend/components/common/StatusBadge.tsx
import React from 'react';

type StatusType = 'draft' | 'pending' | 'in_progress' | 'completed' | 'signed' | 'assessment' | 'default';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  // Map status to a normalized status type
  const normalizedStatus = getNormalizedStatus(status);
  
  // Map status type to color scheme
  const colorScheme = getColorScheme(normalizedStatus);
  
  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorScheme} ${className}`}
    >
      {status}
    </span>
  );
};

// Helper function to normalize various status strings
function getNormalizedStatus(status: string): StatusType {
  const normalized = status.toLowerCase();
  
  if (normalized.includes('draft')) return 'draft';
  if (normalized.includes('pend') || normalized.includes('wait')) return 'pending';
  if (normalized.includes('progress') || normalized.includes('active')) return 'in_progress';
  if (normalized.includes('complete') || normalized.includes('done') || normalized.includes('finish')) return 'completed';
  if (normalized.includes('sign')) return 'signed';
  if (normalized.includes('assess')) return 'assessment';
  
  return 'default';
}

// Helper function to map status type to color scheme
function getColorScheme(status: StatusType): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'signed':
      return 'bg-green-100 text-green-800';
    case 'assessment':
      return 'bg-yellow-100 text-yellow-800';
    case 'default':
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default StatusBadge;