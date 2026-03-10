export const SEED = {
  modules: [
    { id: 1, title: "Introduction to GAD",                   category: "Basics",    status: "Published", updated: "2026-02-10" },
    { id: 2, title: "Gender Equality in the Workplace",       category: "Workplace", status: "Published", updated: "2026-02-18" },
    { id: 3, title: "VAWC Awareness",                        category: "Policy",    status: "Draft",     updated: "2026-03-01" },
  ],
  assessments: [
    { id: 1, title: "GAD Basics Quiz",                module: "Introduction to GAD",                 questions: 10, status: "Active" },
    { id: 2, title: "Workplace Equality Assessment",  module: "Gender Equality in the Workplace",    questions: 15, status: "Active" },
    { id: 3, title: "VAWC Knowledge Check",           module: "VAWC Awareness",                      questions: 8,  status: "Draft"  },
  ],
  seminars: [
    { id: 1, title: "International Women's Day Forum", date: "2026-03-08", time: "09:00 AM", status: "Upcoming",  attendees: 0  },
    { id: 2, title: "GAD Planning Workshop",           date: "2026-02-14", time: "02:00 PM", status: "Completed", attendees: 47 },
    { id: 3, title: "Gender Sensitivity Training",     date: "2026-03-20", time: "10:00 AM", status: "Upcoming",  attendees: 0  },
  ],
  certificates: [
    { id: 1, student: "Maria Santos",    course: "Introduction to GAD",   issued: "2026-02-15", template: "Standard" },
    { id: 2, student: "Juan dela Cruz",  course: "GAD Planning Workshop",  issued: "2026-02-14", template: "Seminar"  },
    { id: 3, student: "Ana Reyes",       course: "Introduction to GAD",   issued: "2026-02-15", template: "Standard" },
  ],
  events: [
    { id: 1, title: "GAD Orientation Day",        date: "2026-03-10", type: "Activity", desc: "Annual orientation for new GAD advocates."          },
    { id: 2, title: "Women's Month Celebration",  date: "2026-03-18", type: "Event",    desc: "Month-long celebration of women's contributions."   },
    { id: 3, title: "GADRC Team Meeting",         date: "2026-03-25", type: "Meeting",  desc: "Quarterly planning and review meeting."             },
  ],
};

export const ANALYTICS = {
  totalStudents:    312,
  completionRate:   68,
  activeModules:    12,
  seminarAttendance: 89,
  certificatesIssued: 147,
  monthlyActive:    204,
};

export const MODULE_CATEGORIES = ["Basics", "Workplace", "Policy", "Health", "Culture"];

export const CERTIFICATE_TEMPLATES = ["Standard", "Seminar", "Excellence"];

export const NAV_ITEMS = [
  { id: "dashboard",    icon: "🏠", label: "Dashboard"    },
  { id: "modules",      icon: "📂", label: "Modules"      },
  { id: "assessments",  icon: "📝", label: "Assessments"  },
  { id: "analytics",    icon: "📊", label: "Analytics"    },
  { id: "certificates", icon: "🎓", label: "Certificates" },
  { id: "seminars",     icon: "🎙️", label: "Seminars"     },
  { id: "calendar",     icon: "📅", label: "Calendar"     },
];
