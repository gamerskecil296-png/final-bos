import { 
  LayoutDashboard, 
  GraduationCap, 
  Trophy, 
  BookOpen, 
  HeartHandshake, 
  Stethoscope, 
  MessageSquare, 
  Users, 
  User 
} from 'lucide-react';

export const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
  { name: 'KENCANA', icon: GraduationCap, path: '/student/kencana' },
  { name: 'Achievement', icon: Trophy, path: '/student/achievement' },
  { name: 'Scholarship', icon: BookOpen, path: '/student/scholarship' },
  { name: 'Counseling', icon: HeartHandshake, path: '/student/counseling' },
  { name: 'Health Screening', icon: Stethoscope, path: '/student/health' },
  { name: 'Student Voice', icon: MessageSquare, path: '/student/voice' },
  { name: 'Organisasi', icon: Users, path: '/student/organisasi' },
  { name: 'Profile', icon: User, path: '/student/profile' },
];
