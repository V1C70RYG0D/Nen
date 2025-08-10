const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

describe('Data Generator Integration Tests', () => {
    const OUTPUT_DIR = path.join(__dirname, '../../training_data');
    const DATA_GENERATORS_DIR = path.join(__dirname, '../../data-generators');

    beforeAll(async () => {
        // Ensure output directory exists
        try {
            await fs.mkdir(OUTPUT_DIR, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    });

    afterAll(async () => {
        // Cleanup test data files
        try {
            const files = await fs.readdir(OUTPUT_DIR);
            await Promise.all(
                files
                    .filter(file => file.startsWith('test_'))
                    .map(file => fs.unlink(path.join(OUTPUT_DIR, file)))
            );
        } catch (error) {
            // Files might not exist
        }
    });

    describe('Chess Data Generator Integration', () => {
        test('should generate chess positions and save to file', async () => {
            const pythonScript = path.join(DATA_GENERATORS_DIR, 'chess_data_generator.py');

            const result = await runPythonScript(pythonScript, [], {
                timeout: 30000
            });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toMatch(/Generated \d+ opening positions/);
            expect(result.stdout).toMatch(/Generated \d+ middlegame positions/);
            expect(result.stdout).toMatch(/Generated \d+ endgame positions/);
            expect(result.stdout).toMatch(/Generated \d+ tactical puzzles/);
        });

        test('should validate chess position formats', async () => {
            const testScript = `
import sys
import os
sys.path.append('${DATA_GENERATORS_DIR.replace(/\\/g, '/')}')
from chess_data_generator import ChessPositionGenerator
import chess

generator = ChessPositionGenerator()
positions = generator.generate_opening_positions(5)

# Validate each position
for i, position in enumerate(positions):
    assert isinstance(position, chess.Board), f"Position {i} is not a chess.Board"
    assert position.is_valid(), f"Position {i} is not valid"
    assert len(position.fen()) > 0, f"Position {i} has empty FEN"

print("All chess positions validated successfully")
            `;

            const result = await runPythonCode(testScript);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('All chess positions validated successfully');
        });
    });

    describe('Nen Data Generator Integration', () => {
        test('should generate personality-based data', async () => {
            const testScript = `
import sys
import os
sys.path.append('${DATA_GENERATORS_DIR.replace(/\\/g, '/')}')
from nen_data_generator import NenDataGenerator, PersonalityType

generator = NenDataGenerator()

# Test all personality types
personalities = [
    PersonalityType.GON_AGGRESSIVE,
    PersonalityType.KILLUA_TACTICAL,
    PersonalityType.KURAPIKA_STRATEGIC,
    PersonalityType.LEORIO_BALANCED,
    PersonalityType.HISOKA_UNPREDICTABLE
]

results = []
for personality in personalities:
    data = generator.generate_with_personality(personality)
    results.append({
        'name': data.test_name,
        'data_keys': list(data.data.keys())
    })
    print(f"Generated data for {personality.name}: {data.test_name}")

print(f"Successfully generated data for {len(results)} personalities")
            `;

            const result = await runPythonCode(testScript);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toMatch(/Successfully generated data for \d+ personalities/);
        });

        test('should validate data ranges and types', async () => {
            const testScript = `
import sys
import os
sys.path.append('${DATA_GENERATORS_DIR.replace(/\\/g, '/')}')
from nen_data_generator import NenDataGenerator, PersonalityType

generator = NenDataGenerator()

# Test Gon aggressive data
gon_data = generator.generate_with_personality(PersonalityType.GON_AGGRESSIVE)
assert 'aggression_level' in gon_data.data
assert 'creativity' in gon_data.data
assert 0.7 <= gon_data.data['aggression_level'] <= 1.0
assert 0.5 <= gon_data.data['creativity'] <= 0.8

# Test Killua tactical data
killua_data = generator.generate_with_personality(PersonalityType.KILLUA_TACTICAL)
assert 'patience' in killua_data.data
assert 'risk_tolerance' in killua_data.data
assert 0.8 <= killua_data.data['patience'] <= 1.0
assert 0.3 <= killua_data.data['risk_tolerance'] <= 0.6

# Test opening books
opening_books = generator.simulate_opening_books()
assert len(opening_books) == 2
for book in opening_books:
    assert 'sequence' in book
    assert 'effectiveness' in book
    assert 0.0 <= book['effectiveness'] <= 1.0

print("All data validation tests passed")
            `;

            const result = await runPythonCode(testScript);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('All data validation tests passed');
        });
    });

    describe('Data Persistence and Loading', () => {
        test('should save and load generated data', async () => {
            const testScript = `
import sys
import os
import json
sys.path.append('${DATA_GENERATORS_DIR.replace(/\\/g, '/')}')
from nen_data_generator import NenDataGenerator, PersonalityType

generator = NenDataGenerator()
output_file = r'${OUTPUT_DIR.replace(/\\/g, '/')}/test_generated_data.json'

# Generate data
data = generator.generate_with_personality(PersonalityType.GON_AGGRESSIVE)
opening_books = generator.simulate_opening_books()

# Save to file
output_data = {
    'personality_data': data.data,
    'test_name': data.test_name,
    'opening_books': opening_books
}

with open(output_file, 'w') as f:
    json.dump(output_data, f, indent=2)

print(f"Data saved to {output_file}")

# Verify file exists and can be loaded
with open(output_file, 'r') as f:
    loaded_data = json.load(f)

assert 'personality_data' in loaded_data
assert 'test_name' in loaded_data
assert 'opening_books' in loaded_data

print("Data persistence test passed")
            `;

            const result = await runPythonCode(testScript);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Data persistence test passed');

            // Verify the file was created
            const dataFile = path.join(OUTPUT_DIR, 'test_generated_data.json');
            const fileStats = await fs.stat(dataFile);
            expect(fileStats.isFile()).toBe(true);
            expect(fileStats.size).toBeGreaterThan(0);
        });
    });

    describe('Performance and Stress Tests', () => {
        test('should handle large data generation efficiently', async () => {
            const testScript = `
import sys
import os
import time
sys.path.append('${DATA_GENERATORS_DIR.replace(/\\/g, '/')}')
from chess_data_generator import ChessPositionGenerator

generator = ChessPositionGenerator()

# Performance test - generate 1000 positions
start_time = time.time()
positions = generator.generate_opening_positions(1000)
end_time = time.time()

duration = end_time - start_time
print(f"Generated 1000 positions in {duration:.2f} seconds")

# Validate the count
assert len(positions) == 1000

# Performance should be reasonable (under 5 seconds)
assert duration < 5.0, f"Generation took too long: {duration:.2f} seconds"

print("Performance test passed")
            `;

            const result = await runPythonCode(testScript);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Performance test passed');
        }, 10000); // 10 second timeout

        test('should handle concurrent data generation', async () => {
            const testScript = `
import sys
import os
import threading
import time
sys.path.append('${DATA_GENERATORS_DIR.replace(/\\/g, '/')}')
from nen_data_generator import NenDataGenerator, PersonalityType

def generate_personality_data(personality, results, index):
    generator = NenDataGenerator()
    data = generator.generate_with_personality(personality)
    results[index] = data

# Test concurrent generation
personalities = [
    PersonalityType.GON_AGGRESSIVE,
    PersonalityType.KILLUA_TACTICAL,
    PersonalityType.KURAPIKA_STRATEGIC
]

results = [None] * len(personalities)
threads = []

start_time = time.time()

for i, personality in enumerate(personalities):
    thread = threading.Thread(target=generate_personality_data, args=(personality, results, i))
    threads.append(thread)
    thread.start()

# Wait for all threads to complete
for thread in threads:
    thread.join()

end_time = time.time()

# Validate all results
for i, result in enumerate(results):
    assert result is not None, f"Result {i} is None"
    assert result.test_name is not None, f"Result {i} has no test name"

print(f"Concurrent generation completed in {end_time - start_time:.2f} seconds")
print("Concurrent generation test passed")
            `;

            const result = await runPythonCode(testScript);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Concurrent generation test passed');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle invalid inputs gracefully', async () => {
            const testScript = `
import sys
import os
sys.path.append('${DATA_GENERATORS_DIR.replace(/\\/g, '/')}')
from chess_data_generator import ChessPositionGenerator

generator = ChessPositionGenerator()

# Test edge cases
empty_positions = generator.generate_opening_positions(0)
assert len(empty_positions) == 0

single_position = generator.generate_opening_positions(1)
assert len(single_position) == 1

# Test with reasonable large numbers
large_positions = generator.generate_opening_positions(100)
assert len(large_positions) == 100

print("Edge case handling test passed")
            `;

            const result = await runPythonCode(testScript);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Edge case handling test passed');
        });
    });
});

// Helper functions
function runPythonScript(scriptPath, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        const timeout = options.timeout || 10000;

        const child = spawn('python', [scriptPath, ...args], {
            cwd: path.dirname(scriptPath)
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        const timeoutId = setTimeout(() => {
            child.kill();
            reject(new Error(`Script execution timed out after ${timeout}ms`));
        }, timeout);

        child.on('close', (code) => {
            clearTimeout(timeoutId);
            resolve({
                exitCode: code,
                stdout: stdout,
                stderr: stderr
            });
        });

        child.on('error', (error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
    });
}

function runPythonCode(code, options = {}) {
    return new Promise((resolve, reject) => {
        const timeout = options.timeout || 10000;

        const child = spawn('python', ['-c', code]);

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        const timeoutId = setTimeout(() => {
            child.kill();
            reject(new Error(`Code execution timed out after ${timeout}ms`));
        }, timeout);

        child.on('close', (code) => {
            clearTimeout(timeoutId);
            resolve({
                exitCode: code,
                stdout: stdout,
                stderr: stderr
            });
        });

        child.on('error', (error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
    });
}
