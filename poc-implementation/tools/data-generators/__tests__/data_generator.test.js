import { execSync } from 'child_process';
import path from 'path';

// Helper function to execute Python scripts and return output
function runDataGenerator(scriptName) {
    try {
        const scriptPath = path.join(__dirname, `../${scriptName}`);
        return execSync(`python ${scriptPath}`, { encoding: 'utf-8' });
    } catch (error) {
        console.error(`Error executing ${scriptName}:`, error.message);
        return null;
    }
}

describe('Data Generators', () => {
    test('Chess Data Generator should produce valid outputs', () => {
        const result = runDataGenerator('chess_data_generator.py');
        expect(result).toContain('opening positions');
        expect(result).toContain('middlegame positions');
        expect(result).toContain('endgame positions');
        expect(result).toContain('tactical puzzles');
    });

    test('Nen Data Generator should produce valid outputs', () => {
        const result = runDataGenerator('nen_data_generator.py');
        expect(result).toContain('Test Data for Gon Aggressive Test');
        expect(result).toContain('Opening Books Simulation');
    });

    test('Annotated Game Generator should output 500 games', () => {
        const result = runDataGenerator('annotated_game_generator.py');
        expect(result).toContain('Generated 500 games');
    });
});

