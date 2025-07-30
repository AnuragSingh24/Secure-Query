// // src/middleware/roleAccess.js

// const tableAccess = {
//   EmployeeDetails: ['ADMIN', 'ANALYST'],
//   PayrollData: ['ADMIN'],
//   ProjectInfo: ['ADMIN', 'EMPLOYEE', 'ANALYST'],
// };

// const columnRestrictions = {
//   EmployeeDetails: ['SSN'], // Mask or block SSN for non-ADMIN roles
// };

// function maskSensitiveData(data, table, role) {
//   if (role !== 'ADMIN' && columnRestrictions[table]) {
//     for (let column of columnRestrictions[table]) {
//       if (Array.isArray(data)) {
//         data.forEach(row => {
//           if (row[column]) row[column] = '***MASKED***';
//         });
//       } else if (data[column]) {
//         data[column] = '***MASKED***';
//       }
//     }
//   }
//   return data;
// }

// function checkAccess(userRole, requestedTables, requestedColumns) {
//   for (let table of requestedTables) {
//     const allowedRoles = tableAccess[table] || [];
//     if (!allowedRoles.includes(userRole)) {
//       return { allowed: false, reason: `Access to ${table} denied for role ${userRole}.` };
//     }

//     if (columnRestrictions[table]) {
//       for (let column of requestedColumns[table] || []) {
//         if (columnRestrictions[table].includes(column) && userRole !== 'ADMIN') {
//           return { allowed: false, reason: `Access to column '${column}' in ${table} denied.` };
//         }
//       }
//     }
//   }

//   return { allowed: true };
// }

// // ✅ Use ES module exports
// export { checkAccess, maskSensitiveData };





import express from 'express';
import { client } from '../config/azureOpenAI.js';
import { PrismaClient } from '@prisma/client';
import { extractUserFromToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// 🔒 1. Strip prompt injection attempts
function sanitizeNLQ(nlq) {
  return nlq.replace(/user role\s*:\s*\w+/gi, '').trim();
}

// ⚡ 2. Lightweight domain keyword filter
function isLikelyRelevant(nlq) {
  const keywords = ['employee', 'payroll', 'project', 'salary', 'bonus', 'bench', 'department'];
  return keywords.some(word => nlq.toLowerCase().includes(word));
}

// ⚠️ 3. Optional: intent check using LLM
async function isQueryRelevant(nlq, schema) {
  const prompt = `
Schema:
${schema}

Is the following user query relevant to this schema?

Query: "${nlq}"

Answer ONLY with: YES or NO.
`;

  const res = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT,
    messages: [
      { role: 'system', content: 'You are a strict intent classifier. Reply only YES or NO.' },
      { role: 'user', content: prompt },
    ],
  });

  return res.choices[0]?.message?.content?.trim().toUpperCase() === 'YES';
}

// 🔐 4. RBAC-safe prompt generator
function getPrompt(nlq, role, schema) {
  return `
Your job is to convert natural language queries into SQL ONLY for the given role.

DO NOT include SSN or sensitive fields in the SQL. DO NOT add extra formatting like \\n or \\t.

User Role: ${role}

Schema:
${schema}

Query:
"${nlq}"

Reply with SQL only.
  `;
}

router.post('/query', extractUserFromToken, async (req, res) => {
  try {
    const rawNLQ = req.body.nlq;
    const cleanNLQ = sanitizeNLQ(rawNLQ);
    const role = req.user.role;

    // 🧠 1. Keyword sanity check
    if (!isLikelyRelevant(cleanNLQ)) {
      return res.status(400).json({ error: 'Unrelated question. Ask something about company data.' });
    }

    // 🧠 2. Optional LLM-level check (slower)
    const schema = process.env.PRISMA_SCHEMA_TEXT;
    const isRelevant = await isQueryRelevant(cleanNLQ, schema);
    if (!isRelevant) {
      return res.status(400).json({ error: 'Your question is not related to the company database.' });
    }

    // 🤖 3. Generate SQL using role-safe prompt
    const prompt = getPrompt(cleanNLQ, role, schema);

    const genResponse = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [
        { role: 'system', content: 'You are a SQL generator with strict RBAC policies.' },
        { role: 'user', content: prompt },
      ],
    });

    const sqlQuery = genResponse.choices[0]?.message?.content?.trim();

    // 🔒 Final RBAC Check before execution (optional, extra safe)
    if (/ssn/i.test(sqlQuery)) {
      return res.status(403).json({ error: 'Access to SSN or sensitive data is not allowed.' });
    }

    // 🧾 Run SQL using Prisma (or raw query)
    const result = await prisma.$queryRawUnsafe(`${sqlQuery}`);
    return res.json({ data: result });

  } catch (err) {
    console.error('Error handling NLQ:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
