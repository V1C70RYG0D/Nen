import fs from 'fs';
import path from 'path';

export class ReportGenerator {
  static generate(reportData: any, reportName: string): void {
    const timestamp = new Date().toISOString();
    const reportPath = path.join(process.cwd(), 'reports', `${reportName}-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  }
}

export default ReportGenerator;
