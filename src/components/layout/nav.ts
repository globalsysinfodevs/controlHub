import {
  LayoutDashboard,
  Bot,
  MessagesSquare,
  Users,
  Boxes,
  Wrench,
  ShieldAlert,
  ScrollText,
  BookOpen,
  LayoutTemplate,
  CreditCard,
  Building2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  section: "Operate" | "Build" | "Govern" | "Account";
  badgeKey?: "alerts" | "notifications";
  ready?: boolean; // deeply built screen vs. stub
}

export const NAV: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard, section: "Operate", ready: true },
  { label: "Chat", to: "/chat", icon: MessagesSquare, section: "Operate", ready: true },
  { label: "Agents", to: "/agents", icon: Bot, section: "Build", ready: true },
  { label: "Tools", to: "/tools", icon: Wrench, section: "Build" },
  { label: "Knowledge Base", to: "/knowledge-base", icon: BookOpen, section: "Build" },
  { label: "Templates", to: "/templates", icon: LayoutTemplate, section: "Build" },
  { label: "Users", to: "/users", icon: Users, section: "Govern" },
  { label: "Groups", to: "/groups", icon: Boxes, section: "Govern" },
  { label: "Security", to: "/security", icon: ShieldAlert, section: "Govern", badgeKey: "alerts" },
  { label: "Audit Logs", to: "/audit", icon: ScrollText, section: "Govern" },
  { label: "Billing", to: "/billing", icon: CreditCard, section: "Account" },
  { label: "Tenant", to: "/tenant", icon: Building2, section: "Account" },
];

export const SECTIONS: NavItem["section"][] = ["Operate", "Build", "Govern", "Account"];
