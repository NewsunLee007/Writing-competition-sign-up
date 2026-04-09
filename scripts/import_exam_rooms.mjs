import { neon } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_imHYjN9PK3DB@ep-green-bird-a1q6l046-pooler.ap-southeast-1.aws.neon.tech:5432/writing_contest?sslmode=require';

if (!databaseUrl) {
  console.error('Missing DATABASE_URL environment variable.');
  process.exit(1);
}

const sql = neon(databaseUrl);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelPath = path.join(__dirname, '../学生考场安排.xlsx');

async function run() {
  try {
    console.log('Adding exam_room column if not exists...');
    await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS exam_room VARCHAR(20)`;
    
    console.log(`Reading Excel file: ${excelPath}`);
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Loaded ${data.length} records from Excel.`);

    let successCount = 0;
    let notFoundCount = 0;

    for (const record of data) {
      const ticketNumber = String(record['准考证号']);
      const examRoom = String(record['考场']);
      const studentName = String(record['学生姓名']);

      const result = await sql`
        UPDATE registrations
        SET exam_room = ${examRoom}
        WHERE ticket_number = ${ticketNumber} AND student_name = ${studentName}
        RETURNING id
      `;

      if (result.length > 0) {
        successCount++;
      } else {
        notFoundCount++;
        console.warn(`Record not found for ticket: ${ticketNumber}, student: ${studentName}`);
      }
    }

    console.log(`Update complete. Success: ${successCount}, Not Found: ${notFoundCount}`);
  } catch (error) {
    console.error('Error updating exam rooms:', error);
  }
}

run();
