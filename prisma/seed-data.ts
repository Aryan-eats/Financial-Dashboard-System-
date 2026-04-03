import { RecordCategory, RecordType, Role, UserStatus } from "@prisma/client";

export const demoUsers = [
  {
    name: "Admin User",
    email: "admin@demo.com",
    password: "Admin@123",
    role: Role.ADMIN,
  },
  {
    name: "Analyst User",
    email: "analyst@demo.com",
    password: "Analyst@123",
    role: Role.ANALYST,
  },
  {
    name: "Viewer User",
    email: "viewer@demo.com",
    password: "Viewer@123",
    role: Role.VIEWER,
  },
] as const;

const expenseTemplates = [
  { category: RecordCategory.RENT, amount: 900, description: "Monthly rent" },
  { category: RecordCategory.FOOD, amount: 180, description: "Groceries" },
  { category: RecordCategory.TRANSPORT, amount: 70, description: "Transport pass" },
  { category: RecordCategory.UTILITIES, amount: 120, description: "Utilities" },
  { category: RecordCategory.ENTERTAINMENT, amount: 60, description: "Streaming and movies" },
  { category: RecordCategory.HEALTHCARE, amount: 85, description: "Healthcare" },
  { category: RecordCategory.SHOPPING, amount: 140, description: "Shopping" },
  { category: RecordCategory.EDUCATION, amount: 95, description: "Online course" },
  { category: RecordCategory.OTHER, amount: 45, description: "Miscellaneous" },
] as const;

export function buildSeedRecords(userId: string, now = new Date()) {
  const records: Array<{
    userId: string;
    type: RecordType;
    category: RecordCategory;
    amount: number;
    description: string;
    date: Date;
  }> = [];

  for (let monthOffset = 0; monthOffset < 6; monthOffset += 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 5);

    records.push({
      userId,
      type: RecordType.INCOME,
      category: RecordCategory.SALARY,
      amount: 3200 + monthOffset * 25,
      description: "Salary payment",
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 2),
    });

    records.push({
      userId,
      type: RecordType.INCOME,
      category: RecordCategory.FREELANCE,
      amount: 450 + monthOffset * 20,
      description: "Freelance project",
      date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 14),
    });

    if (monthOffset < 3) {
      records.push({
        userId,
        type: RecordType.INCOME,
        category: RecordCategory.INVESTMENT,
        amount: 180 + monthOffset * 10,
        description: "Investment return",
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 24),
      });
    }

    expenseTemplates.forEach((template, index) => {
      records.push({
        userId,
        type: RecordType.EXPENSE,
        category: template.category,
        amount: template.amount + monthOffset * 3 + index,
        description: template.description,
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 6 + index),
      });
    });
  }

  return records;
}

export function buildSeedUserCreateInput(user: (typeof demoUsers)[number], password: string) {
  return {
    name: user.name,
    email: user.email,
    password,
    role: user.role,
    status: UserStatus.ACTIVE,
  };
}
