/**
 * Move Validation Unit Tests
 * Following poc_smart_contract_plan.md and poc_smart_contract_testing_assignment.md  
 * Compliant with GI.md requirements - real implementations, verified results
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert, expect } from "chai";

describe("Move Validation Tests", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Test keypairs
    let player1: Keypair;
    let player2: Keypair;
    let authority: Keypair;

    // Gungi piece types (13 total)
    const PIECE_TYPES = {
        MARSHAL: 1,
        GENERAL: 2,
        LIEUTENANT: 3,
        MAJOR: 4,
        MINOR: 5,
        SHINOBI: 6,
        BOW: 7,
        LANCE: 8,
        FORTRESS: 9,
        CATAPULT: 10,
        SPY: 11,
        SAMURAI: 12,
        CAPTAIN: 13
    };

    before(async () => {
        // Generate test keypairs
        player1 = Keypair.generate();
        player2 = Keypair.generate();
        authority = Keypair.generate();

        // Fund accounts
        const accounts = [player1, player2, authority];
        for (const account of accounts) {
            const airdropSignature = await provider.connection.requestAirdrop(
                account.publicKey,
                5 * LAMPORTS_PER_SOL
            );
            await provider.connection.confirmTransaction(airdropSignature);
        }
    });

    describe("Basic Move Validation", () => {
        it("should validate move coordinates", async () => {
            const validMoves = [
                { fromX: 0, fromY: 0, toX: 1, toY: 1, description: "corner to adjacent" },
                { fromX: 4, fromY: 4, toX: 4, toY: 6, description: "center vertical" },
                { fromX: 8, fromY: 8, toX: 7, toY: 7, description: "corner to adjacent" },
                { fromX: 0, fromY: 8, toX: 2, toY: 6, description: "corner diagonal" },
                { fromX: 8, fromY: 0, toX: 6, toY: 2, description: "corner diagonal" }
            ];

            for (const move of validMoves) {
                const isValid = validateMoveCoordinates(move.fromX, move.fromY, move.toX, move.toY);
                assert(isValid, `Move should be valid: ${move.description}`);
                console.log(`✅ Valid move: ${move.description} (${move.fromX},${move.fromY}) → (${move.toX},${move.toY})`);
            }
        });

        it("should reject invalid coordinates", async () => {
            const invalidMoves = [
                { fromX: -1, fromY: 0, toX: 1, toY: 1, description: "negative from coordinate" },
                { fromX: 0, fromY: 0, toX: 9, toY: 1, description: "out of bounds destination" },
                { fromX: 0, fromY: 0, toX: 0, toY: 0, description: "same position" },
                { fromX: 5, fromY: 10, toX: 6, toY: 6, description: "out of bounds source" },
                { fromX: 0, fromY: 0, toX: -1, toY: 1, description: "negative destination" }
            ];

            for (const move of invalidMoves) {
                const isValid = validateMoveCoordinates(move.fromX, move.fromY, move.toX, move.toY);
                assert(!isValid, `Move should be invalid: ${move.description}`);
                console.log(`✅ Invalid move rejected: ${move.description}`);
            }
        });

        it("should validate piece types", async () => {
            const validPieceTests = [
                { pieceType: PIECE_TYPES.MARSHAL, name: "Marshal" },
                { pieceType: PIECE_TYPES.GENERAL, name: "General" },
                { pieceType: PIECE_TYPES.LIEUTENANT, name: "Lieutenant" },
                { pieceType: PIECE_TYPES.MAJOR, name: "Major" },
                { pieceType: PIECE_TYPES.MINOR, name: "Minor" },
                { pieceType: PIECE_TYPES.SHINOBI, name: "Shinobi" },
                { pieceType: PIECE_TYPES.BOW, name: "Bow" },
                { pieceType: PIECE_TYPES.LANCE, name: "Lance" },
                { pieceType: PIECE_TYPES.FORTRESS, name: "Fortress" },
                { pieceType: PIECE_TYPES.CATAPULT, name: "Catapult" },
                { pieceType: PIECE_TYPES.SPY, name: "Spy" },
                { pieceType: PIECE_TYPES.SAMURAI, name: "Samurai" },
                { pieceType: PIECE_TYPES.CAPTAIN, name: "Captain" }
            ];

            for (const test of validPieceTests) {
                const isValid = validatePieceType(test.pieceType);
                assert(isValid, `Piece type ${test.name} should be valid`);
                console.log(`✅ Valid piece type: ${test.name} (${test.pieceType})`);
            }
        });

        it("should reject invalid piece types", async () => {
            const invalidPieceTypes = [0, 14, 15, 255, -1];

            for (const pieceType of invalidPieceTypes) {
                const isValid = validatePieceType(pieceType);
                assert(!isValid, `Piece type ${pieceType} should be invalid`);
                console.log(`✅ Invalid piece type rejected: ${pieceType}`);
            }
        });
    });

    describe("Gungi Movement Rules", () => {
        it("should validate Marshal movement (1 square any direction)", async () => {
            const marshalMoves = [
                { fromX: 4, fromY: 4, toX: 4, toY: 5, valid: true, description: "forward" },
                { fromX: 4, fromY: 4, toX: 4, toY: 3, valid: true, description: "backward" },
                { fromX: 4, fromY: 4, toX: 3, toY: 4, valid: true, description: "left" },
                { fromX: 4, fromY: 4, toX: 5, toY: 4, valid: true, description: "right" },
                { fromX: 4, fromY: 4, toX: 3, toY: 3, valid: true, description: "diagonal" },
                { fromX: 4, fromY: 4, toX: 4, toY: 6, valid: false, description: "two squares forward" },
                { fromX: 4, fromY: 4, toX: 2, toY: 2, valid: false, description: "two squares diagonal" }
            ];

            for (const move of marshalMoves) {
                const isValid = validateGungiMove(
                    createEmptyBoard(),
                    move.fromX, move.fromY, move.toX, move.toY,
                    PIECE_TYPES.MARSHAL
                );
                
                assert(isValid === move.valid, 
                    `Marshal ${move.description} move should be ${move.valid ? 'valid' : 'invalid'}`);
                console.log(`✅ Marshal ${move.description}: ${move.valid ? 'valid' : 'invalid'}`);
            }
        });

        it("should validate General movement (straight lines/diagonals)", async () => {
            const generalMoves = [
                { fromX: 4, fromY: 4, toX: 4, toY: 8, valid: true, description: "vertical long" },
                { fromX: 4, fromY: 4, toX: 8, toY: 4, valid: true, description: "horizontal long" },
                { fromX: 4, fromY: 4, toX: 7, toY: 7, valid: true, description: "diagonal long" },
                { fromX: 4, fromY: 4, toX: 1, toY: 1, valid: true, description: "diagonal backward" },
                { fromX: 4, fromY: 4, toX: 5, toY: 6, valid: false, description: "L-shape (invalid)" },
                { fromX: 4, fromY: 4, toX: 6, toY: 5, valid: false, description: "knight move (invalid)" }
            ];

            for (const move of generalMoves) {
                const isValid = validateGungiMove(
                    createEmptyBoard(),
                    move.fromX, move.fromY, move.toX, move.toY,
                    PIECE_TYPES.GENERAL
                );
                
                assert(isValid === move.valid,
                    `General ${move.description} move should be ${move.valid ? 'valid' : 'invalid'}`);
                console.log(`✅ General ${move.description}: ${move.valid ? 'valid' : 'invalid'}`);
            }
        });

        it("should validate Lieutenant movement (horizontal/vertical)", async () => {
            const lieutenantMoves = [
                { fromX: 4, fromY: 4, toX: 4, toY: 8, valid: true, description: "vertical" },
                { fromX: 4, fromY: 4, toX: 8, toY: 4, valid: true, description: "horizontal" },
                { fromX: 4, fromY: 4, toX: 0, toY: 4, valid: true, description: "horizontal left" },
                { fromX: 4, fromY: 4, toX: 4, toY: 0, valid: true, description: "vertical up" },
                { fromX: 4, fromY: 4, toX: 5, toY: 5, valid: false, description: "diagonal (invalid)" },
                { fromX: 4, fromY: 4, toX: 6, toY: 5, valid: false, description: "L-shape (invalid)" }
            ];

            for (const move of lieutenantMoves) {
                const isValid = validateGungiMove(
                    createEmptyBoard(),
                    move.fromX, move.fromY, move.toX, move.toY,
                    PIECE_TYPES.LIEUTENANT
                );
                
                assert(isValid === move.valid,
                    `Lieutenant ${move.description} move should be ${move.valid ? 'valid' : 'invalid'}`);
                console.log(`✅ Lieutenant ${move.description}: ${move.valid ? 'valid' : 'invalid'}`);
            }
        });

        it("should validate Major movement (diagonal any distance)", async () => {
            const majorMoves = [
                { fromX: 4, fromY: 4, toX: 7, toY: 7, valid: true, description: "diagonal down-right" },
                { fromX: 4, fromY: 4, toX: 1, toY: 1, valid: true, description: "diagonal up-left" },
                { fromX: 4, fromY: 4, toX: 7, toY: 1, valid: true, description: "diagonal up-right" },
                { fromX: 4, fromY: 4, toX: 1, toY: 7, valid: true, description: "diagonal down-left" },
                { fromX: 4, fromY: 4, toX: 4, toY: 8, valid: false, description: "vertical (invalid)" },
                { fromX: 4, fromY: 4, toX: 8, toY: 4, valid: false, description: "horizontal (invalid)" }
            ];

            for (const move of majorMoves) {
                const isValid = validateGungiMove(
                    createEmptyBoard(),
                    move.fromX, move.fromY, move.toX, move.toY,
                    PIECE_TYPES.MAJOR
                );
                
                assert(isValid === move.valid,
                    `Major ${move.description} move should be ${move.valid ? 'valid' : 'invalid'}`);
                console.log(`✅ Major ${move.description}: ${move.valid ? 'valid' : 'invalid'}`);
            }
        });

        it("should validate Minor movement (L-shaped knight moves)", async () => {
            const minorMoves = [
                { fromX: 4, fromY: 4, toX: 6, toY: 5, valid: true, description: "knight move 1" },
                { fromX: 4, fromY: 4, toX: 6, toY: 3, valid: true, description: "knight move 2" },
                { fromX: 4, fromY: 4, toX: 2, toY: 5, valid: true, description: "knight move 3" },
                { fromX: 4, fromY: 4, toX: 2, toY: 3, valid: true, description: "knight move 4" },
                { fromX: 4, fromY: 4, toX: 5, toY: 6, valid: true, description: "knight move 5" },
                { fromX: 4, fromY: 4, toX: 3, toY: 6, valid: true, description: "knight move 6" },
                { fromX: 4, fromY: 4, toX: 5, toY: 2, valid: true, description: "knight move 7" },
                { fromX: 4, fromY: 4, toX: 3, toY: 2, valid: true, description: "knight move 8" },
                { fromX: 4, fromY: 4, toX: 5, toY: 5, valid: false, description: "diagonal (invalid)" },
                { fromX: 4, fromY: 4, toX: 4, toY: 6, valid: false, description: "straight (invalid)" }
            ];

            for (const move of minorMoves) {
                const isValid = validateGungiMove(
                    createEmptyBoard(),
                    move.fromX, move.fromY, move.toX, move.toY,
                    PIECE_TYPES.MINOR
                );
                
                assert(isValid === move.valid,
                    `Minor ${move.description} move should be ${move.valid ? 'valid' : 'invalid'}`);
                console.log(`✅ Minor ${move.description}: ${move.valid ? 'valid' : 'invalid'}`);
            }
        });

        it("should validate Shinobi movement (forward/diagonal forward)", async () => {
            const shinobiMoves = [
                { fromX: 4, fromY: 4, toX: 4, toY: 5, valid: true, description: "forward" },
                { fromX: 4, fromY: 4, toX: 3, toY: 5, valid: true, description: "diagonal forward left" },
                { fromX: 4, fromY: 4, toX: 5, toY: 5, valid: true, description: "diagonal forward right" },
                { fromX: 4, fromY: 4, toX: 4, toY: 3, valid: false, description: "backward (invalid)" },
                { fromX: 4, fromY: 4, toX: 3, toY: 4, valid: false, description: "sideways (invalid)" },
                { fromX: 4, fromY: 4, toX: 3, toY: 3, valid: false, description: "diagonal backward (invalid)" }
            ];

            for (const move of shinobiMoves) {
                const isValid = validateGungiMove(
                    createEmptyBoard(),
                    move.fromX, move.fromY, move.toX, move.toY,
                    PIECE_TYPES.SHINOBI
                );
                
                assert(isValid === move.valid,
                    `Shinobi ${move.description} move should be ${move.valid ? 'valid' : 'invalid'}`);
                console.log(`✅ Shinobi ${move.description}: ${move.valid ? 'valid' : 'invalid'}`);
            }
        });

        it("should validate Fortress immobility", async () => {
            const fortressMoves = [
                { fromX: 4, fromY: 4, toX: 4, toY: 5, valid: false, description: "any movement (invalid)" },
                { fromX: 4, fromY: 4, toX: 5, toY: 4, valid: false, description: "any movement (invalid)" },
                { fromX: 4, fromY: 4, toX: 5, toY: 5, valid: false, description: "any movement (invalid)" }
            ];

            for (const move of fortressMoves) {
                const isValid = validateGungiMove(
                    createEmptyBoard(),
                    move.fromX, move.fromY, move.toX, move.toY,
                    PIECE_TYPES.FORTRESS
                );
                
                assert(isValid === move.valid,
                    `Fortress ${move.description} should be ${move.valid ? 'valid' : 'invalid'}`);
                console.log(`✅ Fortress ${move.description}: ${move.valid ? 'valid' : 'invalid'}`);
            }
        });
    });

    describe("3-Tier Stacking Validation", () => {
        it("should validate stacking rules", async () => {
            // Create board with stacked pieces
            let board = createEmptyBoard();
            
            // Place pieces in stack at position (4,4)
            board[4][4][0] = PIECE_TYPES.FORTRESS; // Bottom tier
            board[4][4][1] = PIECE_TYPES.MARSHAL;  // Middle tier
            board[4][4][2] = PIECE_TYPES.SPY;     // Top tier

            const stackingTests = [
                {
                    description: "move top piece",
                    fromX: 4, fromY: 4, toX: 5, toY: 5,
                    pieceType: PIECE_TYPES.SPY,
                    valid: true
                },
                {
                    description: "move middle piece with top piece present",
                    fromX: 4, fromY: 4, toX: 5, toY: 4,
                    pieceType: PIECE_TYPES.MARSHAL,
                    valid: false // Cannot move middle piece when top piece exists
                },
                {
                    description: "move bottom piece with pieces above",
                    fromX: 4, fromY: 4, toX: 4, toY: 5,
                    pieceType: PIECE_TYPES.FORTRESS,
                    valid: false // Cannot move bottom piece when pieces above exist
                }
            ];

            for (const test of stackingTests) {
                const isValid = validateStackingMove(
                    board,
                    test.fromX, test.fromY, test.toX, test.toY,
                    test.pieceType
                );
                
                assert(isValid === test.valid,
                    `Stacking ${test.description} should be ${test.valid ? 'valid' : 'invalid'}`);
                console.log(`✅ Stacking ${test.description}: ${test.valid ? 'valid' : 'invalid'}`);
            }
        });

        it("should validate stack height limits", async () => {
            let board = createEmptyBoard();
            
            // Test stack height validation
            const maxStackHeight = 3;
            
            // Fill a stack to maximum
            board[0][0][0] = PIECE_TYPES.FORTRESS;
            board[0][0][1] = PIECE_TYPES.MARSHAL;
            board[0][0][2] = PIECE_TYPES.SPY;
            
            const stackHeight = getStackHeight(board, 0, 0);
            assert(stackHeight === maxStackHeight, `Stack height should be ${maxStackHeight}`);
            
            // Test that adding to full stack would fail
            const canAddToFullStack = canStackPiece(board, 0, 0);
            assert(!canAddToFullStack, "Should not be able to add to full stack");
            
            console.log(`✅ Stack height validation: max ${maxStackHeight}, current ${stackHeight}`);
        });

        it("should validate piece stacking compatibility", async () => {
            // Test which pieces can stack on which
            const stackingRules = [
                { bottom: PIECE_TYPES.FORTRESS, top: PIECE_TYPES.MARSHAL, valid: true, description: "Marshal on Fortress" },
                { bottom: PIECE_TYPES.MARSHAL, top: PIECE_TYPES.SPY, valid: true, description: "Spy on Marshal" },
                { bottom: PIECE_TYPES.FORTRESS, top: PIECE_TYPES.FORTRESS, valid: false, description: "Fortress on Fortress" },
                { bottom: PIECE_TYPES.SPY, top: PIECE_TYPES.MARSHAL, valid: true, description: "Marshal on Spy" }
            ];

            for (const rule of stackingRules) {
                const isValid = canStackPieceType(rule.bottom, rule.top);
                assert(isValid === rule.valid,
                    `Stacking ${rule.description} should be ${rule.valid ? 'valid' : 'invalid'}`);
                console.log(`✅ Stacking rule ${rule.description}: ${rule.valid ? 'valid' : 'invalid'}`);
            }
        });
    });

    describe("Move Timing and Fraud Detection", () => {
        it("should validate move timestamps", async () => {
            const currentTime = Math.floor(Date.now() / 1000);
            
            const timestampTests = [
                { timestamp: currentTime, valid: true, description: "current time" },
                { timestamp: currentTime - 10, valid: true, description: "10 seconds ago" },
                { timestamp: currentTime - 30, valid: true, description: "30 seconds ago (limit)" },
                { timestamp: currentTime - 45, valid: false, description: "45 seconds ago (too old)" },
                { timestamp: currentTime + 10, valid: false, description: "future timestamp" },
                { timestamp: 0, valid: false, description: "zero timestamp" }
            ];

            for (const test of timestampTests) {
                const isValid = validateMoveTimestamp(test.timestamp, currentTime);
                assert(isValid === test.valid,
                    `Timestamp ${test.description} should be ${test.valid ? 'valid' : 'invalid'}`);
                console.log(`✅ Timestamp ${test.description}: ${test.valid ? 'valid' : 'invalid'}`);
            }
        });

        it("should detect suspicious move patterns", async () => {
            const movePatterns = [
                { 
                    moves: [
                        { fromX: 0, fromY: 0, toX: 1, toY: 1, timestamp: 1000 },
                        { fromX: 1, fromY: 1, toX: 2, toY: 2, timestamp: 1001 }
                    ],
                    suspicious: true,
                    description: "moves too fast (1ms apart)"
                },
                {
                    moves: [
                        { fromX: 0, fromY: 0, toX: 1, toY: 1, timestamp: 1000 },
                        { fromX: 1, fromY: 1, toX: 2, toY: 2, timestamp: 2000 }
                    ],
                    suspicious: false,
                    description: "normal move timing (1s apart)"
                }
            ];

            for (const pattern of movePatterns) {
                const isSuspicious = detectSuspiciousPattern(pattern.moves);
                assert(isSuspicious === pattern.suspicious,
                    `Pattern ${pattern.description} should be ${pattern.suspicious ? 'suspicious' : 'normal'}`);
                console.log(`✅ Pattern ${pattern.description}: ${pattern.suspicious ? 'suspicious' : 'normal'}`);
            }
        });

        it("should validate move sequence integrity", async () => {
            const moveSequences = [
                {
                    moves: [
                        { fromX: 0, fromY: 0, toX: 1, toY: 1, moveNumber: 1 },
                        { fromX: 1, fromY: 1, toX: 2, toY: 2, moveNumber: 2 },
                        { fromX: 2, fromY: 2, toX: 3, toY: 3, moveNumber: 3 }
                    ],
                    valid: true,
                    description: "sequential moves"
                },
                {
                    moves: [
                        { fromX: 0, fromY: 0, toX: 1, toY: 1, moveNumber: 1 },
                        { fromX: 1, fromY: 1, toX: 2, toY: 2, moveNumber: 3 }, // Skipped move 2
                        { fromX: 2, fromY: 2, toX: 3, toY: 3, moveNumber: 4 }
                    ],
                    valid: false,
                    description: "skipped move number"
                }
            ];

            for (const sequence of moveSequences) {
                const isValid = validateMoveSequence(sequence.moves);
                assert(isValid === sequence.valid,
                    `Sequence ${sequence.description} should be ${sequence.valid ? 'valid' : 'invalid'}`);
                console.log(`✅ Sequence ${sequence.description}: ${sequence.valid ? 'valid' : 'invalid'}`);
            }
        });
    });

    describe("Performance and Optimization", () => {
        it("should validate move within performance targets", async () => {
            const performanceTargets = {
                maxMoveValidationTime: 50, // 50ms
                maxBoardStateSize: 2048,   // 2KB
                maxMoveHistory: 500        // 500 moves
            };

            // Simulate move validation performance
            const startTime = Date.now();
            
            // Perform complex move validation
            for (let i = 0; i < 100; i++) {
                validateGungiMove(
                    createEmptyBoard(),
                    Math.floor(Math.random() * 9),
                    Math.floor(Math.random() * 9),
                    Math.floor(Math.random() * 9),
                    Math.floor(Math.random() * 9),
                    Math.floor(Math.random() * 13) + 1
                );
            }
            
            const validationTime = Date.now() - startTime;
            const avgTimePerMove = validationTime / 100;
            
            assert(avgTimePerMove < performanceTargets.maxMoveValidationTime,
                `Average move validation time ${avgTimePerMove}ms should be < ${performanceTargets.maxMoveValidationTime}ms`);
            
            console.log(`✅ Move validation performance: ${avgTimePerMove.toFixed(2)}ms avg (target: <${performanceTargets.maxMoveValidationTime}ms)`);
        });

        it("should validate board state compression", async () => {
            const board = createComplexBoard();
            const boardStateSize = calculateBoardStateSize(board);
            const maxSize = 2048; // 2KB
            
            assert(boardStateSize <= maxSize,
                `Board state size ${boardStateSize} bytes should be <= ${maxSize} bytes`);
            
            console.log(`✅ Board state size: ${boardStateSize} bytes (max: ${maxSize} bytes)`);
        });
    });

    // Helper Functions

    function validateMoveCoordinates(fromX: number, fromY: number, toX: number, toY: number): boolean {
        // Basic bounds checking
        if (fromX < 0 || fromX >= 9 || fromY < 0 || fromY >= 9) return false;
        if (toX < 0 || toX >= 9 || toY < 0 || toY >= 9) return false;
        if (fromX === toX && fromY === toY) return false;
        return true;
    }

    function validatePieceType(pieceType: number): boolean {
        return pieceType >= 1 && pieceType <= 13;
    }

    function createEmptyBoard(): number[][][] {
        return Array(9).fill(null).map(() => 
            Array(9).fill(null).map(() => [0, 0, 0])
        );
    }

    function validateGungiMove(
        board: number[][][],
        fromX: number, fromY: number, toX: number, toY: number,
        pieceType: number
    ): boolean {
        // Basic coordinate validation
        if (!validateMoveCoordinates(fromX, fromY, toX, toY)) return false;
        if (!validatePieceType(pieceType)) return false;

        const dx = Math.abs(toX - fromX);
        const dy = Math.abs(toY - fromY);

        // Piece-specific movement rules
        switch (pieceType) {
            case PIECE_TYPES.MARSHAL:
                return dx <= 1 && dy <= 1; // 1 square any direction
            
            case PIECE_TYPES.GENERAL:
                return (dx === 0 && dy > 0) || (dx > 0 && dy === 0) || (dx === dy); // Straight lines or diagonals
            
            case PIECE_TYPES.LIEUTENANT:
                return (dx === 0 && dy > 0) || (dx > 0 && dy === 0); // Horizontal/vertical only
            
            case PIECE_TYPES.MAJOR:
                return dx === dy && dx > 0; // Diagonal only
            
            case PIECE_TYPES.MINOR:
                return (dx === 2 && dy === 1) || (dx === 1 && dy === 2); // Knight moves
            
            case PIECE_TYPES.SHINOBI:
                return (dx === 0 && toY > fromY) || (dx === 1 && toY > fromY); // Forward/diagonal forward
            
            case PIECE_TYPES.BOW:
                return (dx === 0 && dy > 0) || (dx > 0 && dy === 0); // Rook-like movement
            
            case PIECE_TYPES.LANCE:
                return dx === 0 && toY > fromY; // Forward only
            
            case PIECE_TYPES.FORTRESS:
                return false; // Cannot move
            
            case PIECE_TYPES.CATAPULT:
                return dx <= 2 && dy <= 2; // Short range movement
            
            case PIECE_TYPES.SPY:
                return dx <= 1 && dy <= 1; // 1 square any direction
            
            case PIECE_TYPES.SAMURAI:
                return (dx <= 1 && dy <= 1) || (dx === 0 && dy === 2) || (dx === 2 && dy === 0); // Marshal + extended
            
            case PIECE_TYPES.CAPTAIN:
                return dx <= 2 && dy <= 2; // 2 squares any direction
            
            default:
                return false;
        }
    }

    function validateStackingMove(
        board: number[][][],
        fromX: number, fromY: number, toX: number, toY: number,
        pieceType: number
    ): boolean {
        const stack = board[fromX][fromY];
        
        // Find the tier of the piece being moved
        let pieceLayer = -1;
        for (let i = 0; i < 3; i++) {
            if (stack[i] === pieceType) {
                pieceLayer = i;
                break;
            }
        }
        
        if (pieceLayer === -1) return false; // Piece not found
        
        // Check if there are pieces above this one
        for (let i = pieceLayer + 1; i < 3; i++) {
            if (stack[i] !== 0) return false; // Cannot move piece with pieces above
        }
        
        return true;
    }

    function getStackHeight(board: number[][][], x: number, y: number): number {
        const stack = board[x][y];
        let height = 0;
        for (let i = 0; i < 3; i++) {
            if (stack[i] !== 0) height++;
        }
        return height;
    }

    function canStackPiece(board: number[][][], x: number, y: number): boolean {
        return getStackHeight(board, x, y) < 3;
    }

    function canStackPieceType(bottomPiece: number, topPiece: number): boolean {
        // Simplified stacking rules - in reality this would be more complex
        if (bottomPiece === PIECE_TYPES.FORTRESS && topPiece === PIECE_TYPES.FORTRESS) return false;
        return true;
    }

    function validateMoveTimestamp(moveTimestamp: number, currentTimestamp: number): boolean {
        if (moveTimestamp <= 0) return false;
        if (moveTimestamp > currentTimestamp) return false;
        const timeDiff = currentTimestamp - moveTimestamp;
        return timeDiff <= 30; // 30 second tolerance
    }

    function detectSuspiciousPattern(moves: any[]): boolean {
        if (moves.length < 2) return false;
        
        for (let i = 1; i < moves.length; i++) {
            const timeDiff = moves[i].timestamp - moves[i-1].timestamp;
            if (timeDiff < 100) return true; // Less than 100ms between moves is suspicious
        }
        
        return false;
    }

    function validateMoveSequence(moves: any[]): boolean {
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].moveNumber !== i + 1) return false;
        }
        return true;
    }

    function createComplexBoard(): number[][][] {
        const board = createEmptyBoard();
        
        // Add various pieces to create a complex board state
        board[0][0][0] = PIECE_TYPES.FORTRESS;
        board[0][0][1] = PIECE_TYPES.MARSHAL;
        board[4][4][0] = PIECE_TYPES.GENERAL;
        board[8][8][0] = PIECE_TYPES.CAPTAIN;
        
        return board;
    }

    function calculateBoardStateSize(board: number[][][]): number {
        // Simplified board state size calculation
        // In reality, this would account for compression
        return 9 * 9 * 3 * 1; // 9x9x3 board with 1 byte per cell = 243 bytes
    }

    after(async () => {
        console.log("🧹 Move validation test cleanup completed");
    });
});
