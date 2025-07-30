

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { AzureOpenAI } from 'openai';

dotenv.config();

const prisma = new PrismaClient();

const client = new AzureOpenAI({
  azureOpenAIPublicEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT,
  openAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview',
});

const tableAccess = {
  EmployeeDetails: ['ADMIN', 'ANALYST'],
  PayrollData: ['ADMIN'],
  ProjectInfo: ['ADMIN', 'EMPLOYEE', 'ANALYST'],
};

const columnRestrictions = {
  EmployeeDetails: ['SSN'],
};

const prismaSchema = `
model EmployeeDetails {
  id         Int      @id @default(autoincrement())
  name       String
  email      String   @unique
  department String
  joinDate   DateTime @default(now())
  createdBy  Int
  ssn        String   @unique
}

model PayrollData {
  id           Int      @id @default(autoincrement())
  employeeId   Int
  salary       Float
  bonus        Float?
  lastUpdated  DateTime @default(now())
  processedBy  Int
}

model ProjectInfo {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  startDate   DateTime
  endDate     DateTime?
  createdBy   Int
}
`;

const roleList = ['ADMIN', 'ANALYST', 'EMPLOYEE'];
function sanitizeNLQ(nlq) {
  const pattern = new RegExp(`\\b(${roleList.join('|')})\\b`, 'gi');
  return nlq.replace(pattern, '').replace(/\s+/g, ' ').trim();
}

function extractTables(query) {
  const regex = /from\s+(\w+)|join\s+(\w+)|update\s+(\w+)|into\s+(\w+)/gi;
  const tables = new Set();
  let match;
  while ((match = regex.exec(query))) {
    const table = match[1] || match[2] || match[3] || match[4];
    if (table) tables.add(table);
  }
  return [...tables];
}

async function isQueryRelevant(nlq, schema) {
  const prompt = `
Does the following user query relate to the database schema below?

Schema:
${schema}

Query:
"${nlq}"

Answer only YES or NO. Do not explain.
`;

  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages: [
      { role: 'system', content: 'You are a strict scope checker. Reply only with YES or NO.' },
      { role: 'user', content: prompt },
    ],
  });

  const reply = response.choices[0]?.message?.content?.trim().toUpperCase();
  return reply === 'YES';
}

export const processNLQ = async (req, res) => {
  const { nlq } = req.body;

  if (!req.user || !req.user.role) {
    return res.status(401).json({ message: 'Not authorized. Role missing in token.' });
  }

  if (/user role\s*:/i.test(nlq)) {
    return res.status(400).json({ error: "Do not include role info in your query." });
  }

  const role = req.user.role;
  const cleanNLQ = sanitizeNLQ(nlq);

  try {
    const isRelevant = await isQueryRelevant(cleanNLQ, prismaSchema);
    if (!isRelevant) {
      await prisma.adminLog.create({
        data: {
         userId: req.user.userId,
          userName: req.user.name,
          userRole: role,
          prompt: nlq,
          step0Result: 'NO',
          step1SQL: '',
          step2Decision: 'Query out of scope',
        },
      });
      return res.status(400).json({
        error: 'Query out of scope. Please ask about employee, payroll, or project data.',
      });
    }

    const step1Prompt = `
Convert the following natural language query to SQL using the schema below.

Schema:
${prismaSchema}

NLQ: "${cleanNLQ}"

Rules:
- Always return only one SQL query.
- If the NLQ mentions multiple tables, use JOINs to merge them into a single query.
- Do not return multiple queries under any condition.
- Do not use CTEs or WITH clauses — keep it flat and single-statement.
- Do not explain anything. Only give the SQL.
- Prefer SELECT queries. Avoid DELETE return delete can't be used.
- Keep it minimal, no verbose formatting or comments.

Return only the raw SQL query. No formatting, no comments.

    `;

    const step1Response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [
        { role: 'system', content: 'You are a strict SQL generator. Only respond with SQL, no explanations.' },
        { role: 'user', content: step1Prompt },
      ],
    });

    const rawSQL = step1Response.choices[0]?.message?.content?.trim();

    const step2Prompt = `
You are an RBAC enforcer. Validate if the following SQL is allowed for a user with role: ${role}.

Accessible Tables and Columns:
${Object.entries(tableAccess)
    .map(([table, roles]) => {
      const restricted = columnRestrictions[table]?.join(', ') || 'None';
      return `- ${table}: Roles=[${roles.join(', ')}], RestrictedColumns=[${restricted}]`;
    })
    .join('\n')}

Rules:
- User role: ${role}
- Do NOT allow access to 'SSN' column under any case.
- If access is denied, respond with: ACCESS DENIED: <reason>.
- If access is allowed, only return the same sql query without any modifications.


SQL:
${rawSQL}
    `;

    const step2Response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [
        { role: 'system', content: 'You validate SQL queries based on RBAC.' },
        { role: 'user', content: step2Prompt },
      ],
    });

    const rbacDecision = step2Response.choices[0]?.message?.content?.trim();

    await prisma.adminLog.create({
      data: {
        userId: req.user.userId,
        userName: req.user.name,
        userRole: role,
        prompt: nlq,
        step0Result: 'YES',
        step1SQL: rawSQL,
        step2Decision: rbacDecision,
      },
    });

    if (rbacDecision.startsWith('ACCESS DENIED')) {
      return res.status(403).json({ error: rbacDecision });
    }

    return res.status(200).json({ result: rawSQL });
  } catch (err) {
    console.error('LLM error:', err);
    return res.status(500).json({ error: 'LLM processing failed', detail: err.message });
  }
};

export const executeQuery = async (req, res) => {
  const { query } = req.body;
  const role = req.user?.role;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing SQL query.' });
  }

  if (!role) {
    return res.status(401).json({ error: 'User role not provided or invalid.' });
  }

  if (query.startsWith('ACCESS DENIED')) {
    return res.status(403).json({ error: query });
  }

  const tablesInQuery = extractTables(query);
  for (const table of tablesInQuery) {
    const allowedRoles = tableAccess[table];
    if (!allowedRoles || !allowedRoles.includes(role)) {
      return res.status(403).json({
        error: `ACCESS DENIED: Role '${role}' not authorized to access '${table}'`,
      });
    }
  }

  if (/ssn/i.test(query)) {
    return res.status(403).json({ error: "ACCESS DENIED: 'SSN' column is restricted." });
  }

  try {
    const result = await prisma.$queryRawUnsafe(query);
    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('SQL Execution Error:', error);
    return res.status(500).json({ error: 'SQL execution failed.', detail: error.message });
  }
};
export const getAuditLogs = async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const logs = await prisma.adminLog.findMany({
      orderBy: { timestamp: 'desc' },
    });

    return res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};