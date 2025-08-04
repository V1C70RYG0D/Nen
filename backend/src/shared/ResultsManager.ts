import fs from 'fs';
import path from 'path';

export class ResultsManager {
  private resultDir: string;

  constructor(resultDir = path.join(process.cwd(), 'results')) {
    this.resultDir = resultDir;
    if (!fs.existsSync(this.resultDir)) {
      fs.mkdirSync(this.resultDir);
    }
  }

  saveResult(testName: string, data: any): void {
    const resultPath = path.join(this.resultDir, `${testName}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(data, null, 2));
  }

  getResult(testName: string): any {
    const resultPath = path.join(this.resultDir, `${testName}.json`);
    return JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
  }
}

export default ResultsManager;
