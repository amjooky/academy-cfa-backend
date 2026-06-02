export interface User {
  id: string;
  email: string;
  phone?: string;
  role: 'SUPER_ADMIN' | 'ACADEMY_ADMIN' | 'COACH' | 'PLAYER' | 'PARENT';
  kycStatus: 'pending' | 'verified' | 'rejected';
  tenantId: string;
}

export interface TenantProfile {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  domain: string;
  language: string;
  isActive: boolean;
}

export interface PlayerProfile {
  id: string;
  userId: string;
  fullName: string;
  dob?: string;
  position?: string;
  photoUrl?: string;
  xpTotal: number;
  rank: string;
}

export interface Team {
  id: string;
  name: string;
  ageGroup?: string;
  coachId?: string;
  season?: string;
}
